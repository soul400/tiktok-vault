'use client';

import React, { useEffect, useState } from 'react';
import { useStreamStore } from '../store/useStreamStore';
import {
  Activity,
  Wifi,
  AlertTriangle,
  RefreshCw,
  Clock,
  Radio,
  Server,
  Zap,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from 'lucide-react';

export function DiagnosticsTab() {
  const { selectedStreamer, health } = useStreamStore();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!selectedStreamer) return;

    const fetchDiagnostics = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/streamers/${selectedStreamer.id}/status`);
        const data = await res.json();
        if (data.success && data.data) {
          setDiagnostics(data.data.telemetry || health);
        }
      } catch (err) {
        console.error('Error fetching diagnostics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnostics();
    const timer = setInterval(fetchDiagnostics, 2000);
    return () => clearInterval(timer);
  }, [selectedStreamer, health, refreshKey]);

  const effectiveTelemetry = diagnostics || health || selectedStreamer?.telemetry || {};
  const currentState = effectiveTelemetry.state || selectedStreamer?.status || 'OFFLINE';
  const wsState = effectiveTelemetry.websocketState || (currentState === 'LIVE' || currentState === 'CONNECTED' ? 'OPEN' : 'CLOSED');

  const getStateColor = (state: string) => {
    switch (state) {
      case 'LIVE':
      case 'CONNECTED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'CONNECTING':
      case 'DISCOVERING':
      case 'RECONNECTING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'DEGRADED':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'ENDED':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ERROR':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getWsColor = (ws: string) => {
    switch (ws) {
      case 'OPEN':
        return 'text-emerald-400';
      case 'CONNECTING':
        return 'text-amber-400 animate-pulse';
      case 'CLOSING':
        return 'text-orange-400';
      default:
        return 'text-rose-400';
    }
  };

  if (!selectedStreamer) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <Server className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p className="font-semibold">يرجى اختيار ستريمر من القائمة الجانبية لعرض التشخيصات المباشرة</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Refresh */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              تشخيصات الاتصال المباشر (Connection Diagnostics)
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${getStateColor(currentState)} font-mono font-bold`}>
                {currentState}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              @{selectedStreamer.username} — Room ID: {effectiveTelemetry.roomId || selectedStreamer.liveSession?.roomId || 'غير متوفر'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          تحديث القياسات
        </button>
      </div>

      {/* Main Diagnostic Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* WebSocket State Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>حالة WebSocket</span>
            <Wifi className={`w-4 h-4 ${getWsColor(wsState)}`} />
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${wsState === 'OPEN' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
            {wsState}
          </div>
          <p className="text-[11px] text-slate-500">
            بروتوكول: Webcast WebSocket v2.5.0
          </p>
        </div>

        {/* Event Throughput Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>معدل تدفق الأحداث (Throughput)</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {effectiveTelemetry.eventsPerSec || 0} <span className="text-xs text-slate-400 font-normal">event/sec</span>
          </div>
          <p className="text-[11px] text-slate-500">
            إجمالي الأحداث: {(effectiveTelemetry.totalEventsReceived || 0).toLocaleString()}
          </p>
        </div>

        {/* Reconnect & Error Count */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>محاولات إعادة الاتصال والأخطاء</span>
            <RefreshCw className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-center gap-3">
            <span className="text-amber-400">{effectiveTelemetry.reconnectCount || 0} أعيد</span>
            <span className="text-slate-600">|</span>
            <span className={effectiveTelemetry.errorCount > 0 ? 'text-rose-400' : 'text-slate-400'}>
              {effectiveTelemetry.errorCount || 0} خطأ
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {effectiveTelemetry.lastError ? `آخر خطأ: ${effectiveTelemetry.lastError}` : 'لا توجد أخطاء تشغيلية'}
          </p>
        </div>

        {/* Heartbeat & Latency */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>نبض النظام (Heartbeat)</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {effectiveTelemetry.latencyMs || 0} <span className="text-xs text-slate-400 font-normal">ms تأخير</span>
          </div>
          <p className="text-[11px] text-slate-500">
            آخر نبضة: {effectiveTelemetry.lastHeartbeat ? new Date(effectiveTelemetry.lastHeartbeat).toLocaleTimeString('ar-SA') : 'الآن'}
          </p>
        </div>
      </div>

      {/* Extended Telemetry Details */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-400" />
          تفاصيل الحدث الأخير وتتبع الجلسة
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <span className="text-slate-400 block mb-1">اسم آخر حدث مستلم:</span>
            <span className="font-mono text-white font-semibold">
              {effectiveTelemetry.lastEvent || 'لا توجد أحداث حديثة'}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <span className="text-slate-400 block mb-1">نوع الحدث القياسي (Universal Type):</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {effectiveTelemetry.lastEventType || 'N/A'}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <span className="text-slate-400 block mb-1">توقيت آخر حدث (UTC / مكة):</span>
            <span className="font-mono text-white">
              {effectiveTelemetry.lastEventAt ? new Date(effectiveTelemetry.lastEventAt).toLocaleTimeString('ar-SA') : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Diagnostic State Legend */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 text-xs text-slate-400 flex flex-wrap items-center gap-3">
        <span className="font-bold text-slate-300">دليل الحالات الـ 8:</span>
        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">CONNECTED / LIVE</span>
        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">CONNECTING / DISCOVERING</span>
        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">RECONNECTING</span>
        <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">DEGRADED</span>
        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">ENDED</span>
        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">ERROR</span>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">OFFLINE</span>
      </div>
    </div>
  );
}
