'use client';

import { StatusDot } from '@/components/ui/StatusDot';
import { APP_CONFIG } from '@/lib/constants';
import { useEffect, useState } from 'react';

export function DashboardHeader() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header id="dashboard-header" className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0a0b14]/80 backdrop-blur-xl sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#00ff88] to-[#00cc6a] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#0a0b14]">
              <path d="M12 4C7 4 3 7 3 12s4 8 9 8 9-4 9-8-4-8-9-8z" stroke="currentColor" strokeWidth="2" />
              <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#00ff88] animate-heartbeat" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            {APP_CONFIG.name}
          </h1>
          <p className="text-[10px] text-white/40 font-medium tracking-widest uppercase">
            {APP_CONFIG.tagline}
          </p>
        </div>
      </div>

      {/* Status & Time */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <StatusDot status="active" size="sm" />
          <span className="text-xs text-white/60 font-medium">System Online</span>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-[#00ff88] tabular-nums">{time}</div>
          <div className="text-[10px] text-white/30 font-medium">IST</div>
        </div>
      </div>
    </header>
  );
}
