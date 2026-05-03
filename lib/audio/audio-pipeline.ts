// ============================================================
// VitaVoice — Browser Audio Preprocessing Pipeline v2
// ============================================================
// Enhanced pipeline with bandpass filter for speech isolation,
// aggressive noise gating, voice activity detection, and
// dynamics compression for ambulance/field environments.
//
// Chain:
//   MediaStreamSource -> AnalyserNode (raw)
//                     -> BandpassFilter (300Hz-3400Hz)
//                     -> NoiseGateNode -> VoiceActivityDetector
//                     -> DynamicsCompressorNode
//                     -> GainNode (normalisation)
//                     -> AnalyserNode (processed)
//                     -> Destination/MediaStream
//
// The processed stream is what Retell receives.
// ============================================================

import { VoiceActivityDetector, type VADState } from './vad-detector';

export interface AudioPipelineState {
  ctx: AudioContext;
  source: MediaStreamAudioSourceNode;
  rawAnalyser: AnalyserNode;
  processedAnalyser: AnalyserNode;
  compressor: DynamicsCompressorNode;
  gainNode: GainNode;
  noiseGate: GainNode; // simplified noise gate using gain
  bandpassFilter: BiquadFilterNode;
  highpassFilter: BiquadFilterNode;
  destination: MediaStreamAudioDestinationNode;
  vad: VoiceActivityDetector;
  isRunning: boolean;
}

export interface AudioMetrics {
  rawRms: number;
  rawPeak: number;
  processedRms: number;
  processedPeak: number;
  gainReductionDb: number;
  noiseGateOpen: boolean;
  vadSpeaking: boolean;
  vadConfidence: number;
}

let pipelineState: AudioPipelineState | null = null;

/**
 * Initialise the enhanced audio pipeline from a user MediaStream.
 * Returns the processed MediaStream that should be passed to Retell.
 */
export async function initAudioPipeline(
  stream: MediaStream,
  onMetrics?: (m: AudioMetrics) => void
): Promise<MediaStream> {
  if (pipelineState) {
    await closeAudioPipeline();
  }

  const ctx = new AudioContext({ sampleRate: 16000 });
  const source = ctx.createMediaStreamSource(stream);

  // --- Raw analyser (before any processing) ---
  const rawAnalyser = ctx.createAnalyser();
  rawAnalyser.fftSize = 2048;
  rawAnalyser.smoothingTimeConstant = 0.8;
  source.connect(rawAnalyser);

  // --- High-pass filter (remove rumble below 200Hz: engines, road noise) ---
  const highpassFilter = ctx.createBiquadFilter();
  highpassFilter.type = 'highpass';
  highpassFilter.frequency.value = 200;
  highpassFilter.Q.value = 0.7;
  source.connect(highpassFilter);

  // --- Bandpass filter (isolate speech: 300Hz–3400Hz) ---
  // This is the ITU-T standard telephone bandwidth — perfect for voice
  const bandpassFilter = ctx.createBiquadFilter();
  bandpassFilter.type = 'bandpass';
  bandpassFilter.frequency.value = 1700; // center frequency
  bandpassFilter.Q.value = 0.5;         // wide Q for natural speech
  highpassFilter.connect(bandpassFilter);

  // --- Noise Gate (aggressive threshold for field environments) ---
  const noiseGate = ctx.createGain();
  noiseGate.gain.value = 1.0;
  bandpassFilter.connect(noiseGate);

  // --- Dynamics Compressor (tuned for EMS environments) ---
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -20;  // more aggressive threshold
  compressor.knee.value = 4;          // sharper knee for faster response
  compressor.ratio.value = 16;        // higher ratio for more compression
  compressor.attack.value = 0.001;    // ultra-fast attack (1ms)
  compressor.release.value = 0.08;    // fast release for natural speech
  noiseGate.connect(compressor);

  // --- Normalisation Gain ---
  const gainNode = ctx.createGain();
  gainNode.gain.value = 1.4; // boost after compression to maintain volume
  compressor.connect(gainNode);

  // --- Processed analyser ---
  const processedAnalyser = ctx.createAnalyser();
  processedAnalyser.fftSize = 2048;
  processedAnalyser.smoothingTimeConstant = 0.8;
  gainNode.connect(processedAnalyser);

  // --- Destination (output stream for Retell) ---
  const destination = ctx.createMediaStreamDestination();
  processedAnalyser.connect(destination);

  // --- Voice Activity Detector ---
  const vad = new VoiceActivityDetector({
    speechThreshold: 2.0,    // tuned for noisy environments
    hangoverFrames: 20,       // 400ms hangover for speech pauses
    speechOnsetFrames: 2,     // 40ms onset for fast detection
  });

  const state: AudioPipelineState = {
    ctx,
    source,
    rawAnalyser,
    processedAnalyser,
    compressor,
    gainNode,
    noiseGate,
    bandpassFilter,
    highpassFilter,
    destination,
    vad,
    isRunning: true,
  };

  pipelineState = state;

  // --- Noise-gate + VAD + metrics loop ---
  startMetricsLoop(state, onMetrics);

  return destination.stream;
}

/**
 * Close and clean up the audio pipeline.
 */
export async function closeAudioPipeline(): Promise<void> {
  if (!pipelineState) return;
  pipelineState.isRunning = false;
  pipelineState.vad.reset();
  try {
    await pipelineState.ctx.close();
  } catch {
    // ignore
  }
  pipelineState = null;
}

/**
 * Return the currently active pipeline state (or null).
 */
export function getPipelineState(): AudioPipelineState | null {
  return pipelineState;
}

/**
 * Continuously compute RMS/peak/gain-reduction, drive the noise gate,
 * and run voice activity detection.
 */
function startMetricsLoop(
  state: AudioPipelineState,
  onMetrics?: (m: AudioMetrics) => void
): void {
  const rawData = new Float32Array(state.rawAnalyser.fftSize);
  const procData = new Float32Array(state.processedAnalyser.fftSize);

  // Aggressive noise gate threshold for field environments (lowered for testing)
  const noiseGateThreshold = 0.005;  // ~-46 dB (was 0.04)

  const tick = () => {
    if (!state.isRunning) return;

    state.rawAnalyser.getFloatTimeDomainData(rawData);
    state.processedAnalyser.getFloatTimeDomainData(procData);

    const rawRms = computeRms(rawData);
    const rawPeak = computePeak(rawData);
    const processedRms = computeRms(procData);
    const processedPeak = computePeak(procData);

    // Run VAD on raw audio
    const vadState: VADState = state.vad.process(rawData);

    // Noise gate: only open when VAD confirms speech AND signal is above threshold
    const signalAboveThreshold = rawRms > noiseGateThreshold;
    const open = signalAboveThreshold && vadState.isSpeaking;

    // Smooth gate transitions (fast open, slow close for natural speech)
    const targetGain = open ? 1.0 : 0.005;  // nearly mute when closed
    const currentGain = state.noiseGate.gain.value;
    const smoothingFactor = open ? 0.5 : 0.15; // fast open, gradual close
    state.noiseGate.gain.value = currentGain + (targetGain - currentGain) * smoothingFactor;

    // Estimate gain-reduction from compressor (simplified)
    const gainReductionDb = Math.max(0, -state.compressor.reduction);

    onMetrics?.({
      rawRms,
      rawPeak,
      processedRms,
      processedPeak,
      gainReductionDb,
      noiseGateOpen: open,
      vadSpeaking: vadState.isSpeaking,
      vadConfidence: vadState.confidence,
    });

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function computeRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

function computePeak(buffer: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    peak = Math.max(peak, Math.abs(buffer[i]));
  }
  return peak;
}
