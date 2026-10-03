'use client';

import React from 'react';
import { Crown } from 'lucide-react';

interface ContributorItem {
  userId?: string;
  uniqueId?: string;
  nickname?: string;
  avatarUrl?: string;
  score?: number;
  rank?: number;
}

interface BattleContributorsProps {
  contributors: ContributorItem[];
  teamSide: 'A' | 'B';
}

export function BattleContributors({ contributors, teamSide }: BattleContributorsProps) {
  const isTeamA = teamSide === 'A';
  const accentColor = isTeamA ? 'text-cyan-400' : 'text-rose-400';
  const badgeBorder = isTeamA ? 'border-blue-500/30' : 'border-rose-500/30';

  if (!contributors || contributors.length === 0) {
    return (
      <div className="text-[10px] text-slate-500 py-1 font-mono">
        في انتظار مساهمات الداعمين الأولى للجولة...
      </div>
    );
  }

  const rankColors = [
    'bg-amber-400 text-slate-950', // 1st Gold
    'bg-slate-300 text-slate-950', // 2nd Silver
    'bg-amber-600 text-white',     // 3rd Bronze
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1">
      {contributors.slice(0, 3).map((c, idx) => (
        <div
          key={c.userId || idx}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg bg-[#0A0F1D] border ${badgeBorder} text-xs shrink-0`}
        >
          <div className="relative w-6 h-6 rounded-full overflow-hidden bg-slate-800 shrink-0">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full ${isTeamA ? 'bg-blue-600' : 'bg-rose-600'} text-white flex items-center justify-center text-[9px] font-bold`}>
                {(c.nickname || c.uniqueId || '?')[0]}
              </div>
            )}
            <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full text-[8px] font-mono font-black flex items-center justify-center shadow ${rankColors[idx] || 'bg-slate-600'}`}>
              {idx + 1}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-200 truncate max-w-[80px]">
              {c.nickname || c.uniqueId}
            </div>
            <div className={`text-[9px] font-mono font-black ${accentColor} tabular-nums`}>
              {Number(c.score || 0).toLocaleString()} نقطة
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
