# Demo Audio Files

Place a short noisy audio sample here for the offline pipeline demonstration.

## noisy-sample.mp3 (recommended)

- Duration: 5–10 seconds
- Content: ambulance siren + indistinct shouted speech (e.g., "Patient down! No pulse!")
- Purpose: the `AudioPipelineVisualizer` on `/test-agent` can ingest this via a file-upload path to show the noise gate / compressor / normalisation working even when the user has no mic or Retell API key

## How to generate

1. Record yourself speaking loudly with an ambulance-siren video playing in the background on speakers.
2. Export as MP3 (mono, 16 kHz).
3. Rename to `noisy-sample.mp3` and place in this folder.
4. The test-agent page can then offer a "Play Sample" button that routes this clip through the Web Audio API pipeline for visual demonstration.

## Note

The live demo (`Start Voice Call`) uses the actual microphone + Retell Web SDK — this sample is only for offline visual proof of the preprocessing chain.
