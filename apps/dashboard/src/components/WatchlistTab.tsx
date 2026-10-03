'use client';

import React, { useEffect, useState } from 'react';
import { Eye, UserCheck, Trash2, Plus, Bell, Shield, Sparkles } from 'lucide-react';

export function WatchlistTab() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [usernameInput, setUsernameInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/watchlist');
      const data = await res.json();
      if (data.success) setWatchlist(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAddWatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput.trim(),
          note: noteInput.trim() || undefined,
          notifyComments: true,
          notifyLikes: true,
          notifyGifts: true,
          notifyDiamonds: true,
          notifyBattles: true,
          notifyPowerups: true,
          notifyMvp: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUsernameInput('');
        setNoteInput('');
        fetchWatchlist();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف المستخدم من قائمة المراقبة؟')) return;
    try {
      await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
      setWatchlist((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add VIP Form */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-400" />
          إضافة شخص للمراقبة الخاصة (Watchlist Radar)
        </h2>

        <form onSubmit={handleAddWatch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <input
              type="text"
              placeholder="@username للمستخدم المراد رصده"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="ملاحظات (مثال: داعم رئيسي، منافس...)"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isSubmitting || !usernameInput.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {isSubmitting ? 'جاري الإضافة...' : 'تفعيل رادار المراقبة'}
            </button>
          </div>
        </form>
      </div>

      {/* Watchlist Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            قائمة الشخصيات المراقبة لحظياً
          </h3>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            {watchlist.length} مراقب
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">المستخدم</th>
                <th className="py-2.5 px-3 font-semibold">الملاحظة</th>
                <th className="py-2.5 px-3 font-semibold">إجمالي الألماس</th>
                <th className="py-2.5 px-3 font-semibold">التعليقات</th>
                <th className="py-2.5 px-3 font-semibold">أدوات المعركة</th>
                <th className="py-2.5 px-3 font-semibold">التنبيهات المفعلة</th>
                <th className="py-2.5 px-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {watchlist.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    لا يوجد أشخاص مضافون لقائمة المراقبة حالياً.
                  </td>
                </tr>
              ) : (
                watchlist.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-blue-400">
                      ⭐ @{item.user.uniqueId}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans">{item.note || '—'}</td>
                    <td className="py-3 px-3 text-amber-400 font-bold">
                      {item.user.totalDiamonds.toLocaleString()} 💎
                    </td>
                    <td className="py-3 px-3 text-slate-300">{item.user.totalComments}</td>
                    <td className="py-3 px-3 text-emerald-400">
                      {item.user.powerUpInventory?.length || 0} أنواع
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                          هدايا
                        </span>
                        <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                          أدوات
                        </span>
                        <span className="bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20">
                          معارك
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                        title="حذف من المراقبة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
