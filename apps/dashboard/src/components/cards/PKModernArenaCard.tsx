'use client';

import React, { useState, useEffect } from 'react';
import { Swords, Crown, Clock, ArrowLeft, Users, User, Shield, Flame, Sparkles, CheckCircle2, UserPlus, Zap } from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';
import { getSocket } from '../../lib/socket';

interface PKModernArenaCardProps {
  onViewDetails?: () => void;
}

export function PKModernArenaCard({ onViewDetails }: PKModernArenaCardProps) {
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
      console.error('Failed to fetch battle:', e);
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
    uniqueId: currentBattle?.rivalUsername || 'carolinamassoud',
    nickname: currentBattle?.rivalNickname || 'Carolina Massoud',
    avatarUrl: currentBattle?.rivalImage,
    score: currentBattle?.rivalScore ?? currentBattle?.teamBScore ?? 0,
  };

  const rival2 = teamBHosts[1] || null;

  // Monotonic, fully reconciled scores
  const hostHostsSum = teamAHosts.reduce((s: number, h: any) => s + Number(h.score || 0), 0);
  const rivalHostsSum = teamBHosts.reduce((s: number, h: any) => s + Number(h.score || 0), 0);

  const hostScore = Math.max(
    Number(currentBattle?.teamAScore || 0),
    Number(currentBattle?.hostScore || 0),
    Number(teamAData?.score || 0),
    hostHostsSum,
    teamAParticipants.reduce((s: number, p: any) => s + Number(p.score || 0), 0)
  );

  const rivalScore = Math.max(
    Number(currentBattle?.teamBScore || 0),
    Number(currentBattle?.rivalScore || 0),
    Number(teamBData?.score || 0),
    rivalHostsSum,
    teamBParticipants.reduce((s: number, p: any) => s + Number(p.score || 0), 0)
  );

  const totalScore = hostScore + rivalScore;
  const hostPercent = totalScore > 0 ? Math.round((hostScore / totalScore) * 100) : 50;
  const rivalPercent = 100 - hostPercent;

  // Live countdown
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
    <div dir="rtl" className="w-full bg-[#0c1222] rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden flex flex-col transition-all">
      {/* 1. Ultra-Modern Header Bar */}
      <div className="bg-gradient-to-r from-[#0d162d] via-[#152347] to-[#0d162d] px-6 py-3.5 flex flex-wrap items-center justify-between text-white border-b border-blue-500/20 gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Swords className="w-4 h-4 drop-shadow" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>ميدان معارك التحدي اللحظي</span>
                <span className="text-cyan-400 text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30">
                  PK ARENA PRO
                </span>
              </h2>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              رصد دقيق للسكورات ومتابعة أداء الستريمرز والداعمين في الوقت الفعلي
            </p>
          </div>
        </div>

        {/* Controls: Mode Switcher & Details CTA */}
        <div className="flex items-center gap-3">
          {/* 1vs1 vs 2vs2 Mode Switcher */}
          <div className="flex items-center bg-[#070b14] p-1 rounded-xl border border-slate-700/80 text-xs font-bold shadow-inner">
            <button
              onClick={() => setBattleMode('1v1')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                battleMode === '1v1'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1vs1 فردي</span>
            </button>
            <button
              onClick={() => setBattleMode('2v2')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                battleMode === '2v2'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2vs2 جماعي</span>
            </button>
          </div>

          {/* Details CTA */}
          <button
            onClick={onViewDetails}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-black shadow-lg shadow-blue-600/20 transition-all"
          >
            <span>تفاصيل الجولة</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Stadium Arena Canvas */}
      <div className="relative bg-gradient-to-b from-[#090e1c] via-[#0d162d] to-[#060a14] p-6 text-white overflow-hidden">
        {/* Stadium Ambient FX */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute -top-16 left-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute -top-16 right-1/4 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl" />
        </div>

        {/* 2 Team Arena Podiums */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
          {/* TEAM A BOX: Blue Team (فريق المضيف) */}
          <div className="relative rounded-2xl bg-gradient-to-b from-blue-950/50 via-slate-900/80 to-[#071022] border-2 border-blue-500/40 p-5 shadow-2xl flex flex-col justify-between backdrop-blur-xl group hover:border-cyan-400/80 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-500/30 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-cyan-300">
                  <Crown className="w-4 h-4 fill-cyan-400/30" />
                </div>
                <div>
                  <span className="text-xs font-black text-cyan-300 tracking-wide uppercase">
                    الفريق الأزرق
                  </span>
                  <span className="text-[11px] text-blue-200/70 font-semibold mr-2">
                    {battleMode === '2v2' ? '— المضيف وشريكه (2 ستريمر)' : '— المضيف'}
                  </span>
                </div>
              </div>
              <div className="px-3 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 text-xs font-mono font-black border border-cyan-500/40 shadow-sm">
                {hostPercent}%
              </div>
            </div>

            {/* Streamers Content */}
            {battleMode === '1v1' ? (
              /* 1 Streamer View */
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full ring-3 ring-cyan-400 ring-offset-2 ring-offset-slate-950 overflow-hidden bg-slate-800 shadow-xl shadow-cyan-500/30 flex items-center justify-center">
                      {host1.avatarUrl ? (
                        <img src={host1.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-2xl font-black text-white">
                          {host1.uniqueId?.[0]?.toUpperCase() || 'M'}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-md text-[10px] bg-blue-600 text-white font-black border border-blue-400 shadow">
                      المضيف
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-black text-white flex items-center gap-1.5">
                      <span dir="ltr" className="font-mono text-cyan-100">@{host1.uniqueId}</span>
                      <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400 text-slate-900" />
                    </div>
                    <div className="text-xs text-blue-200/80 font-medium">{host1.nickname || 'المهرة'}</div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      متصل في المعركة
                    </div>
                  </div>
                </div>

                <div className="text-left">
                  <div className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-md">
                    {hostScore.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-cyan-300 font-bold mt-0.5">النقاط المسجلة</div>
                </div>
              </div>
            ) : (
              /* 2 Streamers View: Vertically Stacked (فوق بعض) */
              <div className="space-y-3">
                <div className="flex flex-col space-y-2.5">
                  {/* Host 1 (Top) */}
                  <div className="p-3 rounded-xl bg-blue-900/30 border border-blue-500/30 flex items-center justify-between gap-3 shadow-sm hover:border-cyan-400/50 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-900 overflow-hidden bg-slate-800 shrink-0 shadow flex items-center justify-center">
                          {host1.avatarUrl ? (
                            <img src={host1.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-sm text-white">
                              {host1.uniqueId?.[0]?.toUpperCase() || 'M'}
                            </div>
                          )}
                        </div>
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                          1
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div dir="ltr" className="text-xs font-black text-white truncate">@{host1.uniqueId}</div>
                        <div className="text-[11px] text-cyan-300 font-semibold truncate">{host1.nickname || 'المضيف'}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/40">
                          قائد الفريق
                        </span>
                      </div>
                    </div>
                    {host1.score !== undefined && (
                      <div className="text-left shrink-0">
                        <div className="text-sm font-black text-white font-mono">{Number(host1.score).toLocaleString()}</div>
                        <div className="text-[9px] text-cyan-300/80 font-medium">نقاط اللاعب</div>
                      </div>
                    )}
                  </div>

                  {/* Host 2 (Bottom) */}
                  {host2 ? (
                    <div className="p-3 rounded-xl bg-blue-900/30 border border-blue-500/30 flex items-center justify-between gap-3 shadow-sm hover:border-cyan-400/50 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full ring-2 ring-cyan-300 ring-offset-1 ring-offset-slate-900 overflow-hidden bg-slate-800 shrink-0 shadow flex items-center justify-center">
                            {host2.avatarUrl ? (
                              <img src={host2.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center font-bold text-sm text-white">
                                {host2.uniqueId?.[0]?.toUpperCase() || 'A'}
                              </div>
                            )}
                          </div>
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-400 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                            2
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div dir="ltr" className="text-xs font-black text-white truncate">@{host2.uniqueId}</div>
                          <div className="text-[11px] text-cyan-300 font-semibold truncate">{host2.nickname || 'شريك المضيف'}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                            شريك المضيف
                          </span>
                        </div>
                      </div>
                      {host2.score !== undefined && (
                        <div className="text-left shrink-0">
                          <div className="text-sm font-black text-white font-mono">{Number(host2.score).toLocaleString()}</div>
                          <div className="text-[9px] text-cyan-300/80 font-medium">نقاط اللاعب</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-blue-500/30 bg-blue-950/20 flex items-center gap-3 opacity-80">
                      <div className="w-12 h-12 rounded-full border border-dashed border-blue-400/50 flex items-center justify-center text-blue-400">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-300">شريك المضيف</div>
                        <div className="text-[10px] text-blue-300/70">في انتظار الانضمام</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Team Score */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/80 border border-blue-500/30 shadow-inner">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                    <span className="text-xs font-bold text-cyan-200">مجموع سكور الفريق الأزرق:</span>
                  </div>
                  <span className="text-3xl font-black text-white font-mono tracking-tight drop-shadow">
                    {hostScore.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Team A Top Contributors Row */}
            <div className="mt-4 pt-3 border-t border-blue-500/20">
              <div className="flex items-center justify-between text-[11px] mb-2 font-bold">
                <span className="text-cyan-300 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>أبرز داعمي الفريق الأزرق:</span>
                </span>
                <span className="text-[10px] text-blue-300/70 font-mono">
                  {teamAData?.contributors?.length > 0 ? `${teamAData.contributors.length} داعمين` : 'في انتظار الدعم'}
                </span>
              </div>

              {teamAData?.contributors?.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {teamAData.contributors.slice(0, 3).map((c: any, idx: number) => (
                    <div
                      key={c.userId || idx}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-blue-950/70 border border-blue-400/40 text-xs shadow-sm shrink-0"
                    >
                      <div className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-cyan-400/70 bg-slate-800 shrink-0">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {(c.nickname || c.uniqueId || '?')[0]}
                          </div>
                        )}
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-white truncate max-w-[90px]">
                          {c.nickname || c.uniqueId}
                        </div>
                        <div className="text-[10px] font-mono font-black text-cyan-300">
                          {Number(c.score || 0).toLocaleString()} نقطة
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-blue-300/60 py-1">الجولة جارية وبانتظار مساهمات الداعمين الأولى</div>
              )}
            </div>
          </div>

          {/* TEAM B BOX: Red Team (فريق المنافس) */}
          <div className="relative rounded-2xl bg-gradient-to-b from-rose-950/50 via-slate-900/80 to-[#1f070e] border-2 border-rose-500/40 p-5 shadow-2xl flex flex-col justify-between backdrop-blur-xl group hover:border-rose-400/80 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/30 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300">
                  <Crown className="w-4 h-4 fill-rose-400/30" />
                </div>
                <div>
                  <span className="text-xs font-black text-rose-300 tracking-wide uppercase">
                    الفريق الأحمر
                  </span>
                  <span className="text-[11px] text-rose-200/70 font-semibold mr-2">
                    {battleMode === '2v2' ? '— المنافس وشريكه (2 ستريمر)' : '— المنافس'}
                  </span>
                </div>
              </div>
              <div className="px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-black border border-rose-500/40 shadow-sm">
                {rivalPercent}%
              </div>
            </div>

            {/* Streamers Content */}
            {battleMode === '1v1' ? (
              /* 1 Streamer View */
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full ring-3 ring-rose-400 ring-offset-2 ring-offset-slate-950 overflow-hidden bg-slate-800 shadow-xl shadow-rose-500/30 flex items-center justify-center">
                      {rival1.avatarUrl ? (
                        <img src={rival1.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-2xl font-black text-white">
                          {rival1.uniqueId?.[0]?.toUpperCase() || 'R'}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -left-1 px-2 py-0.5 rounded-md text-[10px] bg-rose-600 text-white font-black border border-rose-400 shadow">
                      المنافس
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-black text-white flex items-center gap-1.5">
                      <span dir="ltr" className="font-mono text-rose-100">@{rival1.uniqueId}</span>
                    </div>
                    <div className="text-xs text-rose-200/80 font-medium">{rival1.nickname || 'Carolina Massoud'}</div>
                    <div className="flex items-center gap-1 text-[10px] text-rose-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      خصم المعركة
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-md">
                    {rivalScore.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-rose-300 font-bold mt-0.5">نقاط الخصم</div>
                </div>
              </div>
            ) : (
              /* 2 Streamers View: Vertically Stacked (فوق بعض) */
              <div className="space-y-3">
                <div className="flex flex-col space-y-2.5">
                  {/* Rival 1 (Top) */}
                  <div className="p-3 rounded-xl bg-rose-900/30 border border-rose-500/30 flex items-center justify-between gap-3 shadow-sm hover:border-rose-400/50 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full ring-2 ring-rose-400 ring-offset-1 ring-offset-slate-900 overflow-hidden bg-slate-800 shrink-0 shadow flex items-center justify-center">
                          {rival1.avatarUrl ? (
                            <img src={rival1.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center font-bold text-sm text-white">
                              {rival1.uniqueId?.[0]?.toUpperCase() || 'R'}
                            </div>
                          )}
                        </div>
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-400 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                          1
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div dir="ltr" className="text-xs font-black text-white truncate">@{rival1.uniqueId}</div>
                        <div className="text-[11px] text-rose-300 font-semibold truncate">{rival1.nickname || 'المنافس 1'}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/40">
                          المنافس الرئيسي
                        </span>
                      </div>
                    </div>
                    {rival1.score !== undefined && (
                      <div className="text-left shrink-0">
                        <div className="text-sm font-black text-white font-mono">{Number(rival1.score).toLocaleString()}</div>
                        <div className="text-[9px] text-rose-300/80 font-medium">نقاط اللاعب</div>
                      </div>
                    )}
                  </div>

                  {/* Rival 2 (Bottom) */}
                  {rival2 ? (
                    <div className="p-3 rounded-xl bg-rose-900/30 border border-rose-500/30 flex items-center justify-between gap-3 shadow-sm hover:border-rose-400/50 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full ring-2 ring-rose-300 ring-offset-1 ring-offset-slate-900 overflow-hidden bg-slate-800 shrink-0 shadow flex items-center justify-center">
                            {rival2.avatarUrl ? (
                              <img src={rival2.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center font-bold text-sm text-white">
                                {rival2.uniqueId?.[0]?.toUpperCase() || 'R'}
                              </div>
                            )}
                          </div>
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-400 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                            2
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div dir="ltr" className="text-xs font-black text-white truncate">@{rival2.uniqueId}</div>
                          <div className="text-[11px] text-rose-300 font-semibold truncate">{rival2.nickname || 'شريك المنافس'}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/30 text-red-200 border border-red-400/40">
                            شريك المنافس
                          </span>
                        </div>
                      </div>
                      {rival2.score !== undefined && (
                        <div className="text-left shrink-0">
                          <div className="text-sm font-black text-white font-mono">{Number(rival2.score).toLocaleString()}</div>
                          <div className="text-[9px] text-rose-300/80 font-medium">نقاط اللاعب</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-rose-500/30 bg-rose-950/20 flex items-center gap-3 opacity-80">
                      <div className="w-12 h-12 rounded-full border border-dashed border-rose-400/50 flex items-center justify-center text-rose-400">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-300">شريك المنافس</div>
                        <div className="text-[10px] text-rose-300/70">في انتظار الانضمام</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Team Score */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/80 border border-rose-500/30 shadow-inner">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-rose-400 fill-rose-400" />
                    <span className="text-xs font-bold text-rose-200">مجموع سكور الفريق الأحمر:</span>
                  </div>
                  <span className="text-3xl font-black text-white font-mono tracking-tight drop-shadow">
                    {rivalScore.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Team B Top Contributors Row */}
            <div className="mt-4 pt-3 border-t border-rose-500/20">
              <div className="flex items-center justify-between text-[11px] mb-2 font-bold">
                <span className="text-rose-300 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-rose-400" />
                  <span>أبرز داعمي الفريق الأحمر:</span>
                </span>
                <span className="text-[10px] text-rose-300/70 font-mono">
                  {teamBData?.contributors?.length > 0 ? `${teamBData.contributors.length} داعمين` : 'في انتظار الدعم'}
                </span>
              </div>

              {teamBData?.contributors?.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {teamBData.contributors.slice(0, 3).map((c: any, idx: number) => (
                    <div
                      key={c.userId || idx}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-rose-950/70 border border-rose-400/40 text-xs shadow-sm shrink-0"
                    >
                      <div className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-rose-400/70 bg-slate-800 shrink-0">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {(c.nickname || c.uniqueId || '?')[0]}
                          </div>
                        )}
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-white truncate max-w-[90px]">
                          {c.nickname || c.uniqueId}
                        </div>
                        <div className="text-[10px] font-mono font-black text-rose-300">
                          {Number(c.score || 0).toLocaleString()} نقطة
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-rose-300/60 py-1">الجولة جارية وبانتظار مساهمات الداعمين الأولى</div>
              )}
            </div>
          </div>
        </div>

        {/* Center 3D VS Shield */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-600 p-0.5 shadow-2xl shadow-amber-500/50 animate-pulse">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-amber-700 via-yellow-900 to-amber-950 flex items-center justify-center border border-amber-300/60 shadow-inner">
              <span className="font-black text-base text-yellow-100 tracking-wider drop-shadow-md">
                VS
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Tug-of-War Score Bar & Timer */}
        <div className="relative z-10 mt-6 space-y-2">
          <div className="flex justify-between items-center text-xs font-mono font-bold">
            <span className="text-cyan-400 flex items-center gap-1.5 font-sans font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{hostPercent}% الفريق الأزرق</span>
            </span>

            <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-slate-950/90 border border-slate-700 text-xs text-amber-300 font-mono font-bold shadow-md">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>الوقت المتبقي: {timeLeft}</span>
            </div>

            <span className="text-rose-400 flex items-center gap-1.5 font-sans font-bold">
              <span>{rivalPercent}% الفريق الأحمر</span>
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            </span>
          </div>

          <div className="h-4 w-full bg-slate-900/90 rounded-full overflow-hidden flex p-0.5 border border-slate-700/80 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 transition-all duration-500 shadow-md shadow-cyan-500/50"
              style={{ width: `${hostPercent}%` }}
            />
            <div
              className="h-full rounded-full bg-gradient-to-l from-rose-600 via-pink-500 to-rose-500 transition-all duration-500 shadow-md shadow-rose-500/50"
              style={{ width: `${rivalPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
