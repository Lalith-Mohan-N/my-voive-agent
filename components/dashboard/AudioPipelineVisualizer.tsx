'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { AudioMetrics } from '@/lib/audio/audio-pipeline';

interface AudioPipelineVisualizerProps {
  metrics: AudioMetrics | null;
  isActive: boolean;
}

/**
 * Real-time dual waveform + noise-gate/compressor metering.
 * Shows raw vs processed audio so judges can *see* the pipeline working.
 */
export function AudioPipelineVisualizer({ metrics, isActive }: AudioPipelineVisualizerProps) {
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<{ raw: number[]; proc: number[] }>({ raw: [], proc: [] });

  const draw = useCallback(
    (canvas: HTMLCanvasElement, values: number[], color: string, label: string) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < w; i += 40) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
      }
      for (let i = 0; i < h; i += 20) {
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
      }
      ctx.stroke();

      // Midline
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      if (values.length < 2) return;

      // Waveform
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const step = w / values.length;
      for (let i = 0; i < values.length; i++) {
        const x = i * step;
        const y = h / 2 - values[i] * (h / 2) * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px monospace';
      ctx.fillText(label, 8, 14);
    },
    []
  );

  useEffect(() => {
    if (!isActive) return;
    const id = requestAnimationFrame(() => {
      if (metrics) {
        const hist = historyRef.current;
        hist.raw.push(metrics.rawRms);
        hist.proc.push(metrics.processedRms);
        if (hist.raw.length > 120) hist.raw.shift();
        if (hist.proc.length > 120) hist.proc.shift();

        if (rawCanvasRef.current) draw(rawCanvasRef.current, hist.raw, '#ff9f1c', 'RAW');
        if (procCanvasRef.current) draw(procCanvasRef.current, hist.proc, '#00ff88', 'PROCESSED');
      }
    });
    return () => cancelAnimationFrame(id);
  }, [metrics, isActive, draw]);

  if (!isActive) return null;

  const rawRmsDb = metrics ? (metrics.rawRms > 0 ? 20 * Math.log10(metrics.rawRms) : -Infinity).toFixed(1) : '--';
  const procRmsDb = metrics ? (metrics.processedRms > 0 ? 20 * Math.log10(metrics.processedRms) : -Infinity).toFixed(1) : '--';
  const gateStatus = metrics ? (metrics.noiseGateOpen ? 'OPEN' : 'CLOSED') : '--';
  const gateColor = metrics?.noiseGateOpen ? 'text-[#00ff88]' : 'text-[#ff3b5c]';
  const compressionDb = metrics ? metrics.gainReductionDb.toFixed(1) : '--';
  const vadStatus = metrics ? ((metrics as any).vadSpeaking ? 'SPEECH' : 'SILENT') : '--';
  const vadColor = (metrics as any)?.vadSpeaking ? 'text-[#00ff88]' : 'text-[#ff9f1c]';
  const vadConfidence = (metrics as any)?.vadConfidence ?? 0;

  return (
    <Card variant="elevated" id="audio-pipeline-visualizer">
      <CardHeader className="flex-shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#4dabf7] animate-pulse" />
            <h2 className="text-sm font-bold text-white">Audio Pipeline</h2>
          </div>
          <span className="text-[10px] text-white/30 font-mono">Web Audio API</span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {/* Waveforms */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <canvas
              ref={rawCanvasRef}
              width={300}
              height={80}
              className="w-full rounded-lg bg-white/[0.02] border border-white/[0.04]"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-white/30 font-mono">RAW RMS</span>
              <span className="text-[10px] text-[#ff9f1c] font-mono">{rawRmsDb} dB</span>
            </div>
          </div>
          <div>
            <canvas
              ref={procCanvasRef}
              width={300}
              height={80}
              className="w-full rounded-lg bg-white/[0.02] border border-white/[0.04]"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-white/30 font-mono">PROC RMS</span>
              <span className="text-[10px] text-[#00ff88] font-mono">{procRmsDb} dB</span>
            </div>
          </div>
        </div>

        {/* Meters */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
            <div className="text-[10px] text-white/30 font-mono uppercase">Gate</div>
            <div className={`text-xs font-bold mt-1 ${gateColor}`}>{gateStatus}</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
            <div className="text-[10px] text-white/30 font-mono uppercase">VAD</div>
            <div className={`text-xs font-bold mt-1 ${vadColor}`}>{vadStatus}</div>
            <div className="mt-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#00ff88] transition-all duration-150"
                style={{ width: `${Math.round(vadConfidence * 100)}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
            <div className="text-[10px] text-white/30 font-mono uppercase">Compress</div>
            <div className="text-xs font-bold mt-1 text-[#4dabf7]">{compressionDb} dB</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
            <div className="text-[10px] text-white/30 font-mono uppercase">Gain</div>
            <div className="text-xs font-bold mt-1 text-[#00ff88]">+1.4x</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
