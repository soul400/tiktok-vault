'use client';

import React, { useEffect, useState } from 'react';
import { formatRiyadhDateTime, formatDuration } from '@aep/shared';
import { BarChart3, Download, Calendar, Filter, FileText } from 'lucide-react';

export function AnalyticsTab() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [exportType, setExportType] = useState('sessions');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/sessions?limit=50');
        const data = await res.json();
        if (data.success) setSessions(data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSessions();
  }, []);

  const handleDownload = (format: 'csv' | 'json') => {
    window.open(`/api/export/${format}?entity=${exportType}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Export & Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            مركز التقارير وتصدير البيانات (30-Day Retention Window)
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none"
          >
            <option value="sessions">جلسات البث (Live Sessions)</option>
            <option value="users">المستخدمين (Audience & Supporters)</option>
            <option value="gifts">سجل الهدايا (Gift Events)</option>
            <option value="battles">معارك التحدي (Battles)</option>
            <option value="powerups">حركات أدوات المعركة (Power-ups)</option>
          </select>

          <button
            onClick={() => handleDownload('csv')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير CSV
          </button>

          <button
            onClick={() => handleDownload('json')}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            تصدير JSON
          </button>
        </div>
      </div>

      {/* Historical Sessions Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
          سجل الجلسات التاريخية المحفوظة (أحدث 50 جلسة)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">الحساب</th>
                <th className="py-2.5 px-3 font-semibold">البدء (الرياض)</th>
                <th className="py-2.5 px-3 font-semibold">المدة</th>
                <th className="py-2.5 px-3 font-semibold">الحالة</th>
                <th className="py-2.5 px-3 font-semibold">إجمالي الألماس</th>
                <th className="py-2.5 px-3 font-semibold">الهدايا</th>
                <th className="py-2.5 px-3 font-semibold">الإعجابات</th>
                <th className="py-2.5 px-3 font-semibold">التعليقات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    لا توجد جلسات بث مسجلة بعد.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-blue-400">
                      @{s.streamer?.username || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {formatRiyadhDateTime(s.startedAtUtc)}
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      {formatDuration(s.durationSeconds || 0)}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.status === 'ACTIVE'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.status === 'ACTIVE' ? '● مباشر' : 'مكتمل'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-400">
                      {s.totalDiamonds?.toLocaleString() || 0} 💎
                    </td>
                    <td className="py-3 px-3 text-slate-300">{s.totalGifts?.toLocaleString() || 0}</td>
                    <td className="py-3 px-3 text-slate-400">{s.totalLikes?.toLocaleString() || 0}</td>
                    <td className="py-3 px-3 text-slate-400">{s.totalComments?.toLocaleString() || 0}</td>
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
