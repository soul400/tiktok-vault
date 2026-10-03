'use client';

import React, { useEffect, useState } from 'react';
import { useStreamStore } from '../store/useStreamStore';
import { formatRiyadhTime } from '@aep/shared';
import { Activity, Shield, Wifi, Zap, Clock } from 'lucide-react';

export function Header() {
  const { selectedStreamer, health, metrics } = useStreamStore();
  const [riyadhTime, setRiyadhTime] = useState('');

  useEffect(() => {
    const updateTime = () => setRiyadhTime(formatRiyadhTime(new Date()));
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"><span className="w-2 h-2 rounded-full bg-red-500" /> LIVE</span>;
      case 'CONNECTING':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30"><span className="w-2 h-2 rounded-full bg-amber-500 animate-spin" /> جاري الاتصال...</span>;
      case 'DEGRADED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">⚠ استقرار منخفض</span>;
      case 'ERROR':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">× خطأ بالاتصال</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700"><span className="w-2 h-2 rounded-full bg-slate-500" /> OFFLINE</span>;
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0c1322] px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Platform Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white flex items-center gap-2">
              AEP TikTok LIVE Intelligence
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PRO-PK v2.5
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">مركز الرقابة اللحظية واستخبارات المعارك والأدوات</p>
          </div>
        </div>

        {selectedStreamer && (
          <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block" />
        )}

        {selectedStreamer && (
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-200">@{selectedStreamer.username}</span>
            {getStatusBadge(selectedStreamer.status)}
          </div>
        )}
      </div>

      {/* Metrics & Telemetry Header */}
      <div className="flex items-center gap-5">
        {/* Riyadh Time */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400 text-[11px]">مكة المكرمة:</span>
          <span className="font-bold text-white">{riyadhTime}</span>
        </div>

        {/* Telemetry Indicator */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>{health.eventsPerSec || 0} حدث/ث</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="text-slate-400">
            زمن الاستجابة: <span className="text-slate-200">{health.latencyMs || 15}ms</span>
          </div>
          {health.reconnectCount > 0 && (
            <>
              <span className="text-slate-700">|</span>
              <div className="text-amber-400">إعادة اتصال: {health.reconnectCount}</div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
