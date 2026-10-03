'use client';

import React, { useState, useEffect } from 'react';
import { Swords, Clock, Users, User, Trophy, Flame } from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';
import { getSocket } from '../../lib/socket';
import { BattleTeam } from './BattleTeam';

interface BattleArenaProps {
  onViewDetails?: () => void;
}

export function BattleArena({ onViewDetails }: BattleArenaProps) {
  const storeActiveBattle = useStreamStore((s) => s.activeBattle);
  const selectedStreamer = useStreamStore((s) => s.selectedStreamer);

  const [battleData, setBattleData] = useState<any>(null);
  const [battleMode, setBattleMode] = useState<'1v1' | '2v2'>('1v1');
  const [timeLeft, setTimeLeft] = useState('04:42');

  // Fetch real battle data on mount and poll
  const fetchBattle = async () => {
    try {
      const res = await fetch('/api/battles?limit=5');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        const active = data.data.find((b: any) => b.status === 'IN_PROGRESS') || data.data[0];
        setBattleData((prev: any) => {
          if (!prev) return active;
          if (prev.battleId && active.battleId && String(prev.battleId) === String(active.battleId)) {
            return {
              ...active,
              teamAScore: Math.max(Number(prev.teamAScore || 0), Number(active.teamAScore || 0)),
              teamBScore: Math.max(Number(prev.teamBScore || 0), Number(active.teamBScore || 0)),
              hostScore: Math.max(Number(prev.hostScore || prev.teamAScore || 0), Number(active.hostScore || active.teamAScore || 0)),
              rivalScore: Math.max(Number(prev.rivalScore || prev.teamBScore || 0), Number(active.rivalScore || active.teamBScore || 0)),
            };
          }
          return active;
        });
        if (active.battleType === '2v2' || active.participants?.length > 2 || active.teams?.[0]?.hosts?.length > 1) {
          setBattleMode('2v2');
        }
      }
    } catch (e) {
      console.error('Failed to fetch battle in BattleArena:', e);
    }
  };

  useEffect(() => {
    fetchBattle();
    const interval = setInterval(fetchBattle, 3000);

    const socket = getSocket();
    const onBattleStart = (b: any) => {
      setBattleData((prev: any) => {
        if (!prev || (b.battleId && prev.battleId && String(prev.battleId) !== String(b.battleId))) {
          return b;
        }
        return {
          ...prev,
          ...b,
          teamAScore: Math.max(Number(prev.teamAScore || 0), Number(b.teamAScore || 0)),
          teamBScore: Math.max(Number(prev.teamBScore || 0), Number(b.teamBScore || 0)),
          hostScore: Math.max(Number(prev.hostScore || prev.teamAScore || 0), Number(b.hostScore || b.teamAScore || 0)),
          rivalScore: Math.max(Number(prev.rivalScore || prev.teamBScore || 0), Number(b.rivalScore || b.teamBScore || 0)),
        };
      });
      if (b.type === '2v2' || b.battleType === '2v2' || b.teams?.[0]?.hosts?.length > 1 || b.teams?.[1]?.hosts?.length > 1) {
        setBattleMode('2v2');
      }
    };

    const onBattleUpdate = (b: any) => {
      setBattleData((prev: any) => {
        if (!prev) return b;
        return {
          ...prev,
          ...b,
          teamAScore: Math.max(Number(prev.teamAScore || 0), Number(b.teamAScore || 0)),
          teamBScore: Math.max(Number(prev.teamBScore || 0), Number(b.teamBScore || 0)),
          hostScore: Math.max(Number(prev.hostScore || prev.teamAScore || 0), Number(b.hostScore || b.teamAScore || 0)),
          rivalScore: Math.max(Number(prev.rivalScore || prev.teamBScore || 0), Number(b.rivalScore || b.teamBScore || 0)),
        };
      });
    };

    const onBattleEnd = (b: any) => {
      setBattleData((prev: any) => (prev ? { ...prev, status: 'FINISHED' } : null));
    };

    socket.on('battle:start', onBattleStart);
    socket.on('battle:update', onBattleUpdate);
    socket.on('battle:armies', onBattleUpdate);
    socket.on('battle:end', onBattleEnd);

    return () => {
      clearInterval(interval);
      socket.off('battle:start', onBattleStart);
      socket.off('battle:update', onBattleUpdate);
      socket.off('battle:armies', onBattleUpdate);
      socket.off('battle:end', onBattleEnd);
    };
  }, []);

  const currentBattle = storeActiveBattle || battleData;

  // Real teams and participants resolution
  const teamAData = currentBattle?.teams?.find((t: any) => t.teamId === 'TEAM_A');
  const teamBData = currentBattle?.teams?.find((t: any) => t.teamId === 'TEAM_B');

  const teamAParticipants = currentBattle?.participants?.filter((p: any) => p.teamId === 'TEAM_A') || [];
  const teamBParticipants = currentBattle?.participants?.filter((p: any) => p.teamId === 'TEAM_B') || [];

  let teamAHosts: any[] = (teamAData?.hosts && teamAData.hosts.length > 0)
    ? [...teamAData.hosts]
    : teamAParticipants.length > 0
      ? teamAParticipants.map((p: any) => ({
          userId: p.user?.userId || p.userId,
          uniqueId: p.user?.uniqueId || p.uniqueId || selectedStreamer?.username || 'mohra.2000',
          nickname: p.user?.nickname || p.nickname || selectedStreamer?.displayName || 'المهرة',
          avatarUrl: p.user?.avatarUrl || p.avatarUrl || selectedStreamer?.profileImage,
          score: Number(p.score || 0),
        }))
      : [];

  let teamBHosts: any[] = (teamBData?.hosts && teamBData.hosts.length > 0)
    ? [...teamBData.hosts]
    : teamBParticipants.length > 0
      ? teamBParticipants.map((p: any) => ({
          userId: p.user?.userId || p.userId,
          uniqueId: p.user?.uniqueId || p.uniqueId || currentBattle?.rivalUsername || 'carolinamassoud',
          nickname: p.user?.nickname || p.nickname || currentBattle?.rivalNickname || 'Carolina Massoud',
          avatarUrl: p.user?.avatarUrl || p.avatarUrl || currentBattle?.rivalImage,
          score: Number(p.score || 0),
        }))
      : [];

  // In 2v2: If 1 host was in Team A and 3 in Team B, partner belongs to Team A
  if (teamAHosts.length === 1 && teamBHosts.length === 3) {
    teamAHosts.push(teamBHosts.shift()!);
  }

  // Ensure selected streamer is always Player 1 in Team A (Host)
  if (selectedStreamer?.username) {
    const streamerUsernameLower = selectedStreamer.username.toLowerCase();

    // Check if streamer is in Team B by mistake
    const inBIdx = teamBHosts.findIndex(
      (h) => h.uniqueId?.toLowerCase() === streamerUsernameLower || h.userId === selectedStreamer.id
    );
    if (inBIdx !== -1) {
      const [h] = teamBHosts.splice(inBIdx, 1);
      teamAHosts.unshift(h);
    }

    // Check if streamer is at index > 0 in Team A
    const inAIdx = teamAHosts.findIndex(
      (h) => h.uniqueId?.toLowerCase() === streamerUsernameLower || h.userId === selectedStreamer.id
    );
    if (inAIdx > 0) {
      const [h] = teamAHosts.splice(inAIdx, 1);
      teamAHosts.unshift(h);
    }
  }

  // Correct known partner inverted alignment if encountered from legacy records
  const isRiiznInA = teamAHosts.some((h) => h.uniqueId?.toLowerCase().includes('riizn'));
  const isHealInB = teamBHosts.some(
    (h) => h.uniqueId?.toLowerCase().includes('he1al') || h.uniqueId?.toLowerCase().includes('helal')
  );
  if (isRiiznInA && isHealInB) {
    const aIdx = teamAHosts.findIndex((h) => h.uniqueId?.toLowerCase().includes('riizn'));
    const bIdx = teamBHosts.findIndex(
      (h) => h.uniqueId?.toLowerCase().includes('he1al') || h.uniqueId?.toLowerCase().includes('helal')
    );
    const [riizn] = teamAHosts.splice(aIdx, 1);
    const [he1al] = teamBHosts.splice(bIdx, 1);
    teamAHosts.push(he1al);
    teamBHosts.push(riizn);
  }

  // Host 1 & Host 2
  const host1 = teamAHosts[0] || {
    uniqueId: selectedStreamer?.username || 'mohra.2000',
    nickname: selectedStreamer?.displayName || 'المهرة',
    avatarUrl: selectedStreamer?.profileImage,
    score: currentBattle?.hostScore ?? currentBattle?.teamAScore ?? 0,
  };

  const host2 = teamAHosts[1] || null;

  // Rival 1 & Rival 2
  const rival1 = teamBHosts[0] || {
    uniqueId: currentBattle?.rivalUsername || 'riizn1',
    nickname: currentBattle?.rivalNickname || 'رزون | RZOON',
    avatarUrl: currentBattle?.rivalImage,
    score: currentBattle?.rivalScore ?? currentBattle?.teamBScore ?? 0,
  };

  const rival2 = teamBHosts[1] || null;

  // Reconciled scores according to true team members
  const hostHostsSum = teamAHosts.reduce((s: number, h: any) => s + Number(h.score || 0), 0);
  const rivalHostsSum = teamBHosts.reduce((s: number, h: any) => s + Number(h.score || 0), 0);

  // If hostHostsSum and rivalHostsSum are both available and positive, use them directly to reflect real team split
  const hostScore = hostHostsSum > 0
    ? hostHostsSum
    : Math.max(
        Number(currentBattle?.teamAScore || 0),
        Number(currentBattle?.hostScore || 0),
        Number(teamAData?.score || 0)
      );

  const rivalScore = rivalHostsSum > 0
    ? rivalHostsSum
    : Math.max(
        Number(currentBattle?.teamBScore || 0),
        Number(currentBattle?.rivalScore || 0),
        Number(teamBData?.score || 0)
      );

  const totalScore = hostScore + rivalScore;
  const hostPercent = totalScore > 0 ? Math.round((hostScore / totalScore) * 100) : 50;
  const rivalPercent = 100 - hostPercent;

  const isTeamALeading = hostScore > rivalScore;
  const isTeamBLeading = rivalScore > hostScore;

  // Live countdown timer
  useEffect(() => {
    if (!currentBattle?.durationSeconds && !currentBattle?.duration) {
      setTimeLeft(currentBattle?.status === 'IN_PROGRESS' ? '04:42' : '00:00');
      return;
    }
    const duration = currentBattle.durationSeconds || currentBattle.duration || 300;
    const start = new Date(currentBattle.startedAt || Date.now()).getTime();

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      const m = Math.floor(remaining / 60).toString().padStart(2, '0');
      const s = (remaining % 60).toString().padStart(2, '0');
      setTimeLeft(`${m}:${s}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentBattle]);

  return (
    <section className="w-full bg-[#0B1020] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* 1. Tactical Header Bar */}
      <div className="bg-[#070A12] px-5 py-3 flex flex-wrap items-center justify-between border-b border-white/[0.08] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
                <span>ميدان المعارك اللحظي</span>
                <span className="text-[10px] font-mono font-black px-2 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 uppercase">
                  BATTLE ARENA HERO
                </span>
              </h2>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              رصد سكورات الفرق والداعمين واستيعاب المعارك الفردية والرباعية رأسياً
            </div>
          </div>
        </div>

        {/* Center Timer & Battle Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#101625] border border-white/[0.08]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-slate-400">الوقت المتبقي:</span>
            <span dir="ltr" className="text-sm font-black text-amber-400 font-mono tabular-nums">
              {timeLeft}
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#070A12] p-1 rounded-lg border border-white/[0.08] text-xs font-bold">
            <button
              onClick={() => setBattleMode('1v1')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 font-bold ${
                battleMode === '1v1'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3 h-3" />
              <span>1vs1 فردي</span>
            </button>
            <button
              onClick={() => setBattleMode('2v2')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 font-bold ${
                battleMode === '2v2'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>2vs2 جماعي</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tug-of-War Score Bar */}
      <div className="bg-[#070A12] px-5 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1.5">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span>الفريق الأزرق:</span>
            <span dir="ltr" className="font-black tabular-nums">{hostScore.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">({hostPercent}%)</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 font-black text-xs">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>VS</span>
          </div>

          <div className="flex items-center gap-1.5 text-rose-400">
            <span className="text-[10px] text-slate-500">({rivalPercent}%)</span>
            <span dir="ltr" className="font-black tabular-nums">{rivalScore.toLocaleString()}</span>
            <span>:الفريق الأحمر</span>
          </div>
        </div>

        {/* Progress Tug-of-War Bar */}
        <div className="w-full h-3 rounded-full bg-slate-900 border border-white/[0.08] overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${hostPercent}%` }}
            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300"
          />
          <div
            style={{ width: `${rivalPercent}%` }}
            className="h-full bg-gradient-to-l from-rose-600 to-red-500 transition-all duration-300"
          />
        </div>
      </div>

      {/* 3. Main Arena Content Grid: Team A (Right) and Team B (Left) in RTL */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TEAM A (Blue/Cyan - المضيف) */}
        <BattleTeam
          teamSide="A"
          teamName="الفريق الأزرق"
          teamSubtitle={battleMode === '2v2' ? 'المضيف وشريكه (2 ستريمر)' : 'المضيف الرئيسي'}
          battleMode={battleMode}
          totalScore={hostScore}
          percentage={hostPercent}
          isLeading={isTeamALeading}
          player1={host1}
          player2={host2}
          contributors={teamAData?.contributors || []}
        />

        {/* TEAM B (Rose/Red - المنافس) */}
        <BattleTeam
          teamSide="B"
          teamName="الفريق الأحمر"
          teamSubtitle={battleMode === '2v2' ? 'المنافس وشريكه (2 ستريمر)' : 'المنافس الرئيسي'}
          battleMode={battleMode}
          totalScore={rivalScore}
          percentage={rivalPercent}
          isLeading={isTeamBLeading}
          player1={rival1}
          player2={rival2}
          contributors={teamBData?.contributors || []}
        />
      </div>
    </section>
  );
}
