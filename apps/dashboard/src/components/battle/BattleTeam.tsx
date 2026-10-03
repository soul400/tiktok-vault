'use client';

import React from 'react';
import { Crown, Zap, Trophy } from 'lucide-react';
import { BattlePlayer } from './BattlePlayer';
import { BattleContributors } from './BattleContributors';

interface BattleTeamProps {
  teamSide: 'A' | 'B';
  teamName: string;
  teamSubtitle: string;
  battleMode: '1v1' | '2v2';
  totalScore: number;
  percentage: number;
  isLeading: boolean;
  player1: any;
  player2?: any;
  contributors: any[];
}

export function BattleTeam({
  teamSide,
  teamName,
  teamSubtitle,
  battleMode,
  totalScore,
  percentage,
  isLeading,
  player1,
  player2,
  contributors,
}: BattleTeamProps) {
  const isTeamA = teamSide === 'A';

  const cardBorder = isTeamA
    ? isLeading
      ? 'border-blue-500/60 shadow-lg shadow-blue-500/10'
      : 'border-blue-500/30'
    : isLeading
      ? 'border-rose-500/60 shadow-lg shadow-rose-500/10'
      : 'border-rose-500/30';

  const accentColor = isTeamA ? 'text-cyan-400' : 'text-rose-400';
  const badgeBg = isTeamA
    ? 'bg-blue-500/20 text-cyan-300 border-blue-500/40'
    : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

  return (
    <div
      className={`relative rounded-xl bg-[#101625] border ${cardBorder} p-4 flex flex-col justify-between transition-all`}
    >
      {/* 1. Team Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg ${isTeamA ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30' : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'} flex items-center justify-center`}>
            <Crown className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black tracking-wide ${accentColor} uppercase font-mono`}>
                {teamName}
              </span>
              {isLeading && (
                <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Trophy className="w-2.5 h-2.5" />
                  <span>متصدر الجولة</span>
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {teamSubtitle}
            </div>
          </div>
        </div>

        {/* Possession % Badge */}
        <div className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black border tabular-nums ${badgeBg}`}>
          {percentage}%
        </div>
      </div>

      {/* 2. Players Stack (Vertical Stack for 2v2) */}
      <div className="space-y-2 mb-3">
        {/* Player 1 */}
        <BattlePlayer
          player={player1}
          roleBadge={isTeamA ? 'قائد الفريق' : 'المنافس الرئيسي'}
          roleType={isTeamA ? 'host' : 'rival'}
          teamSide={teamSide}
          orderIndex={1}
        />

        {/* Player 2 (If 2v2 mode or present) */}
        {battleMode === '2v2' && (
          <BattlePlayer
            player={player2}
            roleBadge={isTeamA ? 'شريك المضيف' : 'شريك المنافس'}
            roleType={isTeamA ? 'partner' : 'rival_partner'}
            teamSide={teamSide}
            orderIndex={2}
          />
        )}
      </div>

      {/* 3. Team Total Score (Largest Number) */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#070A12] border border-white/[0.08] shadow-inner mb-3">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${accentColor}`} />
          <span className="text-xs font-bold text-slate-300">
            {isTeamA ? 'مجموع سكور الفريق الأزرق:' : 'مجموع سكور الفريق الأحمر:'}
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums leading-none tracking-tight">
          {totalScore.toLocaleString()}
        </div>
      </div>

      {/* 4. Top Contributors Row */}
      <div className="pt-2.5 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Crown className="w-3 h-3 text-amber-400" />
            <span>أبرز الداعمين:</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {contributors?.length > 0 ? `${contributors.length} داعمين` : ''}
          </span>
        </div>
        <BattleContributors contributors={contributors} teamSide={teamSide} />
      </div>
    </div>
  );
}
