'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStreamStore } from '../../store/useStreamStore';
import { getSocket } from '../../lib/socket';

// Layout Components
import { CommandHeader } from '../../components/command-center/CommandHeader';

// Specialized Battle Tools Inventory & Command Center Component
import { VaultToolsManager } from '../../components/inventory/VaultToolsManager';

// Optional compact System Observability
import { SystemHealth } from '../../components/system/SystemHealth';
import { Shield, Activity, ChevronDown, ChevronUp } from 'lucide-react';

export default function DashboardPage() {
  const selectedStreamer = useStreamStore((s) => s.selectedStreamer);
  const streamerIdRef = useRef<string | null>(null);
  const [showSystemHealth, setShowSystemHealth] = useState(false);

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

      {/* Main Operational Viewport: Dedicated Battle Tools Vault Command Center */}
      <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-5 space-y-6 max-w-[1920px] mx-auto w-full">
        {/* Sub-Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-100 flex items-center gap-2">
                <span>مركز عمليات خزينة أدوات المعركة</span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20 font-normal">
                  VAULT COMMAND CENTER
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                رصد فوري لجميع أدوات القوة التكتيكية، المخزون المتوفر، الحركات اللحظية، والأدوات المفعلة
              </p>
            </div>
          </div>

          {/* Quick System Telemetry Toggle */}
          <button
            onClick={() => setShowSystemHealth(!showSystemHealth)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c1220] border border-white/[0.08] text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>صحة خط الاتصال</span>
            {showSystemHealth ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible System Health Observability Bar */}
        {showSystemHealth && (
          <div className="transition-all duration-300">
            <SystemHealth />
          </div>
        )}

        {/* 2. Core Vault Command Center Workstation */}
        <VaultToolsManager />
      </main>
    </div>
  );
}
