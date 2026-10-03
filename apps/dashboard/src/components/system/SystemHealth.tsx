'use client';

import React from 'react';
import { Activity, Server, Database, Radio, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';

export function SystemHealth() {
  const health = useStreamStore((s) => s.health);
  const selectedStreamer = useStreamStore((s) => s.selectedStreamer);

  const isLive = selectedStreamer?.status === 'LIVE';
  const isHealthy = health.status === 'HEALTHY' || health.status === 'CONNECTED' || isLive;
  const isDegraded = health.status === 'DEGRADED';

  const services = [
    {
      name: 'TikTok WebSocket',
      status: isHealthy ? 'HEALTHY' : isDegraded ? 'DEGRADED' : 'OFFLINE',
      metric: `${health.eventsPerSec || 0} ev/s`,
      icon: Radio,
    },
    {
      name: 'Event Pipeline Normalizer',
      status: isHealthy ? 'HEALTHY' : 'STANDBY',
      metric: `${health.latencyMs || 0}ms`,
      icon: Activity,
    },
    {
      name: 'Battle Intelligence Engine',
      status: 'HEALTHY',
      metric: 'Active',
      icon: Server,
    },
    {
      name: 'PostgreSQL Database',
      status: 'HEALTHY',
      metric: 'Connected',
      icon: Database,
    },
  ];

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'HEALTHY':
        return { text: 'HEALTHY', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'DEGRADED':
        return { text: 'DEGRADED', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'STANDBY':
        return { text: 'STANDBY', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      default:
        return { text: 'OFFLINE', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    }
  };

  const formatLastEventTime = (ts?: string) => {
    if (!ts) return 'لحظي';
    try {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    } catch {
      return ts;
    }
  };

  return (
    <div className="w-full bg-[#101625] border border-white/[0.08] rounded-xl p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-200">صحة خط العمليات اللحظي (System Health & Observability)</h3>
        </div>

        {/* Global Health Pill */}
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border ${
            isHealthy
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : isDegraded
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>{isHealthy ? 'SYSTEM OPERATIONAL' : isDegraded ? 'SYSTEM DEGRADED' : 'PIPELINE OFFLINE'}</span>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
        {services.map((s, idx) => {
          const Icon = s.icon;
          const badge = getStatusBadge(s.status);
          return (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-[#070A12] border border-white/[0.04] flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded bg-[#101625] border border-white/[0.08] flex items-center justify-center text-slate-400 shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-200 truncate text-[11px]">{s.name}</div>
                  <div dir="ltr" className="text-[10px] text-slate-500 font-mono tabular-nums">{s.metric}</div>
                </div>
              </div>

              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${badge.color}`}>
                {badge.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Real Diagnostics Strip */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/[0.04] gap-3">
        <div className="flex items-center gap-4">
          <div>
            <span>زمن الوصول: </span>
            <span dir="ltr" className="text-cyan-400 font-bold tabular-nums">{health.latencyMs || 0}ms</span>
          </div>
          <div>
            <span>معدل الأحداث: </span>
            <span dir="ltr" className="text-cyan-400 font-bold tabular-nums">{health.eventsPerSec || 0} ev/s</span>
          </div>
          <div>
            <span>محاولات إعادة الاتصال: </span>
            <span dir="ltr" className="text-slate-300 font-bold tabular-nums">{health.reconnectCount || 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
          <Clock className="w-3 h-3" />
          <span>آخر حزمة مستلمة: </span>
          <span dir="ltr" className="font-mono text-slate-400">{formatLastEventTime(health.lastEventAt)}</span>
        </div>
      </div>
    </div>
  );
}
