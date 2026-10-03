'use client';

import React from 'react';
import { Clock, Shield, Gift, Zap, Swords, Trophy, Sparkles } from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';

interface BattleTimelineProps {
  battleId?: string;
}

export function BattleTimeline({ battleId }: BattleTimelineProps) {
  const events = useStreamStore((s) => s.events);
  const activeBattle = useStreamStore((s) => s.activeBattle);

  // Filter real timeline events relevant to battle and supporter actions
  const battleEvents = events.filter((e: any) => {
    return (
      e.eventType === 'BATTLE_START' ||
      e.eventType === 'BATTLE_ARMIES_UPDATE' ||
      e.eventType === 'BATTLE_END' ||
      e.eventType === 'POWERUP_ACQUIRED' ||
      e.eventType === 'POWERUP_USED' ||
      e.eventType === 'GIFT_RECEIVED'
    );
  }).slice(0, 10);

  const getEventBadge = (type: string, payload: any) => {
    switch (type) {
      case 'BATTLE_START':
        return { label: 'انطلاق المعركة', icon: Swords, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'POWERUP_ACQUIRED':
        return { label: `تم الحصول على ${payload?.powerUpName || 'أداة'}`, icon: Shield, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case 'POWERUP_USED':
        return { label: `تفعيل ${payload?.powerUpName || 'أداة'}`, icon: Zap, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case 'GIFT_RECEIVED':
        return { label: `هدية: ${payload?.giftName || 'دعم'}`, icon: Gift, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      case 'BATTLE_END':
        return { label: 'انتهاء الجولة', icon: Trophy, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      default:
        return { label: 'تحديث الجولة', icon: Sparkles, color: 'text-slate-400 bg-white/[0.04] border-white/10' };
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    } catch {
      return '00:00:00';
    }
  };

  return (
    <div className="w-full bg-[#101625] border border-white/[0.08] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-200">الجدول الزمني لأحداث المعركة (Battle Timeline)</h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {battleEvents.length} أحداث مسجلة
        </span>
      </div>

      {battleEvents.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-xs font-mono">
          بانتظار تسجيل أول أحداث المعركة الحالية...
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {battleEvents.map((e: any, idx: number) => {
            const badge = getEventBadge(e.eventType, e.payload);
            const Icon = badge.icon;
            const timeStr = formatTimestamp(e.timestampUtc || e.timestamp);
            const username = e.user?.uniqueId || e.user?.nickname || '';

            return (
              <div
                key={e.id || idx}
                className="flex items-center justify-between p-2 rounded-lg bg-[#070A12] border border-white/[0.04] hover:border-white/10 text-xs transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-6 h-6 rounded flex items-center justify-center border shrink-0 ${badge.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-200">{badge.label}</span>
                    {username && (
                      <span dir="ltr" className="text-[10px] text-slate-400 font-mono mr-2">
                        (@{username})
                      </span>
                    )}
                  </div>
                </div>

                <div dir="ltr" className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">
                  {timeStr}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
