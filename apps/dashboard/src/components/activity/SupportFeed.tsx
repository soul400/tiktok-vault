'use client';

import React from 'react';
import { Gift, Gem, Heart, Sparkles } from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';

export function SupportFeed() {
  const events = useStreamStore((s) => s.events);

  // Filter actual gifts and supporter actions from sliding buffer
  const supportEvents = events
    .filter((e) => (e.eventType as string) === 'GIFT_RECEIVED' || (e.eventType as string) === 'LIKE_BURST')
    .slice(0, 50);

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full bg-[#101625] border border-white/[0.08] rounded-xl flex flex-col h-[380px] overflow-hidden">
      {/* Header */}
      <div className="bg-[#070A12] px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold text-slate-200">تدفق الهدايا والداعمين (Support Feed)</h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {supportEvents.length} دعم مباشر
        </span>
      </div>

      {/* Gifts & Support List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {supportEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
            بانتظار وصول الهدايا ودعم الجولة الحالية...
          </div>
        ) : (
          supportEvents.map((e, idx) => {
            const user = e.user;
            const payload = e.payload as any;
            const giftName = payload?.giftName || payload?.name || 'هدية تيك توك';
            const diamonds = Number(payload?.diamondCost || payload?.diamonds || 0) * Number(payload?.repeatCount || 1);
            const repeat = Number(payload?.repeatCount || 1);
            const time = formatTime(e.timestampUtc);

            return (
              <div
                key={e.id || idx}
                className="p-2.5 rounded-lg bg-[#070A12] border border-purple-500/20 hover:border-purple-500/40 flex items-center justify-between gap-3 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden ring-1 ring-purple-500/30 shrink-0">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-[10px] font-bold">
                        {(user?.nickname || user?.uniqueId || '?')[0]}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-slate-200 truncate">
                        {user?.nickname || user?.uniqueId || 'داعم'}
                      </span>
                      {user?.uniqueId && (
                        <span dir="ltr" className="text-[10px] text-slate-500 font-mono">
                          @{user.uniqueId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-300 mt-0.5">
                      <span className="font-bold">{giftName}</span>
                      {repeat > 1 && (
                        <span dir="ltr" className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-[9px]">
                          x{repeat}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Diamonds and Timestamp */}
                <div className="text-left shrink-0">
                  <div className="flex items-center gap-1 text-amber-400 font-mono font-black text-xs tabular-nums justify-end">
                    <Gem className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                    <span>+{diamonds > 0 ? diamonds.toLocaleString() : repeat}</span>
                  </div>
                  <div dir="ltr" className="text-[9px] text-slate-500 font-mono tabular-nums mt-0.5">
                    {time}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
