'use client';

import React from 'react';
import { useStreamStore } from '../store/useStreamStore';
import { formatRiyadhTime } from '@aep/shared';
import { MessageSquare, Heart, Gift, Zap, UserCheck, Flame, Shield, Star, Crown, Award } from 'lucide-react';
import { UniversalEventType } from '@aep/event-model';

export function LiveFeedTab() {
  const { events } = useStreamStore();

  const renderEventBadge = (type: UniversalEventType, payload: any) => {
    switch (type) {
      case UniversalEventType.CHAT_COMMENT:
        return (
          <span className="inline-flex items-center gap-1 text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium">
            <MessageSquare className="w-3 h-3" /> تعليق
          </span>
        );
      case UniversalEventType.GIFT_RECEIVED:
        return (
          <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium">
            <Gift className="w-3 h-3" /> هدية ({payload.diamondCost * payload.repeatCount} 💎)
          </span>
        );
      case UniversalEventType.LIKE_BURST:
        return (
          <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium">
            <Heart className="w-3 h-3" /> +{payload.likeCount} إعجاب
          </span>
        );
      case UniversalEventType.POWERUP_ACQUIRED:
        return (
          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
            <Zap className="w-3 h-3" /> أداة +{payload.quantity}
          </span>
        );
      case UniversalEventType.POWERUP_USED:
        return (
          <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
            <Flame className="w-3 h-3" /> تفعيل أداة ⚡
          </span>
        );
      case UniversalEventType.USER_JOIN:
        return (
          <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
            <UserCheck className="w-3 h-3" /> انضمام
          </span>
        );
      default:
        return (
          <span className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
            {type}
          </span>
        );
    }
  };

  const renderUser = (user: any) => {
    if (!user) return <span className="text-slate-600 shrink-0 font-mono">النظام</span>;

    const badges = Array.isArray(user.badges) ? user.badges : [];
    const vipBadge = badges.find((b: any) => b.type === 'VIP_GRADE' || b.name?.includes('VIP'));
    const fansBadge = badges.find((b: any) => b.type === 'FANS_TEAM' || b.name?.includes('Fans'));
    const otherBadges = badges.filter((b: any) => b !== vipBadge && b !== fansBadge);

    return (
      <div className="flex items-center gap-1.5 shrink-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="w-5 h-5 rounded-full object-cover border border-slate-700/80 shrink-0 bg-slate-800"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] text-slate-400 font-mono shrink-0">
            {user.uniqueId?.[0]?.toUpperCase() || 'U'}
          </div>
        )}

        <div className="flex items-center gap-1">
          <span className="text-blue-400 font-bold hover:underline cursor-pointer">
            @{user.uniqueId}
          </span>
          {user.nickname && user.nickname !== user.uniqueId && (
            <span className="text-slate-400 font-normal font-sans text-[11px] max-w-[100px] truncate">
              ({user.nickname})
            </span>
          )}
        </div>

        {/* Moderator Badge */}
        {user.isModerator && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Shield className="w-2.5 h-2.5" /> مشرف
          </span>
        )}

        {/* Subscriber Badge */}
        {user.isSubscriber && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
            <Star className="w-2.5 h-2.5" /> مشترك
          </span>
        )}

        {/* VIP Grade Badge */}
        {vipBadge && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10">
            <Crown className="w-2.5 h-2.5 text-amber-400" />
            VIP {vipBadge.level ? `Lv.${vipBadge.level}` : ''}
          </span>
        )}

        {/* Fans Team Badge */}
        {fansBadge && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Award className="w-2.5 h-2.5 text-rose-400" />
            {fansBadge.name || 'فريق'} {fansBadge.level ? `Lv.${fansBadge.level}` : ''}
          </span>
        )}

        {/* Other badges */}
        {otherBadges.slice(0, 1).map((b: any, i: number) => (
          <span
            key={i}
            className="inline-flex items-center px-1 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700"
          >
            {b.name}
          </span>
        ))}
      </div>
    );
  };

  const renderContent = (event: any) => {
    const p = event.payload || {};
    switch (event.eventType) {
      case UniversalEventType.CHAT_COMMENT:
        return <span className="text-slate-200">{p.text}</span>;
      case UniversalEventType.GIFT_RECEIVED:
        return (
          <span className="text-amber-300 font-semibold">
            أرسل {p.giftName} ×{p.repeatCount}
          </span>
        );
      case UniversalEventType.LIKE_BURST:
        return <span className="text-slate-400">ضغط على الشاشة {p.likeCount} مرة</span>;
      case UniversalEventType.POWERUP_ACQUIRED:
        return (
          <span className="text-emerald-300 font-bold">
            حصل على {p.powerUpName || p.powerUpCode} ({p.quantity}+)
          </span>
        );
      case UniversalEventType.POWERUP_USED:
        return (
          <span className="text-purple-300 font-bold">
            فعّل أداة {p.powerUpName || p.powerUpCode} في الجولة!
          </span>
        );
      default:
        return <span className="text-slate-500">{JSON.stringify(p)}</span>;
    }
  };

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col h-[650px] overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            التدفق المباشر للأحداث (Live Real-Time Feed)
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {events.length} حدث مخزن لحظياً
        </span>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
            <Zap className="w-6 h-6 text-slate-600 animate-bounce" />
            بانتظار الأحداث المباشرة من الحساب...
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="px-3 py-2 rounded-lg bg-[#090d16]/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                {/* Time */}
                <span className="text-[11px] text-slate-500 shrink-0">
                  {formatRiyadhTime(event.timestampUtc)}
                </span>

                {/* Event Type Badge */}
                <div className="shrink-0">{renderEventBadge(event.eventType, event.payload)}</div>

                {/* User with Avatar, Nickname, Roles & Badges */}
                {renderUser(event.user)}

                {/* Message / Payload */}
                <div className="truncate font-sans text-xs">{renderContent(event)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
