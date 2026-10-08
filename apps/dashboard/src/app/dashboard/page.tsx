'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStreamStore } from '../../store/useStreamStore';
import { getSocket } from '../../lib/socket';

// Layout Components
import { CommandHeader } from '../../components/command-center/CommandHeader';

// Specialized Battle Arena Hero & PK Battle Intelligence
import { BattleArena } from '../../components/battle/BattleArena';

// Specialized Battle Tools Inventory & Command Center Component
import { VaultToolsManager } from '../../components/inventory/VaultToolsManager';

// Optional compact System Observability
import { SystemHealth } from '../../components/system/SystemHealth';
import { Shield, Activity, ChevronDown, ChevronUp, Swords, LayoutGrid } from 'lucide-react';

export default function DashboardPage() {
  const selectedStreamer = useStreamStore((s) => s.selectedStreamer);
  const streamerIdRef = useRef<string | null>(null);
  const [showSystemHealth, setShowSystemHealth] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'BATTLE' | 'VAULT'>('ALL');

  // Initial Load & Polling for Tracked Streamers
  useEffect(() => {
    const loadStreamers = async () => {
      try {
        const res = await fetch('/api/streamers');
        const data = await res.json();
        if (data.success && data.data) {
          useStreamStore.getState().setStreamers(data.data);

          const currentSelected = useStreamStore.getState().selectedStreamer;
          if (currentSelected) {
            const fresh = data.data.find((s: any) => s.id === currentSelected.id);
            if (
              fresh &&
              (fresh.status !== currentSelected.status ||
                fresh.liveSession?.id !== currentSelected.liveSession?.id)
            ) {
              useStreamStore.setState({
                selectedStreamer: { ...currentSelected, ...fresh },
              });
            }
          } else if (data.data.length > 0) {
            const active = data.data.find((s: any) => s.status === 'LIVE') || data.data[0];
            useStreamStore.getState().setSelectedStreamer(active);
          }
        }
      } catch (err) {
        console.error('Failed to load streamers in Command Center:', err);
      }
    };

    loadStreamers();
    const interval = setInterval(loadStreamers, 5000);
    return () => clearInterval(interval);
  }, []);

  // Manage room join/leave when selectedStreamer changes
  useEffect(() => {
    const socket = getSocket();
    const prevId = streamerIdRef.current;
    const newId = selectedStreamer?.id || null;

    if (prevId && prevId !== newId) {
      socket.emit('leave:stream', prevId);
    }
    if (newId && newId !== prevId) {
      socket.emit('join:stream', newId);
    }

    streamerIdRef.current = newId;
  }, [selectedStreamer?.id]);

  // Real-time Socket.IO listeners (Authoritative Realtime Pipeline)
  useEffect(() => {
    const socket = getSocket();

    const onLiveEvent = (event: any) => {
      useStreamStore.getState().addEvent(event);
    };

    const onLiveLike = (data: any) => {
      useStreamStore.getState().updateMetrics({ likes: data.totalLikes });
    };

    const onLiveViewer = (data: any) => {
      useStreamStore.getState().updateMetrics({ viewers: data.viewerCount });
    };

    const onPowerupAcquired = (data: any) => {
      useStreamStore.getState().addEvent({
        id: `pw_acq_${Date.now()}`,
        eventType: 'POWERUP_ACQUIRED' as any,
        user: data.user,
        payload: data.payload,
        timestampUtc: data.timestamp || new Date().toISOString(),
      } as any);
    };

    const onPowerupUsed = (data: any) => {
      useStreamStore.getState().addEvent({
        id: `pw_use_${Date.now()}`,
        eventType: 'POWERUP_USED' as any,
        user: data.user,
        payload: data.payload,
        timestampUtc: data.timestamp || new Date().toISOString(),
      } as any);
    };

    const onPowerupAlert = (alert: any) => {
      useStreamStore.getState().addAlert({
        id: `${Date.now()}_${Math.random()}`,
        ...alert,
      });
    };

    const onTelemetry = (telemetry: any) => {
      useStreamStore.getState().setHealth(telemetry);
    };

    const onReconnect = () => {
      const currentStreamer = useStreamStore.getState().selectedStreamer;
      if (currentStreamer) {
        socket.emit('join:stream', currentStreamer.id);
      }
    };

    socket.on('live:event', onLiveEvent);
    socket.on('live:like', onLiveLike);
    socket.on('live:viewer', onLiveViewer);
    socket.on('powerup:acquired', onPowerupAcquired);
    socket.on('powerup:used', onPowerupUsed);
    socket.on('alerts:powerup', onPowerupAlert);
    socket.on('telemetry:health', onTelemetry);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('live:event', onLiveEvent);
      socket.off('live:like', onLiveLike);
      socket.off('live:viewer', onLiveViewer);
      socket.off('powerup:acquired', onPowerupAcquired);
      socket.off('powerup:used', onPowerupUsed);
      socket.off('alerts:powerup', onPowerupAlert);
      socket.off('telemetry:health', onTelemetry);
      socket.off('connect', onReconnect);
    };
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 1. Global Command Header */}
      <CommandHeader
        onSwitchStreamer={(username) => {
          const fresh = useStreamStore.getState().streamers.find((s) => s.username === username);
          if (fresh) useStreamStore.getState().setSelectedStreamer(fresh);
        }}
      />

      {/* Main Operational Viewport: Dedicated Battle Intelligence & Tools Center */}
      <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 space-y-6 max-w-[1920px] mx-auto w-full">
        {/* Sub-Header Banner & Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08] bg-[#0c1220]/60 p-4 rounded-2xl border border-white/[0.06] backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-400 border border-cyan-400/40 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20 ring-2 ring-white/10">
              <Swords className="w-5 h-5 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-black text-white tracking-tight">
                  مركز استخبارات معارك PK وخزينة الأدوات
                </h1>
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/70 px-2.5 py-0.5 rounded-full border border-cyan-500/40 shadow-sm">
                  LIVE WORKSTATION 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع فوري ومؤتمت لجولات PK (1v1 / 2v2) وسكور الفرق والمنافسين مع رصد استراتيجي لخزينة ومخزون الأدوات
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Navigation Tabs */}
            <div className="flex items-center bg-[#070b14] p-1.5 rounded-2xl border border-white/[0.1] text-xs font-bold shadow-2xl gap-1">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'ALL'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-white/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>عرض شامل (الميدان + الخزينة)</span>
              </button>

              <button
                onClick={() => setActiveTab('BATTLE')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'BATTLE'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-white/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Swords className="w-3.5 h-3.5 text-cyan-400" />
                <span>ميدان المعارك والسكور ⚔️</span>
              </button>

              <button
                onClick={() => setActiveTab('VAULT')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'VAULT'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-white/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>خزينة ومخزون الأدوات 🛡️</span>
              </button>
            </div>

            {/* Quick System Telemetry Toggle */}
            <button
              onClick={() => setShowSystemHealth(!showSystemHealth)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#070b14] border border-white/[0.08] text-xs font-mono text-slate-400 hover:text-slate-100 transition-all shadow-md hover:border-cyan-500/40"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>صحة الاتصال</span>
              {showSystemHealth ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible System Health Observability Bar */}
        {showSystemHealth && (
          <div className="transition-all duration-300">
            <SystemHealth />
          </div>
        )}

        {/* 1. PK Battle Arena Section */}
        {(activeTab === 'ALL' || activeTab === 'BATTLE') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <h2 className="text-sm font-black text-slate-200 font-mono">
                  LIVE & HISTORICAL PK BATTLE ARENA
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                سكور الفريقين • المنافسون • الداعمون • 1v1 / 2v2
              </span>
            </div>
            <BattleArena />
          </div>
        )}

        {/* 2. Core Vault Command Center Workstation */}
        {(activeTab === 'ALL' || activeTab === 'VAULT') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <h2 className="text-sm font-black text-slate-200 font-mono">
                  BATTLE TOOLS VAULT & INVENTORY
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                أرصدة القفازات والضباب • سجل الحركات • رصيد الداعمين
              </span>
            </div>
            <VaultToolsManager />
          </div>
        )}
      </main>
    </div>
  );
}
