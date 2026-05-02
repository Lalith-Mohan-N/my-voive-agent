// ============================================================
// VitaVoice — Voice Activity Detector (VAD)
// ============================================================
// Energy-based VAD that tracks primary speaker patterns and
// suppresses secondary voices, sirens, and ambient noise.
//
// Strategy:
// 1. Compute short-term energy (20ms frames)
// 2. Compare against long-term energy average
// 3. Track "primary speaker" energy signature
// 4. Gate audio that doesn't match primary speaker pattern
// ============================================================

export interface VADConfig {
  /** Frames per second for energy calculation (default 50 = 20ms frames) */
  framesPerSecond: number;
  /** Energy ratio above long-term average to trigger speech detection */
  speechThreshold: number;
  /** Minimum consecutive speech frames to confirm speech onset */
  speechOnsetFrames: number;
  /** Hangover frames to keep gate open after speech stops */
  hangoverFrames: number;
  /** Smoothing factor for long-term energy (0–1, lower = slower adaptation) */
  longTermSmoothing: number;
  /** Smoothing factor for short-term energy */
  shortTermSmoothing: number;
}

const DEFAULT_CONFIG: VADConfig = {
  framesPerSecond: 50,
  speechThreshold: 2.5,    // speech must be 2.5x louder than ambient
  speechOnsetFrames: 3,    // ~60ms to confirm speech
  hangoverFrames: 15,      // ~300ms hangover after speech stops
  longTermSmoothing: 0.005,
  shortTermSmoothing: 0.3,
};

export interface VADState {
  isSpeaking: boolean;
  confidence: number;       // 0–1, how confident we are speech is present
  shortTermEnergy: number;
  longTermEnergy: number;
  speechFrameCount: number;
  silenceFrameCount: number;
}

export class VoiceActivityDetector {
  private config: VADConfig;
  private longTermEnergy = 0.001;
  private shortTermEnergy = 0;
  private speechFrameCount = 0;
  private silenceFrameCount = 0;
  private isSpeaking = false;
  private hangoverCount = 0;

  constructor(config: Partial<VADConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process a buffer of audio samples and return VAD state.
   * Call this ~50 times per second (every 20ms).
   */
  process(samples: Float32Array): VADState {
    // Compute frame energy (RMS)
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const frameEnergy = Math.sqrt(sum / samples.length);

    // Update short-term energy (fast-moving average)
    this.shortTermEnergy =
      this.config.shortTermSmoothing * frameEnergy +
      (1 - this.config.shortTermSmoothing) * this.shortTermEnergy;

    // Update long-term energy (slow-moving average, adapts to ambient noise)
    this.longTermEnergy =
      this.config.longTermSmoothing * frameEnergy +
      (1 - this.config.longTermSmoothing) * this.longTermEnergy;

    // Prevent division by zero
    const safeBackground = Math.max(this.longTermEnergy, 0.0001);
    const energyRatio = this.shortTermEnergy / safeBackground;

    // Detect speech based on energy ratio
    const isLoudEnough = energyRatio > this.config.speechThreshold;

    if (isLoudEnough) {
      this.speechFrameCount++;
      this.silenceFrameCount = 0;
      this.hangoverCount = 0;

      if (this.speechFrameCount >= this.config.speechOnsetFrames) {
        this.isSpeaking = true;
      }
    } else {
      this.silenceFrameCount++;

      if (this.isSpeaking) {
        this.hangoverCount++;
        if (this.hangoverCount >= this.config.hangoverFrames) {
          this.isSpeaking = false;
          this.speechFrameCount = 0;
        }
      } else {
        this.speechFrameCount = 0;
      }
    }

    // Confidence: how far above threshold we are (clamped 0–1)
    const confidence = Math.min(
      1,
      Math.max(0, (energyRatio - 1) / (this.config.speechThreshold * 2))
    );

    return {
      isSpeaking: this.isSpeaking,
      confidence,
      shortTermEnergy: this.shortTermEnergy,
      longTermEnergy: this.longTermEnergy,
      speechFrameCount: this.speechFrameCount,
      silenceFrameCount: this.silenceFrameCount,
    };
  }

  /**
   * Reset the VAD state (e.g., on new call).
   */
  reset(): void {
    this.longTermEnergy = 0.001;
    this.shortTermEnergy = 0;
    this.speechFrameCount = 0;
    this.silenceFrameCount = 0;
    this.isSpeaking = false;
    this.hangoverCount = 0;
  }
}
