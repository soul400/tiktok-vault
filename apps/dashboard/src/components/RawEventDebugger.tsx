'use client';

import React, { useState } from 'react';
import { useStreamStore } from '../store/useStreamStore';
import {
  Code,
  Pause,
  Play,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';

export function RawEventDebugger() {
  const { events } = useStreamStore();
  const [isPaused, setIsPaused] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredEvents = events.filter((ev: any) => {
    if (filterType !== 'ALL' && ev.eventType !== filterType) {
      return false;
    }
    if (searchTerm) {
      const serialized = JSON.stringify(ev).toLowerCase();
      if (!serialized.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const handleCopy = (id: string, obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'CHAT_COMMENT':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'GIFT_RECEIVED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'LIKE_BURST':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'SHARE':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'BATTLE_START':
      case 'BATTLE_UPDATE':
      case 'BATTLE_ARMIES_UPDATE':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'POWERUP_DETECTED':
      case 'POWERUP_ACQUIRED':
      case 'POWERUP_USED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'UNKNOWN_EVENT':
        return 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 animate-pulse font-bold';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Code className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              مصحح الأحداث المباشرة (Raw Event Debugger)
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {filteredEvents.length} حدث
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              مراقبة وتحليل كائنات الأحداث الأصلية (Raw Envelopes) بدون تشويه أو إسقاط
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'استئناف البث' : 'إيقاف مؤقت'}
          </button>

          {/* Filter Dropdown */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">جميع الأحداث (ALL)</option>
              <option value="CHAT_COMMENT">شات تعليق (CHAT)</option>
              <option value="GIFT_RECEIVED">هدايا (GIFT)</option>
              <option value="LIKE_BURST">إعجابات (LIKE)</option>
              <option value="SHARE">مشاركة (SHARE)</option>
              <option value="VIEWER_COUNT_UPDATE">المشاهدين (VIEWERS)</option>
              <option value="BATTLE_START">بداية معركة (BATTLE_START)</option>
              <option value="BATTLE_ARMIES_UPDATE">جيوش المعركة (ARMIES)</option>
              <option value="POWERUP_ACQUIRED">اكتساب أداة (ACQUIRED)</option>
              <option value="POWERUP_USED">استخدام أداة (USED)</option>
              <option value="UNKNOWN_EVENT">أحداث غير معروفة (UNKNOWN_EVENT) ⚠️</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="بحث في محتوى الحدث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Unknown Event Alert Banner */}
      {events.some((e: any) => e.eventType === 'UNKNOWN_EVENT') && (
        <div className="bg-fuchsia-950/30 border border-fuchsia-800/50 rounded-xl p-3 flex items-center justify-between text-xs text-fuchsia-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-fuchsia-400" />
            <span>
              تم رصد أحداث غير معرّفة (UNKNOWN_EVENT) من TikTok! تم حفظها كاملة في قاعدة البيانات لتشريح البروتوكول لاحقاً.
            </span>
          </div>
          <button
            onClick={() => setFilterType('UNKNOWN_EVENT')}
            className="px-2.5 py-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded text-[11px] font-bold"
          >
            تصفية الأحداث غير المعروفة
          </button>
        </div>
      )}

      {/* Events Stream Terminal */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs space-y-3 max-h-[650px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
            لا توجد أحداث مطابقة حالياً. بانتظار تدفق البيانات من الستريمر...
          </div>
        ) : (
          filteredEvents.map((ev: any, idx: number) => (
            <div
              key={ev.id || idx}
              className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition-colors"
            >
              {/* Event Header Bar */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded border text-[10px] ${getBadgeStyle(ev.eventType)}`}>
                    {ev.eventType}
                  </span>
                  <span className="text-slate-400">
                    مزود: <span className="text-slate-200">{ev.provider}</span>
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">
                    الحدث الأصلي: <span className="text-blue-400">{ev.providerEventName}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-500">
                    {new Date(ev.timestampUtc).toLocaleTimeString('ar-SA')}
                  </span>
                  <button
                    onClick={() => handleCopy(ev.id || String(idx), ev)}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                  >
                    {copiedId === (ev.id || String(idx)) ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        تم النسخ
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        نسخ JSON
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Event JSON Tree View */}
              <pre className="text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-900">
                {JSON.stringify(
                  {
                    id: ev.id,
                    eventId: ev.eventId,
                    provider: ev.provider,
                    providerEventName: ev.providerEventName,
                    providerEventId: ev.providerEventId,
                    providerTransactionId: ev.providerTransactionId,
                    timestampUtc: ev.timestampUtc,
                    user: ev.user,
                    payload: ev.payload,
                    rawPayload: ev.rawPayload,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
