'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { MessageSquare, Shield, Sparkles, Heart, ArrowDown, Radio, CheckCircle2 } from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';

export function LiveChat() {
  const events = useStreamStore((s) => s.events);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [hasNewComments, setHasNewComments] = useState<boolean>(false);

  // Extract real TikTok chat comments in strict chronological streaming order (oldest at top, newest at bottom)
  const chatComments = useMemo(() => {
    return events
      .filter((e) => e.eventType === 'CHAT_COMMENT')
      .slice(0, 120) // Keep the latest 120 comments in active buffer
      .reverse(); // Reverse so newest appears at the very bottom, exactly like TikTok LIVE
  }, [events]);

  // Keep track of comment count for auto-scroll trigger
  const prevCountRef = useRef(chatComments.length);

  // Continuous auto-scroll effect
  useEffect(() => {
    if (chatComments.length > prevCountRef.current) {
      if (autoScroll) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setHasNewComments(false);
      } else {
        setHasNewComments(true);
      }
    }
    prevCountRef.current = chatComments.length;
  }, [chatComments, autoScroll]);

  // Detect user scroll position
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If user is within 50px of bottom, keep auto-scroll active
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (isAtBottom) {
      setAutoScroll(true);
      setHasNewComments(false);
    } else {
      setAutoScroll(false);
    }
  };

  const jumpToBottom = () => {
    setAutoScroll(true);
    setHasNewComments(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // Helper for VIP Level badge styles
  const getVipBadgeStyle = (level: number) => {
    if (level >= 40) {
      return 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black shadow-[0_0_8px_rgba(251,191,36,0.5)] border border-amber-300';
    }
    if (level >= 30) {
      return 'bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold border border-rose-400/50 shadow-[0_0_6px_rgba(244,63,94,0.4)]';
    }
    if (level >= 20) {
      return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold border border-purple-400/40';
    }
    if (level >= 10) {
      return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold border border-amber-400/40';
    }
    return 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold border border-blue-400/30';
  };

  return (
    <div className="w-full bg-[#0E131F] border border-white/[0.08] rounded-xl flex flex-col h-[400px] overflow-hidden shadow-lg shadow-black/40 relative">
      {/* Broadcast Chat Header */}
      <div className="bg-[#070A12] px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-100">دردشة البث المباشر (TikTok Live Chat)</h3>
              <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                مباشر لحظي
              </span>
            </div>
          </div>
        </div>

        {/* Controls & Count */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            title={autoScroll ? 'التمرير التلقائي نشط' : 'التمرير متوقف مؤقتاً'}
            className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono transition-colors border ${
              autoScroll
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}
          >
            <CheckCircle2 className={`w-3 h-3 ${autoScroll ? 'text-emerald-400' : 'text-amber-400'}`} />
            {autoScroll ? 'تمرير مستمر' : 'متوقف'}
          </button>
          <span className="text-[10px] text-slate-400 font-mono bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.05]">
            {chatComments.length} رسالة
          </span>
        </div>
      </div>

      {/* Messages Feed (Scrollable in TikTok stream order) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-3 overflow-y-auto space-y-2.5 scroll-smooth overscroll-contain"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
      >
        {chatComments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500">
              <MessageSquare className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-xs text-slate-400 font-medium">بانتظار تدفق تعليقات البث المباشر من TikTok...</p>
            <span className="text-[10px] text-slate-600 font-mono">
              تظهر الرسائل لحظياً بنفس الترتيب الذي تظهر به في البث
            </span>
          </div>
        ) : (
          chatComments.map((c, idx) => {
            const user = c.user;
            const payload = c.payload as any;
            const text = payload?.text || payload?.comment || payload?.message || '';
            const time = formatTime(c.timestampUtc);

            // TikTok Badges
            const vipBadge = user?.badges?.find(
              (b: any) => b.type === 'VIP_GRADE' || (b.level && b.level > 0)
            );
            const fansTeamBadge = user?.badges?.find(
              (b: any) => b.type === 'FANS_TEAM' || b.name?.includes('فريق')
            );
            const isMod = user?.isModerator;
            const isSub = user?.isSubscriber;

            return (
              <div
                key={c.id || idx}
                className="group relative p-2 rounded-lg bg-[#080C16]/90 border border-white/[0.04] hover:border-white/[0.1] hover:bg-[#0C1222] transition-all flex items-start gap-2.5"
              >
                {/* User Avatar */}
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden ring-1 ring-white/10 mt-0.5">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.nickname || user.uniqueId}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-cyan-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {(user?.nickname || user?.uniqueId || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  {/* Metadata Header: Badges + Name + Handle + Time */}
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* VIP Level Badge */}
                      {vipBadge?.level && vipBadge.level > 0 && (
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] leading-tight ${getVipBadgeStyle(
                            vipBadge.level
                          )}`}
                          title={`مستوى المعجبين: ${vipBadge.level}`}
                        >
                          <Shield className="w-2.5 h-2.5 shrink-0" />
                          <span>Lv.{vipBadge.level}</span>
                        </span>
                      )}

                      {/* Moderator Badge */}
                      {isMod && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          مشرف
                        </span>
                      )}

                      {/* Subscriber Badge */}
                      {isSub && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                          مشترك
                        </span>
                      )}

                      {/* Fans Team Badge */}
                      {fansTeamBadge && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                          <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                          <span>{fansTeamBadge.name || 'فريق'}</span>
                          {fansTeamBadge.level && <span>Lv.{fansTeamBadge.level}</span>}
                        </span>
                      )}

                      {/* Nickname & Handle */}
                      <span className="font-bold text-slate-200 text-xs hover:text-cyan-300 transition-colors cursor-default">
                        {user?.nickname || user?.uniqueId || 'مشاهد'}
                      </span>
                      {user?.uniqueId && (
                        <span dir="ltr" className="text-[10px] text-slate-500 font-mono">
                          @{user.uniqueId}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span
                      dir="ltr"
                      className="text-[9px] text-slate-500 font-mono tabular-nums shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                      {time}
                    </span>
                  </div>

                  {/* Comment Message (Full text with wrapping and TikTok high visibility) */}
                  <p className="text-slate-100 text-xs break-words leading-relaxed font-normal selection:bg-cyan-500/30">
                    {text}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Scroll anchor at the very bottom */}
        <div ref={messagesEndRef} className="h-0 w-0" />
      </div>

      {/* Floating Jump to Bottom Button if user scrolled up */}
      {hasNewComments && !autoScroll && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <button
            onClick={jumpToBottom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition-transform active:scale-95"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>تعليقات جديدة بالأسفل</span>
          </button>
        </div>
      )}
    </div>
  );
}
