'use client';

import React from 'react';
import { User, CheckCircle2 } from 'lucide-react';

interface BattlePlayerProps {
  player: {
    userId?: string;
    uniqueId?: string;
    nickname?: string;
    avatarUrl?: string;
    score?: number;
  } | null;
  roleBadge: string;
  roleType: 'host' | 'partner' | 'rival' | 'rival_partner';
  teamSide: 'A' | 'B';
  orderIndex: number;
}

export function BattlePlayer({ player, roleBadge, roleType, teamSide, orderIndex }: BattlePlayerProps) {
  const isTeamA = teamSide === 'A';

  if (!player) {
    return (
      <div className="p-2.5 rounded-lg border border-dashed border-white/10 bg-white/[0.02] flex items-center gap-3 opacity-60">
        <div className="w-10 h-10 rounded-full border border-dashed border-white/20 flex items-center justify-center text-slate-500">
          <User className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-400">{roleBadge}</div>
          <div className="text-[10px] text-slate-500 font-mono">في انتظار الانضمام</div>
        </div>
      </div>
    );
  }

  const ringColor = isTeamA ? 'ring-cyan-500/70' : 'ring-rose-500/70';
  const badgeBg = isTeamA
    ? 'bg-blue-500/20 text-cyan-300 border-cyan-500/30'
    : 'bg-rose-500/20 text-rose-300 border-rose-500/30';

  return (
    <div
      className={`p-2.5 rounded-lg bg-[#0D1322] border ${
        isTeamA ? 'border-blue-500/20 hover:border-cyan-500/40' : 'border-rose-500/20 hover:border-rose-500/40'
      } flex items-center justify-between gap-3 transition-colors shadow-sm`}
    >
      {/* Player Identity */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-full ring-2 ${ringColor} ring-offset-1 ring-offset-[#070A12] overflow-hidden bg-slate-800 flex items-center justify-center`}>
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full ${isTeamA ? 'bg-blue-600' : 'bg-rose-600'} text-white flex items-center justify-center font-bold text-xs`}>
                {player.uniqueId?.[0]?.toUpperCase() || 'P'}
              </div>
            )}
          </div>
          <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${
            isTeamA ? 'bg-cyan-400 text-slate-950' : 'bg-rose-500 text-white'
          } text-[9px] font-mono font-black flex items-center justify-center shadow`}>
            {orderIndex}
          </span>
        </div>

        <div className="min-w-0">
          <div dir="ltr" className="text-xs font-black text-slate-100 font-mono truncate flex items-center gap-1">
            <span>@{player.uniqueId || 'player'}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium truncate">
            {player.nickname || player.uniqueId || 'اللاعب'}
          </div>
          <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold border ${badgeBg}`}>
            {roleBadge}
          </span>
        </div>
      </div>

      {/* Individual Player Score */}
      {player.score !== undefined && (
        <div className="text-left shrink-0">
          <div className="text-sm font-black text-white font-mono tabular-nums leading-none">
            {Number(player.score).toLocaleString()}
          </div>
          <div className={`text-[9px] font-medium mt-0.5 ${isTeamA ? 'text-cyan-400/80' : 'text-rose-400/80'}`}>
            نقاط فردية
          </div>
        </div>
      )}
    </div>
  );
}
