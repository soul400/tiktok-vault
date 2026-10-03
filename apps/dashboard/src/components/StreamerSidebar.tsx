'use client';

import React, { useState } from 'react';
import { useStreamStore, StreamerItem } from '../store/useStreamStore';
import { UserPlus, Radio, Trash2, Users, Flame, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export function StreamerSidebar() {
  const { streamers, selectedStreamer, setSelectedStreamer, setStreamers } = useStreamStore();
  const [inputUsername, setInputUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const cleanTikTokHandle = (raw: string): string => {
    let clean = raw.trim();
    if (clean.includes('tiktok.com/@')) {
      clean = clean.split('tiktok.com/@')[1].split('/')[0].split('?')[0];
    } else if (clean.includes('tiktok.com/')) {
      clean = clean.split('tiktok.com/')[1].split('/')[0].split('?')[0];
    }
    return clean.replace(/^@+/, '').trim();
  };

  const handleAddStreamer = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = cleanTikTokHandle(inputUsername);
    if (!handle) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/streamers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: handle }),
      });
      const data = await res.json();
      if (data.success) {
        setInputUsername('');
        setFeedback({
          type: 'success',
          message: data.data?.status === 'LIVE'
            ? `تم الاتصال بنجاح بالبث المباشر لـ @${handle}!`
            : `تمت إضافة @${handle} وبدء المراقبة التلقائية لحالة البث.`
        });

        // Refresh streamers list
        const listRes = await fetch('/api/streamers');
        const listData = await listRes.json();
        if (listData.success) {
          setStreamers(listData.data);
          setSelectedStreamer(data.data);
        }
      } else {
        setFeedback({ type: 'error', message: data.error || 'فشل الاتصال بالحساب' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'حدث خطأ في الاتصال' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  const handleRefreshList = async () => {
    try {
      const res = await fetch('/api/streamers');
      const data = await res.json();
      if (data.success) {
        setStreamers(data.data);
      }
    } catch (err) {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('هل تريد إزالة هذا الحساب من المراقبة؟')) return;

    try {
      await fetch(`/api/streamers/${id}`, { method: 'DELETE' });
      const updated = streamers.filter((s) => s.id !== id);
      setStreamers(updated);
      if (selectedStreamer?.id === id) {
        setSelectedStreamer(updated[0] || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <aside className="w-80 bg-[#0c1322] border-l border-slate-800 flex flex-col h-[calc(100vh-4rem)]">
      {/* Add Streamer Input Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            الاتصال الاحترافي بالبث
          </h2>
          <button
            onClick={handleRefreshList}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="تحديث القائمة"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleAddStreamer} className="space-y-2">
          <div className="relative">
            <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-xs">@</span>
            <input
              type="text"
              placeholder="اسم المستخدم أو رابط البث..."
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              className="w-full pr-8 pl-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !inputUsername.trim()}
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {isSubmitting ? 'جاري فحص حالة البث والاتصال...' : 'اتصال ورصد لحظي'}
          </button>
        </form>

        {feedback && (
          <div
            className={`p-2.5 rounded-lg text-[11px] flex items-start gap-1.5 leading-tight ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Streamers List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
          <span>الحسابات تحت المراقبة</span>
          <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
            {streamers.length}
          </span>
        </div>

        {streamers.length === 0 ? (
          <div className="text-center py-10 px-4 text-xs text-slate-500 space-y-1">
            <Radio className="w-6 h-6 mx-auto text-slate-600" />
            <p>لا توجد حسابات تحت المراقبة حالياً.</p>
            <p className="text-[10px] text-slate-600">أدخل اسم حساب TikTok أو رابطه للاتصال التلقائي.</p>
          </div>
        ) : (
          streamers.map((streamer) => {
            const isSelected = selectedStreamer?.id === streamer.id;
            const isLive = streamer.status === 'LIVE';

            return (
              <div
                key={streamer.id}
                onClick={() => setSelectedStreamer(streamer)}
                className={`group p-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/60 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isLive ? 'bg-red-500 shadow-sm shadow-red-500 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-200 truncate font-mono">
                      @{streamer.username}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDelete(streamer.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded transition-opacity"
                    title="إزالة الحساب"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span
                    className={`font-semibold ${
                      isLive ? 'text-red-400 flex items-center gap-1' : 'text-slate-500'
                    }`}
                  >
                    {isLive ? '● مباشر (LIVE)' : '○ غير متصل'}
                  </span>
                  {streamer.liveSession && (
                    <span className="font-mono text-slate-500 text-[9px]">
                      Room: {streamer.liveSession.roomId?.substring(0, 10)}...
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
