'use client';

import React from 'react';

interface PowerUpItemProps {
  code: string;
  nameAr: string;
  icon: string;
  remainingCount: number;
  totalAcquired: number;
  totalUsed: number;
  isRecent: boolean;
}

export function PowerUpItem({
  code,
  nameAr,
  icon,
  remainingCount,
  totalAcquired,
  totalUsed,
  isRecent,
}: PowerUpItemProps) {
  const percentUsed = totalAcquired > 0 ? Math.min(100, Math.round((totalUsed / totalAcquired) * 100)) : 0;
  const percentRemaining = 100 - percentUsed;

  return (
    <div
      className={`p-3 rounded-xl bg-[#070A12] border transition-all ${
        isRecent
          ? 'border-cyan-400 bg-cyan-950/20 shadow-md shadow-cyan-500/20 scale-[1.01]'
          : 'border-white/[0.06] hover:border-white/20'
      } flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#101625] border border-white/[0.08] flex items-center justify-center text-base shrink-0 shadow-inner">
            {icon}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">{nameAr}</div>
            <div className="text-[10px] text-slate-500 font-mono">{code}</div>
          </div>
        </div>

        {/* Remaining Count Badge */}
        <div className="text-left shrink-0">
          <div className="text-base font-black text-cyan-400 font-mono tabular-nums leading-none">
            {remainingCount}
          </div>
          <div className="text-[9px] text-slate-500 font-medium mt-0.5">المتوفر بالخزينة</div>
        </div>
      </div>

      {/* Progress Bar of Remaining / Used */}
      <div className="space-y-1">
        <div className="w-full h-1.5 rounded-full bg-slate-900 border border-white/[0.04] overflow-hidden flex">
          <div
            style={{ width: `${percentRemaining}%` }}
            className="h-full bg-cyan-500 transition-all duration-300"
          />
          <div
            style={{ width: `${percentUsed}%` }}
            className="h-full bg-slate-700 transition-all duration-300"
          />
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 tabular-nums">
          <span>مكتسب: {totalAcquired}</span>
          <span>مستخدم: {totalUsed}</span>
        </div>
      </div>
    </div>
  );
}
