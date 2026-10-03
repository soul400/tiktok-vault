'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Calendar, Coins, Diamond } from 'lucide-react';

interface SupportersPodiumCardProps {
  onViewAll?: () => void;
}

interface Supporter {
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
  totalDiamonds: number;
  totalGifts: number;
  totalComments: number;
}

export function SupportersPodiumCard({ onViewAll }: SupportersPodiumCardProps) {
  const [supporters, setSupporters] = useState<Supporter[]>([]);

  useEffect(() => {
    const fetchSupporters = async () => {
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
    fetchSupporters();
    const interval = setInterval(fetchSupporters, 8000);
    return () => clearInterval(interval);
  }, []);

  const top3 = supporters.slice(0, 3);
  const rest = supporters.slice(3, 6);

  const getScore = (s: Supporter) => s.totalDiamonds || s.totalGifts || s.totalComments || 0;

  return (
    <div dir="rtl" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">صدارة الداعمين</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold">
          <span>الأسبوع الحالي</span>
          <Calendar className="w-3 h-3" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-3.5 flex flex-col justify-between overflow-y-auto space-y-3">
        {supporters.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            جاري تحميل بيانات الداعمين...
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-2 items-end pt-3 pb-2 text-center">
              {/* Rank 2 */}
              <div className="flex flex-col items-center">
                {top3[1] ? (
                  <>
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full border-2 border-blue-300 overflow-hidden bg-gradient-to-tr from-slate-200 to-blue-100 flex items-center justify-center text-xs font-bold text-slate-700 shadow-md">
                        {top3[1].avatarUrl ? (
                          <img src={top3[1].avatarUrl} alt={top3[1].nickname} className="w-full h-full object-cover" />
                        ) : (
                          (top3[1].nickname || top3[1].uniqueId)[0]?.toUpperCase()
                        )}
                      </div>
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center">2</span>
                    </div>
                    <div className="mt-1 font-bold text-slate-800 text-[11px] truncate max-w-[70px]">
                      {top3[1].nickname || top3[1].uniqueId}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-extrabold text-blue-600 font-mono">
                      <span>{getScore(top3[1]).toLocaleString()}</span>
                      <Diamond className="w-2.5 h-2.5 text-cyan-500" />
                    </div>
                    <div className="w-full h-10 mt-1.5 rounded-t-xl bg-gradient-to-b from-blue-100 to-blue-200/60 border-t-2 border-blue-400" />
                  </>
                ) : <div className="h-20" />}
              </div>

              {/* Rank 1 (Center - Tallest) */}
              <div className="flex flex-col items-center -mt-2">
                {top3[0] ? (
                  <>
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-2 border-amber-400 overflow-hidden bg-gradient-to-tr from-amber-100 to-yellow-200 flex items-center justify-center text-sm font-black text-amber-900 shadow-lg shadow-amber-500/20">
                        {top3[0].avatarUrl ? (
                          <img src={top3[0].avatarUrl} alt={top3[0].nickname} className="w-full h-full object-cover" />
                        ) : '👑'}
                      </div>
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-amber-500">
                        <Crown className="w-4 h-4 fill-amber-400 stroke-amber-600" />
                      </span>
                    </div>
                    <div className="mt-1 font-black text-slate-900 text-xs truncate max-w-[80px]">
                      {top3[0].nickname || top3[0].uniqueId}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-black text-amber-600 font-mono">
                      <span>{getScore(top3[0]).toLocaleString()}</span>
                      <Diamond className="w-3 h-3 text-cyan-500" />
                    </div>
                    <div className="w-full h-16 mt-1.5 rounded-t-xl bg-gradient-to-b from-amber-200 to-yellow-300/60 border-t-2 border-amber-400 shadow-inner" />
                  </>
                ) : <div className="h-24" />}
              </div>

              {/* Rank 3 */}
              <div className="flex flex-col items-center">
                {top3[2] ? (
                  <>
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full border-2 border-orange-300 overflow-hidden bg-gradient-to-tr from-orange-100 to-amber-100 flex items-center justify-center text-xs font-bold text-slate-700 shadow-md">
                        {top3[2].avatarUrl ? (
                          <img src={top3[2].avatarUrl} alt={top3[2].nickname} className="w-full h-full object-cover" />
                        ) : (
                          (top3[2].nickname || top3[2].uniqueId)[0]?.toUpperCase()
                        )}
                      </div>
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center">3</span>
                    </div>
                    <div className="mt-1 font-bold text-slate-800 text-[11px] truncate max-w-[70px]">
                      {top3[2].nickname || top3[2].uniqueId}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-extrabold text-orange-600 font-mono">
                      <span>{getScore(top3[2]).toLocaleString()}</span>
                      <Diamond className="w-2.5 h-2.5 text-cyan-500" />
                    </div>
                    <div className="w-full h-7 mt-1.5 rounded-t-xl bg-gradient-to-b from-orange-100 to-amber-200/60 border-t-2 border-orange-400" />
                  </>
                ) : <div className="h-16" />}
              </div>
            </div>

            {/* Lower Ranks List */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              {rest.map((s, idx) => (
                <div
                  key={s.uniqueId || idx}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center font-bold text-slate-400 text-[11px]">
                      {idx + 4}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {s.avatarUrl ? (
                        <img src={s.avatarUrl} alt={s.nickname} className="w-full h-full object-cover" />
                      ) : (
                        (s.nickname || s.uniqueId)[0]?.toUpperCase()
                      )}
                    </div>
                    <span className="font-semibold text-slate-700">{s.nickname || s.uniqueId}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-slate-800 text-[11px]">
                    <span>{getScore(s).toLocaleString()}</span>
                    <Diamond className="w-3 h-3 text-cyan-500" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
