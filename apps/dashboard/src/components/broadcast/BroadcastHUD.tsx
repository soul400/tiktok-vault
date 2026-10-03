'use client';

import React, { useState, useEffect } from 'react';
import { Swords, Clock, Trophy, Flame, Zap, Crown } from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';
import { getSocket } from '../../lib/socket';

export function BroadcastHUD() {
  const storeActiveBattle = useStreamStore((s) => s.activeBattle);
  const selectedStreamer = useStreamStore((s) => s.selectedStreamer);
  const events = useStreamStore((s) => s.events);

  const [battleData, setBattleData] = useState<any>(null);
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
      }
    } catch (e) {
      console.error('Failed to fetch battle in BroadcastHUD:', e);
    }
  };

  useEffect(() => {
    fetchBattle();
    const interval = setInterval(fetchBattle, 2000);

    const socket = getSocket();
    const onBattleStart = (b: any) => {
      setBattleData((prev: any) => ({
        ...prev,
        ...b,
        teamAScore: Math.max(Number(prev?.teamAScore || 0), Number(b.teamAScore || 0)),
        teamBScore: Math.max(Number(prev?.teamBScore || 0), Number(b.teamBScore || 0)),
      }));
    };

    const onBattleUpdate = (b: any) => {
      setBattleData((prev: any) => ({
        ...prev,
        ...b,
        teamAScore: Math.max(Number(prev?.teamAScore || 0), Number(b.teamAScore || 0)),
        teamBScore: Math.max(Number(prev?.teamBScore || 0), Number(b.teamBScore || 0)),
      }));
    };

    socket.on('battle:start', onBattleStart);
    socket.on('battle:update', onBattleUpdate);
    socket.on('battle:armies', onBattleUpdate);

    return () => {
      clearInterval(interval);
      socket.off('battle:start', onBattleStart);
      socket.off('battle:update', onBattleUpdate);
      socket.off('battle:armies', onBattleUpdate);
    };
  }, []);

  const currentBattle = storeActiveBattle || battleData;

  const teamAData = currentBattle?.teams?.find((t: any) => t.teamId === 'TEAM_A');
  const teamBData = currentBattle?.teams?.find((t: any) => t.teamId === 'TEAM_B');

  const teamAHosts = (teamAData?.hosts && teamAData.hosts.length > 0)
    ? teamAData.hosts
    : [{ uniqueId: selectedStreamer?.username || 'mohra.2000', nickname: selectedStreamer?.displayName || 'المهرة' }];

  const teamBHosts = (teamBData?.hosts && teamBData.hosts.length > 0)
    ? teamBData.hosts
    : [{ uniqueId: currentBattle?.rivalUsername || 'rival', nickname: currentBattle?.rivalNickname || 'المنافس' }];

  const hostScore = Math.max(
    Number(currentBattle?.teamAScore || 0),
    Number(currentBattle?.hostScore || 0),
    Number(teamAData?.score || 0)
  );

  const rivalScore = Math.max(
    Number(currentBattle?.teamBScore || 0),
    Number(currentBattle?.rivalScore || 0),
    Number(teamBData?.score || 0)
  );

  const totalScore = hostScore + rivalScore;
  const hostPercent = totalScore > 0 ? Math.round((hostScore / totalScore) * 100) : 50;
  const rivalPercent = 100 - hostPercent;

  // Countdown timer
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

  // Latest key event for broadcast ticker
  const latestEvent = events[0];

  return (
    <div className="w-full min-h-screen bg-[#070A12] text-white flex flex-col justify-between p-6 select-none overflow-hidden">
      {/* 1. Broadcast Top Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xl font-black tracking-wider font-mono">AEP ESPORTS LIVE HUD</div>
            <div className="text-xs text-slate-400 font-medium">نظام العرض والبث المباشر المخصص للإنتاج وشاشات التحكم</div>
          </div>
        </div>

        {/* Big Battle Timer */}
        <div className="flex items-center gap-3 px-5 py-2 rounded-xl bg-[#101625] border border-white/[0.08] shadow-lg">
          <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
          <span dir="ltr" className="text-3xl font-black text-amber-400 font-mono tabular-nums tracking-widest">
            {timeLeft}
          </span>
        </div>
      </div>

      {/* 2. Main Match Arena (Esports Split) */}
      <div className="my-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-7xl mx-auto">
          {/* Team A (Blue Team) */}
          <div className="p-6 rounded-2xl bg-[#101625] border-2 border-blue-500/40 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <span className="text-base font-black text-cyan-400 font-mono tracking-wider">TEAM BLUE (المضيف)</span>
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 font-mono font-black text-sm border border-cyan-500/30">
                {hostPercent}%
              </span>
            </div>

            {/* Players Stack */}
            <div className="space-y-3 mb-6">
              {teamAHosts.map((h: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#070A12] border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 ring-2 ring-cyan-400 shrink-0">
                      {h.avatarUrl ? (
                        <img src={h.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-600 flex items-center justify-center font-bold text-white">
                          {(h.uniqueId || 'A')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div dir="ltr" className="text-sm font-black text-white font-mono">@{h.uniqueId}</div>
                      <div className="text-xs text-cyan-300 font-semibold">{h.nickname || 'المضيف'}</div>
                    </div>
                  </div>
                  {h.score !== undefined && (
                    <div className="text-left font-mono font-black text-white text-base tabular-nums">
                      {Number(h.score).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total Score */}
            <div className="p-4 rounded-xl bg-[#070A12] border border-blue-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">مجموع سكور الفريق:</span>
              <span className="text-4xl sm:text-5xl font-black text-white font-mono tabular-nums tracking-tight">
                {hostScore.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Team B (Red Team) */}
          <div className="p-6 rounded-2xl bg-[#101625] border-2 border-rose-500/40 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <span className="text-base font-black text-rose-400 font-mono tracking-wider">TEAM RED (المنافس)</span>
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-mono font-black text-sm border border-rose-500/30">
                {rivalPercent}%
              </span>
            </div>

            {/* Players Stack */}
            <div className="space-y-3 mb-6">
              {teamBHosts.map((h: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#070A12] border border-rose-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 ring-2 ring-rose-400 shrink-0">
                      {h.avatarUrl ? (
                        <img src={h.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-rose-600 flex items-center justify-center font-bold text-white">
                          {(h.uniqueId || 'B')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div dir="ltr" className="text-sm font-black text-white font-mono">@{h.uniqueId}</div>
                      <div className="text-xs text-rose-300 font-semibold">{h.nickname || 'المنافس'}</div>
                    </div>
                  </div>
                  {h.score !== undefined && (
                    <div className="text-left font-mono font-black text-white text-base tabular-nums">
                      {Number(h.score).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total Score */}
            <div className="p-4 rounded-xl bg-[#070A12] border border-rose-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">مجموع سكور الفريق:</span>
              <span className="text-4xl sm:text-5xl font-black text-white font-mono tabular-nums tracking-tight">
                {rivalScore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Tug of war bar */}
        <div className="max-w-7xl mx-auto mt-6">
          <div className="w-full h-4 rounded-full bg-slate-900 border border-white/[0.08] overflow-hidden flex shadow-inner">
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
      </div>

      {/* 3. Bottom Live Ticker */}
      <div className="bg-[#101625] border border-white/[0.08] rounded-xl px-5 py-2.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-slate-300">LIVE FEED:</span>
          {latestEvent ? (
            <span className="text-slate-200">
              [{latestEvent.eventType}] {latestEvent.user?.nickname || latestEvent.user?.uniqueId || 'System'}
            </span>
          ) : (
            <span className="text-slate-500">البث متصل ومستقر لحظياً</span>
          )}
        </div>

        <div className="text-slate-400">
          ESC أو F11 لوضع ملء الشاشة الكامل
        </div>
      </div>
    </div>
  );
}
