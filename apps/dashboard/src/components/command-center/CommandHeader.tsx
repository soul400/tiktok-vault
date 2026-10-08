'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, Radio, Tv, ShieldCheck, Wifi, WifiOff, RefreshCw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';
import { getSocket } from '../../lib/socket';

interface CommandHeaderProps {
  onSwitchStreamer?: (username: string) => void;
}

export function CommandHeader({ onSwitchStreamer }: CommandHeaderProps) {
  const selectedStreamer = useStreamStore((s) => s.selectedStreamer);
  const streamers = useStreamStore((s) => s.streamers);
  const health = useStreamStore((s) => s.health);
  const metrics = useStreamStore((s) => s.metrics);

  const [inputUsername, setInputUsername] = useState('');
  const [sessionTimer, setSessionTimer] = useState('00:00:00');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Session duration timer based on actual session startedAtUtc
  useEffect(() => {
    const startedAt = selectedStreamer?.liveSession?.startedAtUtc;
    if (!startedAt) {
      setSessionTimer('00:00:00');
      return;
    }

    const startTs = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startTs) / 1000));
      const h = Math.floor(diffSec / 3600).toString().padStart(2, '0');
      const m = Math.floor((diffSec % 3600) / 60).toString().padStart(2, '0');
      const s = (diffSec % 60).toString().padStart(2, '0');
      setSessionTimer(`${h}:${m}:${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedStreamer?.liveSession?.startedAtUtc]);

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = inputUsername.trim().replace(/^@/, '');
    if (!target) return;

    setIsConnecting(true);
    try {
      if (onSwitchStreamer) {
        onSwitchStreamer(target);
      } else {
        const socket = getSocket();
        socket.emit('streamer:select', target);
      }
      setInputUsername('');
    } catch (err) {
      console.error('Failed to connect to streamer:', err);
    } finally {
      setTimeout(() => setIsConnecting(false), 1200);
    }
  };

  const isConnected = health.status === 'CONNECTED' || health.status === 'HEALTHY' || selectedStreamer?.status === 'LIVE';
  const isConnectingState = health.status === 'CONNECTING' || isConnecting;

  return (
    <header className="w-full bg-[#070A12] border-b border-white/[0.08] px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 select-none">
      {/* 1. Brand & Command Center Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-cyan-400/30">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-wider text-white font-mono">AEP</span>
              <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-cyan-400 border border-cyan-500/30 uppercase">
                LIVE COMMAND CENTER
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
              <span>مركز قيادة العمليات اللحظية واستخبارات المعارك</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="text-slate-500 font-mono">v2.4</span>
            </div>
          </div>
        </div>

        {/* Active Streamer Pill */}
        {(() => {
          const streamer = selectedStreamer || {
            username: 'mohra.2000',
            displayName: 'المهرة',
            status: 'OFFLINE' as const,
            profileImage: undefined as string | undefined,
          };
          const isLive = streamer.status === 'LIVE';
          return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#101625] border border-white/[0.08]">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden ring-1 ring-white/20">
                  {streamer.profileImage ? (
                    <img src={streamer.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {streamer.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#070A12] ${
                    isLive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
              </div>
              <div className="text-right min-w-0">
                <div className="flex items-center gap-1.5">
                  <span dir="ltr" className="text-xs font-bold text-slate-200 font-mono leading-none">
                    @{streamer.username}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-sans ${
                      isLive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                    }`}
                  >
                    {isLive ? 'مباشر' : 'غير متصل'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                  {streamer.displayName || 'البث المباشر'}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 2. Streamer Connection Input */}
      <form onSubmit={handleConnect} className="flex items-center gap-2 max-w-sm w-full sm:w-auto">
        <div className="relative flex-1 sm:w-56">
          <input
            type="text"
            dir="ltr"
            placeholder="@streamer_user"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-mono bg-[#101625] text-slate-100 placeholder-slate-500 rounded-lg border border-white/[0.08] focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isConnectingState || !inputUsername.trim()}
          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white transition-all shadow-sm shadow-blue-600/30 flex items-center gap-1.5 whitespace-nowrap"
        >
          {isConnectingState ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>جاري الربط...</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>اتصال</span>
            </>
          )}
        </button>
      </form>

      {/* 3. Realtime Telemetry Status & Controls */}
      <div className="flex items-center gap-3">
        {/* Real Status Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#101625] border border-white/[0.08]">
          <span className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50' : 'bg-rose-500'
          }`} />
          <span className="text-[11px] font-bold font-mono text-slate-200">
            {isConnected ? 'CONNECTED' : isConnectingState ? 'CONNECTING' : 'OFFLINE'}
          </span>
        </div>

        {/* Latency */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101625] border border-white/[0.08] text-[11px] font-mono">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span dir="ltr" className="text-slate-300 font-bold tabular-nums">
            {health.latencyMs || 0}ms
          </span>
        </div>

        {/* Events per second */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101625] border border-white/[0.08] text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span dir="ltr" className="text-slate-300 font-bold tabular-nums">
            {health.eventsPerSec || 0} ev/s
          </span>
        </div>

        {/* Session Duration */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101625] border border-white/[0.08] text-[11px] font-mono">
          <span className="text-slate-400 text-[10px]">الجلسة:</span>
          <span dir="ltr" className="text-amber-400 font-black tabular-nums">
            {sessionTimer}
          </span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'كتم التنبيهات الصوتية' : 'تفعيل التنبيهات الصوتية'}
          className={`p-1.5 rounded-lg border transition-all ${
            soundEnabled
              ? 'bg-[#101625] border-white/[0.08] text-slate-300 hover:text-white'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Broadcast Mode CTA */}
        <Link
          href="/broadcast"
          target="_blank"
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#131B2E] hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Tv className="w-3.5 h-3.5 text-cyan-400" />
          <span>شاشة البث (HUD)</span>
        </Link>
      </div>
    </header>
  );
}
