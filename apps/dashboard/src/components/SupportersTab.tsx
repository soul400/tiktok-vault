'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Gift, Diamond, Crown, Sparkles, Users } from 'lucide-react';

export function SupportersTab() {
  const [supporters, setSupporters] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics/overview');
        const data = await res.json();
        if (data.success && data.data?.topSupporters) {
          setSupporters(data.data.topSupporters);
        }
      } catch (err) {
        console.error('Failed to fetch supporters:', err);
      }
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 6000);
    return () => clearInterval(interval);
  }, []);

  const getRankBadge = (idx: number) => {
    if (idx === 0)
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 font-black text-xs border border-amber-300">
          <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" /> #1
        </span>
      );
    if (idx === 1)
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-black text-xs border border-slate-300">
          #2
        </span>
      );
    if (idx === 2)
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-orange-100 text-orange-800 font-black text-xs border border-orange-300">
          #3
        </span>
      );
    return <span className="text-slate-400 font-mono text-xs font-bold px-2">#{idx + 1}</span>;
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/30 shadow-inner">
            <Trophy className="w-6 h-6 drop-shadow" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight flex items-center gap-2">
              لوحة صدارة كبار الداعمين (Top Supporters Leaderboard)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold">
                VIP-RANKING
              </span>
            </h2>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              تصنيف مباشر للداعمين بناءً على إجمالي الألماس، الهدايا المرسلة، وسجل التفاعل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/30 text-xs font-bold font-mono">
          <Users className="w-4 h-4 text-emerald-200" />
          <span>{supporters.length} داعم مرصود</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold">
                <th className="py-3 px-3">المرتبة</th>
                <th className="py-3 px-3">الداعم</th>
                <th className="py-3 px-3">إجمالي الألماس</th>
                <th className="py-3 px-3 text-center">عدد الهدايا</th>
                <th className="py-3 px-3 text-center">التعليقات</th>
                <th className="py-3 px-3 text-center">أدوات المعركة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {supporters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans text-xs">
                    لا توجد بيانات داعمين مسجلة بعد.
                  </td>
                </tr>
              ) : (
                supporters.map((sup, idx) => {
                  const badges = Array.isArray(sup.badges) ? sup.badges : [];
                  const vipBadge = badges.find((b: any) => b.type === 'VIP_GRADE' || b.name?.includes('VIP'));
                  const fansBadge = badges.find((b: any) => b.type === 'FANS_TEAM' || b.name?.includes('Fans'));

                  return (
                    <tr key={sup.id || idx} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-3 px-3">{getRankBadge(idx)}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center text-xs font-bold text-slate-600">
                            {sup.avatarUrl ? (
                              <img src={sup.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (sup.uniqueId || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">@{sup.uniqueId}</span>
                              {vipBadge && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Crown className="w-2.5 h-2.5 text-amber-600" />
                                  VIP {vipBadge.level ? `Lv.${vipBadge.level}` : ''}
                                </span>
                              )}
                              {fansBadge && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-rose-100 text-rose-800 border border-rose-200">
                                  {fansBadge.name || 'فريق'} {fansBadge.level ? `Lv.${fansBadge.level}` : ''}
                                </span>
                              )}
                            </div>
                            {sup.nickname && sup.nickname !== sup.uniqueId && (
                              <div className="text-slate-400 font-sans text-[11px]">{sup.nickname}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-black text-emerald-700 text-sm flex items-center gap-1">
                        <span>{Number(sup.totalDiamonds || 0).toLocaleString()}</span>
                        <Diamond className="w-3.5 h-3.5 text-cyan-500 fill-cyan-400" />
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 font-semibold">{sup.totalGifts || 0}</td>
                      <td className="py-3 px-3 text-center text-slate-500">{sup.totalComments || 0}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                          {sup.powerUpInventory?.length || 0} أداة
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
