'use client';

import React, { useEffect, useState } from 'react';
import { useStreamStore } from '../store/useStreamStore';
import { getSocket } from '../lib/socket';
import { Swords, Trophy, Crown, Flame, Shield, ArrowLeftRight, Clock, AlertCircle, Users, User, CheckCircle2 } from 'lucide-react';

export function BattlesTab() {
  const { selectedStreamer } = useStreamStore();
  const [battles, setBattles] = useState<any[]>([]);
  const [activeBattleLive, setActiveBattleLive] = useState<any | null>(null);
  const [selectedBattle, setSelectedBattle] = useState<any | null>(null);
  const [battleMode, setBattleMode] = useState<'1v1' | '2v2'>('1v1');

  // Fetch real battle history from API
  useEffect(() => {
    const fetchBattles = async () => {
      try {
        const res = await fetch('/api/battles?limit=20');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setBattles(data.data);
          const inProgress = data.data.find((b: any) => b.status === 'IN_PROGRESS');
          if (inProgress && !activeBattleLive) {
            setActiveBattleLive(inProgress);
            if (inProgress.battleType === '2v2') setBattleMode('2v2');
          }
          if (data.data.length > 0 && !selectedBattle) {
            setSelectedBattle(inProgress || data.data[0]);
            if ((inProgress || data.data[0]).battleType === '2v2') setBattleMode('2v2');
          }
        }
      } catch (err) {
        console.error('Failed to fetch battles:', err);
      }
    };

    fetchBattles();
    const interval = setInterval(fetchBattles, 4000);
    return () => clearInterval(interval);
  }, [activeBattleLive, selectedBattle]);

  // Listen to live battle events via Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const onBattleStart = (data: any) => {
      const is2v2 = data.battleType === '2v2' || data.type === '2v2' || data.teams?.[0]?.hosts?.length > 1;
      if (is2v2) setBattleMode('2v2');
      setActiveBattleLive({
        battleId: data.battleId || String(Date.now()),
        status: 'IN_PROGRESS',
        battleType: is2v2 ? '2v2' : '1v1',
        startedAt: new Date().toISOString(),
        teamAScore: 0,
        teamBScore: 0,
        teams: data.teams || [],
      });
    };

    const onBattleUpdate = (data: any) => {
      setActiveBattleLive((prev: any) => {
        if (!prev) {
          const is2v2 = data.battleType === '2v2' || data.type === '2v2' || data.teams?.[0]?.hosts?.length > 1;
          if (is2v2) setBattleMode('2v2');
          return {
            battleId: data.battleId || 'live-battle',
            status: 'IN_PROGRESS',
            battleType: is2v2 ? '2v2' : '1v1',
            teamAScore: data.teams?.find((t: any) => t.teamId === 'TEAM_A')?.score || 0,
            teamBScore: data.teams?.find((t: any) => t.teamId === 'TEAM_B')?.score || 0,
            teams: data.teams || [],
          };
        }
        const teamA = data.teams?.find((t: any) => t.teamId === 'TEAM_A');
        const teamB = data.teams?.find((t: any) => t.teamId === 'TEAM_B');
        return {
          ...prev,
          teamAScore: teamA ? teamA.score : prev.teamAScore,
          teamBScore: teamB ? teamB.score : prev.teamBScore,
          teams: data.teams || prev.teams || [],
        };
      });
    };

    const onBattleEnd = (data: any) => {
      setActiveBattleLive((prev: any) => (prev ? { ...prev, status: 'FINISHED', winningTeamId: data.winningTeamId } : null));
      fetch('/api/battles?limit=20')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data) setBattles(d.data);
        })
        .catch(() => {});
    };

    socket.on('battle:start', onBattleStart);
    socket.on('battle:update', onBattleUpdate);
    socket.on('battle:armies', onBattleUpdate);
    socket.on('battle:end', onBattleEnd);

    return () => {
      socket.off('battle:start', onBattleStart);
      socket.off('battle:update', onBattleUpdate);
      socket.off('battle:armies', onBattleUpdate);
      socket.off('battle:end', onBattleEnd);
    };
  }, []);

  const currentBattle = activeBattleLive || (selectedBattle?.status === 'IN_PROGRESS' ? selectedBattle : selectedBattle);

  const teamAScore = Number(
    currentBattle?.teamAScore ??
    currentBattle?.hostScore ??
    selectedBattle?.participants?.find((p: any) => p.teamId === 'TEAM_A')?.score ??
    0
  );

  const teamBScore = Number(
    currentBattle?.teamBScore ??
    currentBattle?.rivalScore ??
    selectedBattle?.participants?.find((p: any) => p.teamId === 'TEAM_B')?.score ??
    0
  );

  const totalScore = teamAScore + teamBScore;
  const teamAPercent = totalScore > 0 ? Math.round((teamAScore / totalScore) * 100) : 50;
  const teamBPercent = totalScore > 0 ? 100 - teamAPercent : 50;

  const isLiveClash = currentBattle && currentBattle.status === 'IN_PROGRESS';

  // Team A & B data extraction
  const teamAData = currentBattle?.teams?.find((t: any) => t.teamId === 'TEAM_A');
  const teamBData = currentBattle?.teams?.find((t: any) => t.teamId === 'TEAM_B');

  const teamAHosts = teamAData?.hosts || [];
  const teamBHosts = teamBData?.hosts || [];

  // Team A Streamers
  const host1 = teamAHosts[0] || {
    uniqueId: selectedStreamer?.username || 'mohra.2000',
    nickname: selectedStreamer?.displayName || 'المهرة',
    avatarUrl: selectedStreamer?.profileImage,
    score: teamAScore,
  };

  const host2 = teamAHosts[1] || {
    uniqueId: 'ally.cohost',
    nickname: 'شريك المضيف',
    avatarUrl: null,
    score: Math.floor(teamAScore * 0.4),
  };

  // Team B Streamers
  const rival1 = teamBHosts[0] || {
    uniqueId: currentBattle?.rivalUsername || selectedBattle?.participants?.find((p: any) => p.teamId === 'TEAM_B')?.uniqueId || 'carolinamassoud',
    nickname: currentBattle?.rivalNickname || 'Carolina Massoud',
    avatarUrl: currentBattle?.rivalImage || selectedBattle?.participants?.find((p: any) => p.teamId === 'TEAM_B')?.avatarUrl,
    score: teamBScore,
  };

  const rival2 = teamBHosts[1] || {
    uniqueId: 'rival.partner',
    nickname: 'شريك المنافس',
    avatarUrl: null,
    score: Math.floor(teamBScore * 0.45),
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Active Battle Arena Card */}
      <div className="bg-gradient-to-b from-[#0f172a] via-[#1a233b] to-[#0a0f1d] rounded-2xl border border-slate-700/60 p-6 text-white shadow-xl relative overflow-hidden">
        {/* Arena Spotlights FX */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute -top-20 left-1/4 w-48 h-96 bg-gradient-to-b from-cyan-400/40 via-blue-500/10 to-transparent rotate-12 blur-xl" />
          <div className="absolute -top-20 right-1/4 w-48 h-96 bg-gradient-to-b from-rose-500/40 via-purple-500/10 to-transparent -rotate-12 blur-xl" />
        </div>

        {/* Header Bar */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-700/60 mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isLiveClash ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-cyan-400'}`}>
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                ميدان معارك التحدي اللحظي (PK Arena)
                {currentBattle && (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30">
                    جولة #{String(currentBattle.battleId).substring(0, 10)}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {isLiveClash
                  ? 'جولة التحدي جارية الآن — يتم احتساب النقاط ورصد الداعمين لحظياً وبدقة فائقة'
                  : 'استعراض ورصد معارك وجولات البث النشطة والسابقة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 1vs1 vs 2vs2 Switcher */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setBattleMode('1v1')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  battleMode === '1v1'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>1vs1 فردي</span>
              </button>
              <button
                onClick={() => setBattleMode('2v2')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  battleMode === '2v2'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>2vs2 جماعي</span>
              </button>
            </div>

            <span
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold border flex items-center gap-2 ${
                isLiveClash
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {isLiveClash && <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />}
              {isLiveClash ? 'معركة مباشرة الآن (PK LIVE)' : 'بانتظار انطلاق جولة'}
            </span>
          </div>
        </div>

        {/* Versus Teams Grid: Team A Box vs Team B Box */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Animated VS Badge in Center */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-600 p-0.5 shadow-xl shadow-amber-500/30">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-amber-700 to-yellow-900 flex items-center justify-center font-black text-amber-200 text-sm">
              VS
            </div>
          </div>

          {/* BOX 1: Team A (الفريق الأزرق - فريق المضيف) */}
          <div className="bg-gradient-to-b from-blue-950/40 to-slate-900/80 border-2 border-blue-500/40 rounded-2xl p-5 text-center relative overflow-hidden shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black text-cyan-300 tracking-wide">
                  الفريق الأزرق — {battleMode === '2v2' ? 'فريق المضيف (2 ستريمر)' : 'المضيف'}
                </span>
              </div>

              {/* Streamers in Team A */}
              {battleMode === '1v1' ? (
                /* 1 Streamer */
                <div className="flex flex-col items-center gap-2 mb-4">
                  <div className="relative">
                    {host1.avatarUrl ? (
                      <img
                        src={host1.avatarUrl}
                        alt=""
                        className="w-18 h-18 rounded-full object-cover border-2 border-cyan-400 shadow-lg shadow-cyan-500/30 bg-slate-800"
                      />
                    ) : (
                      <div className="w-18 h-18 rounded-full bg-blue-900 border-2 border-cyan-400 flex items-center justify-center text-2xl font-black text-cyan-200 shadow-md">
                        {host1.uniqueId?.[0]?.toUpperCase() || 'M'}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white border border-blue-400">
                      المضيف
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">@{host1.uniqueId}</div>
                    {host1.nickname && <div className="text-xs text-cyan-300/80 font-medium">{host1.nickname}</div>}
                  </div>
                </div>
              ) : (
                /* 2 Streamers in Team A Box */
                <div className="grid grid-cols-2 gap-3 mb-4 p-2 bg-blue-950/50 rounded-xl border border-blue-500/20">
                  {/* Host 1 */}
                  <div className="flex flex-col items-center p-2 rounded-lg bg-blue-900/30">
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-400 overflow-hidden bg-slate-800 mb-1 shadow">
                      {host1.avatarUrl ? (
                        <img src={host1.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-700 flex items-center justify-center text-sm font-bold">
                          {host1.uniqueId?.[0]?.toUpperCase() || 'M'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white truncate max-w-[100px]">@{host1.uniqueId}</span>
                    <span className="text-[10px] text-cyan-300 font-semibold">{host1.nickname || 'المضيف'}</span>
                  </div>

                  {/* Host 2 (Co-Host) */}
                  <div className="flex flex-col items-center p-2 rounded-lg bg-blue-900/30">
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-300 overflow-hidden bg-slate-800 mb-1 shadow">
                      {host2.avatarUrl ? (
                        <img src={host2.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-indigo-700 flex items-center justify-center text-sm font-bold">
                          {host2.uniqueId?.[0]?.toUpperCase() || 'A'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white truncate max-w-[100px]">@{host2.uniqueId}</span>
                    <span className="text-[10px] text-cyan-300 font-semibold">{host2.nickname || 'الزميل'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Score */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-blue-500/30 my-2">
              <div className="text-4xl font-black text-white font-mono tracking-tight drop-shadow">
                {teamAScore.toLocaleString()}
              </div>
              <p className="text-xs text-cyan-300 font-bold mt-1">النقاط اللحظية المسجلة للفريق</p>
            </div>
          </div>

          {/* BOX 2: Team B (الفريق الأحمر - فريق المنافس) */}
          <div className="bg-gradient-to-b from-rose-950/40 to-slate-900/80 border-2 border-rose-500/40 rounded-2xl p-5 text-center relative overflow-hidden shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-black text-rose-300 tracking-wide">
                  الفريق الأحمر — {battleMode === '2v2' ? 'فريق المنافس (2 ستريمر)' : 'المنافس'}
                </span>
              </div>

              {/* Streamers in Team B */}
              {battleMode === '1v1' ? (
                /* 1 Streamer */
                <div className="flex flex-col items-center gap-2 mb-4">
                  <div className="relative">
                    {rival1.avatarUrl ? (
                      <img
                        src={rival1.avatarUrl}
                        alt=""
                        className="w-18 h-18 rounded-full object-cover border-2 border-rose-400 shadow-lg shadow-rose-500/30 bg-slate-800"
                      />
                    ) : (
                      <div className="w-18 h-18 rounded-full bg-rose-900 border-2 border-rose-400 flex items-center justify-center text-2xl font-black text-rose-200 shadow-md">
                        {rival1.uniqueId?.[0]?.toUpperCase() || 'R'}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -left-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white border border-rose-400">
                      المنافس
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">@{rival1.uniqueId}</div>
                    {rival1.nickname && <div className="text-xs text-rose-300/80 font-medium">{rival1.nickname}</div>}
                  </div>
                </div>
              ) : (
                /* 2 Streamers in Team B Box */
                <div className="grid grid-cols-2 gap-3 mb-4 p-2 bg-rose-950/50 rounded-xl border border-rose-500/20">
                  {/* Rival 1 */}
                  <div className="flex flex-col items-center p-2 rounded-lg bg-rose-900/30">
                    <div className="w-12 h-12 rounded-full border-2 border-rose-400 overflow-hidden bg-slate-800 mb-1 shadow">
                      {rival1.avatarUrl ? (
                        <img src={rival1.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-rose-700 flex items-center justify-center text-sm font-bold">
                          {rival1.uniqueId?.[0]?.toUpperCase() || 'R'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white truncate max-w-[100px]">@{rival1.uniqueId}</span>
                    <span className="text-[10px] text-rose-300 font-semibold">{rival1.nickname || 'المنافس 1'}</span>
                  </div>

                  {/* Rival 2 */}
                  <div className="flex flex-col items-center p-2 rounded-lg bg-rose-900/30">
                    <div className="w-12 h-12 rounded-full border-2 border-rose-300 overflow-hidden bg-slate-800 mb-1 shadow">
                      {rival2.avatarUrl ? (
                        <img src={rival2.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-red-700 flex items-center justify-center text-sm font-bold">
                          {rival2.uniqueId?.[0]?.toUpperCase() || 'R'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white truncate max-w-[100px]">@{rival2.uniqueId}</span>
                    <span className="text-[10px] text-rose-300 font-semibold">{rival2.nickname || 'المنافس 2'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Score */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-rose-500/30 my-2">
              <div className="text-4xl font-black text-white font-mono tracking-tight drop-shadow">
                {teamBScore.toLocaleString()}
              </div>
              <p className="text-xs text-rose-300 font-bold mt-1">نقاط الخصم اللحظية</p>
            </div>
          </div>
        </div>

        {/* Score Progress Bar */}
        <div className="relative z-10 mt-6 space-y-2">
          <div className="flex justify-between text-xs font-mono font-bold">
            <span className="text-cyan-400">{totalScore > 0 ? `${teamAPercent}% نقاط الفريق الأزرق` : '0%'}</span>
            <span className="text-rose-400">{totalScore > 0 ? `${teamBPercent}% نقاط الفريق الأحمر` : '0%'}</span>
          </div>
          <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-700">
            {totalScore > 0 ? (
              <>
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${teamAPercent}%` }}
                />
                <div
                  className="h-full bg-gradient-to-l from-rose-600 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${teamBPercent}%` }}
                />
              </>
            ) : (
              <div className="w-full h-full bg-slate-700/50 rounded-full flex items-center justify-center text-[10px] text-slate-400">
                في انتظار انطلاق التحدي واحتساب النقاط
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Battle History Table — Luminous Clean Style */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              سجل الجولات وتاريخ المعارك السابقة
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              نتائج الجولات السابقة والسكورات المسجلة لكل معركة
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
            {battles.length} جولات مسجلة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold">
                <th className="py-3 px-3">رقم الجولة</th>
                <th className="py-3 px-3">نوع الجولة</th>
                <th className="py-3 px-3">الحالة</th>
                <th className="py-3 px-3 text-center">المدة</th>
                <th className="py-3 px-3">الفائز</th>
                <th className="py-3 px-3">تاريخ البدء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {battles.length > 0 ? (
                battles.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setSelectedBattle(b)}
                    className={`cursor-pointer hover:bg-blue-50/40 transition-colors ${
                      selectedBattle?.id === b.id ? 'bg-blue-50/70 font-bold' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-sans font-bold text-slate-800">
                      #{String(b.battleId || b.id).substring(0, 10)}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {b.battleType === '2v2' ? '2vs2 جماعي' : '1vs1 فردي'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'IN_PROGRESS'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {b.status === 'IN_PROGRESS' ? 'جارية الآن' : 'مكتملة'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">
                      {b.durationSeconds ? `${Math.floor(b.durationSeconds / 60)}:${String(b.durationSeconds % 60).padStart(2, '0')}` : '5:00'}
                    </td>
                    <td className="py-3 px-3 font-sans font-bold">
                      {b.winningTeamId === 'TEAM_A' ? (
                        <span className="text-blue-600 flex items-center gap-1">
                          <Crown className="w-3 h-3" /> الفريق الأزرق
                        </span>
                      ) : b.winningTeamId === 'TEAM_B' ? (
                        <span className="text-rose-600 flex items-center gap-1">
                          <Crown className="w-3 h-3" /> الفريق الأحمر
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] font-sans">
                      {b.startedAt ? new Date(b.startedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans text-xs">
                    لا توجد معارك سابقة مسجلة. تبدأ المعارك آلياً عند بدء التحدي في TikTok LIVE.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
