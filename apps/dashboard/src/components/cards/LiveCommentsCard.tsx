'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Smile, Send, Radio } from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';
import { getSocket } from '../../lib/socket';

interface LiveCommentsCardProps {
  onViewAll?: () => void;
}

export function LiveCommentsCard({ onViewAll }: LiveCommentsCardProps) {
  const events = useStreamStore((s) => s.events);
  const [commentInput, setCommentInput] = useState('');
  const [initialComments, setInitialComments] = useState<any[]>([]);

  // Fetch recent actual comments from database
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch('/api/comments/recent?limit=20');
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const loaded = data.data.map((c: any) => ({
            id: c.id,
            username: c.user?.uniqueId || c.user?.nickname || 'متابع',
            comment: c.commentText || '',
            time: new Date(c.timestampUtc || Date.now()).toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            avatar: c.user?.avatarUrl,
          }));
          setInitialComments(loaded);
        }
      } catch (err) {
        console.error('Failed to load recent comments:', err);
      }
    };
    fetchRecent();

    // Direct socket listener for instant incoming comments
    const socket = getSocket();
    const onComment = (data: any) => {
      if (data?.user) {
        const newCmt = {
          id: data.id || `cmt_${Date.now()}`,
          username: data.user?.uniqueId || data.user?.nickname || 'متابع',
          comment: data.payload?.text || data.payload?.comment || '',
          time: new Date(data.timestamp || Date.now()).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          avatar: data.user?.avatarUrl,
        };
        setInitialComments((prev) => [newCmt, ...prev.slice(0, 19)]);
      }
    };

    socket.on('live:comment', onComment);
    return () => {
      socket.off('live:comment', onComment);
    };
  }, []);

  // Extract comments from store events
  const liveComments = events
    .filter((e) => e.eventType === 'CHAT_COMMENT')
    .slice(0, 15)
    .map((e) => ({
      id: e.id,
      username: e.user?.uniqueId || e.user?.nickname || 'متابع',
      comment: (e.payload as any)?.text || (e.payload as any)?.comment || '',
      time: new Date(e.timestampUtc || (e as any).timestamp || Date.now()).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      avatar: e.user?.avatarUrl || (e.user as any)?.profileImage,
    }));

  // Combine live comments with initial loaded comments, deduplicated by id
  const combinedMap = new Map<string, any>();
  for (const c of [...liveComments, ...initialComments]) {
    const key = c.id || `${c.username}_${c.comment}`;
    if (!combinedMap.has(key)) combinedMap.set(key, c);
  }
  const displayedComments = Array.from(combinedMap.values()).slice(0, 8);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    useStreamStore.getState().addEvent({
      id: `local_${Date.now()}`,
      eventId: `local_evt_${Date.now()}`,
      provider: 'TIKTOK_LIVE' as any,
      providerVersion: '1.0',
      providerEventName: 'chat',
      streamerId: useStreamStore.getState().selectedStreamer?.id || 'default',
      streamerUsername: useStreamStore.getState().selectedStreamer?.username || 'mohra.2000',
      sessionId: 'local_sess',
      roomId: 'local_room',
      timestampUtc: new Date().toISOString(),
      receivedAtUtc: new Date().toISOString(),
      eventType: 'CHAT_COMMENT' as any,
      user: {
        userId: 'self',
        uniqueId: 'you',
        nickname: 'أنت',
      },
      payload: {
        text: commentInput.trim(),
        comment: commentInput.trim(),
      },
    });

    setCommentInput('');
  };

  return (
    <div dir="rtl" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">الكومنت اللحظي</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>مباشر</span>
          <Radio className="w-3 h-3 text-emerald-400" />
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
        {displayedComments.map((item, idx) => (
          <div key={item.id || idx} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-100 to-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden border border-purple-200">
                {item.avatar ? (
                  <img src={item.avatar} alt={item.username} className="w-full h-full object-cover" />
                ) : (
                  item.username.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>{item.username}</span>
                  {idx % 2 === 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </div>
                <div className="text-slate-600 font-medium leading-relaxed">
                  {item.comment}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono shrink-0 mt-0.5">
              {item.time}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Input Bar */}
      <form onSubmit={handleSend} className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
        >
          <Smile className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          placeholder="اكتب تعليقك..."
          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right"
        />

        <button
          type="submit"
          className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-sm"
        >
          <Send className="w-3.5 h-3.5 rotate-180" />
        </button>
      </form>
    </div>
  );
}
