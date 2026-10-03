'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, Flame, Zap } from 'lucide-react';

interface BattleMomentumProps {
  teamAScore: number;
  teamBScore: number;
  battleId?: string;
}

export function BattleMomentum({ teamAScore, teamBScore, battleId }: BattleMomentumProps) {
  const prevScoresRef = useRef({ teamAScore, teamBScore, battleId });
  const [teamADelta, setTeamADelta] = useState<number>(0);
  const [teamBDelta, setTeamBDelta] = useState<number>(0);
  const [recentDeltas, setRecentDeltas] = useState<Array<{ side: 'A' | 'B'; delta: number; time: string }>>([]);

  useEffect(() => {
    const prev = prevScoresRef.current;

    // Reset if new battle
    if (battleId && prev.battleId && battleId !== prev.battleId) {
      prevScoresRef.current = { teamAScore, teamBScore, battleId };
      setTeamADelta(0);
      setTeamBDelta(0);
      setRecentDeltas([]);
      return;
    }

    const deltaA = teamAScore > prev.teamAScore ? teamAScore - prev.teamAScore : 0;
    const deltaB = teamBScore > prev.teamBScore ? teamBScore - prev.teamBScore : 0;

    if (deltaA > 0 || deltaB > 0) {
      if (deltaA > 0) setTeamADelta(deltaA);
      if (deltaB > 0) setTeamBDelta(deltaB);

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      setRecentDeltas((prev) => [
        ...(deltaA > 0 ? [{ side: 'A' as const, delta: deltaA, time: timeStr }] : []),
        ...(deltaB > 0 ? [{ side: 'B' as const, delta: deltaB, time: timeStr }] : []),
        ...prev,
      ].slice(0, 5));
    }

    prevScoresRef.current = { teamAScore, teamBScore, battleId };
  }, [teamAScore, teamBScore, battleId]);

  return (
    <div className="w-full bg-[#101625] border border-white/[0.08] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Flame className="w-3.5 h-3.5" />
        </div>
        <span className="font-bold text-slate-200">زخم المعركة اللحظي (Battle Momentum):</span>
      </div>

      {/* Real Deltas Display */}
      <div className="flex items-center gap-4">
        {/* Team A Momentum */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-cyan-400 font-bold">الفريق الأزرق:</span>
          <span
            dir="ltr"
            className={`font-mono font-black px-2 py-0.5 rounded tabular-nums ${
              teamADelta > 0
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-white/[0.03] text-slate-400'
            }`}
          >
            {teamADelta > 0 ? `+${teamADelta.toLocaleString()}` : '+0'}
          </span>
        </div>

        <span className="text-slate-600 font-mono">|</span>

        {/* Team B Momentum */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-rose-400 font-bold">الفريق الأحمر:</span>
          <span
            dir="ltr"
            className={`font-mono font-black px-2 py-0.5 rounded tabular-nums ${
              teamBDelta > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-white/[0.03] text-slate-400'
            }`}
          >
            {teamBDelta > 0 ? `+${teamBDelta.toLocaleString()}` : '+0'}
          </span>
        </div>
      </div>

      {/* Real Recent Pulse Activity */}
      <div className="hidden lg:flex items-center gap-2 overflow-hidden text-[10px] font-mono">
        <span className="text-slate-500">آخر حركات الدعم:</span>
        {recentDeltas.length > 0 ? (
          recentDeltas.slice(0, 3).map((item, i) => (
            <span
              key={i}
              dir="ltr"
              className={`px-1.5 py-0.5 rounded ${
                item.side === 'A' ? 'text-cyan-300 bg-cyan-950/40' : 'text-rose-300 bg-rose-950/40'
              }`}
            >
              {item.side === 'A' ? 'TEAM A' : 'TEAM B'} +{item.delta.toLocaleString()}
            </span>
          ))
        ) : (
          <span className="text-slate-600">بانتظار تدفق النقاط...</span>
        )}
      </div>
    </div>
  );
}
