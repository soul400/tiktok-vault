'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Calendar, MessageSquare, TrendingUp, Crown, ArrowLeft, CheckCircle2, Diamond, Users, Swords } from 'lucide-react';

interface ReportsCardProps {
  onViewAllReports?: () => void;
}

export function ReportsCard({ onViewAllReports }: ReportsCardProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [battles, setBattles] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anaRes, batRes] = await Promise.all([
          fetch('/api/analytics/overview'),
          fetch('/api/battles?limit=5'),
        ]);
        const anaData = await anaRes.json();
        const batData = await batRes.json();
        if (anaData.success) setAnalytics(anaData.data);
        if (batData.success) setBattles(batData.data || []);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalComments = analytics?.sessions?.[0]?.totalComments || analytics?.totalComments || 0;
  const totalDiamonds = analytics?.sessions?.[0]?.totalDiamonds || analytics?.totalDiamonds || 0;
  const totalGifts = analytics?.sessions?.[0]?.totalGifts || analytics?.totalGifts || 0;
  const topDiamond = analytics?.topSupporters?.[0]?.totalDiamonds || 0;

  const summaryStats = [
    { label: 'إجمالي التفاعلات', value: totalComments.toLocaleString(), icon: MessageSquare, color: 'text-emerald-500' },
    { label: 'إجمالي الألماس', value: totalDiamonds.toLocaleString(), icon: Diamond, color: 'text-purple-500' },
    { label: 'أعلى دعم', value: topDiamond.toLocaleString(), icon: Crown, color: 'text-amber-500' },
  ];

  const totalBattles = battles.length;
  const finishedBattles = battles.filter((b) => b.status === 'FINISHED').length;
  const activeBattles = battles.filter((b) => b.status === 'IN_PROGRESS').length;

  const recentLogs = [
    {
      title: `تقرير المعارك (PK) — ${totalBattles} جولات`,
      status: finishedBattles > 0 ? 'مكتملة' : 'جارية',
      color: finishedBattles > 0
        ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
        : 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: `سجل الهدايا — ${totalGifts} هدية`,
      status: 'تم التحديث',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: `سجل الداعمين — ${(analytics?.topSupporters?.length || 0)} داعم`,
      status: 'تم التحديث',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      title: `تقارير البث — ${(analytics?.sessions?.length || 0)} جلسات`,
      status: 'تم التحديث',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  ];

  return (
    <div dir="rtl" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">التقارير و السجلات</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold">
          <span>آخر 7 أيام</span>
          <Calendar className="w-3 h-3" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto space-y-3">
        {/* 3 Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          {summaryStats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 text-center flex flex-col items-center justify-center space-y-1"
              >
                <Icon className={`w-4 h-4 ${s.color}`} />
                <div className="text-[10px] text-slate-400 font-medium truncate w-full">
                  {s.label}
                </div>
                <div className="font-black text-slate-800 text-xs font-mono">
                  {s.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Logs List */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400">أحدث السجلات</div>
          <div className="space-y-1.5">
            {recentLogs.map((log, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100 text-xs"
              >
                <span className="font-semibold text-slate-700">{log.title}</span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${log.color}`}>
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>{log.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onViewAllReports}
          className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-blue-200/60"
        >
          <span>عرض جميع التقارير</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
