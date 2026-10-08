'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Radio,
  Users,
  ChevronDown,
  Settings,
  Flame,
  Swords,
  Shield,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  Send,
  Search,
  Filter,
  CheckCircle2,
  Crown,
  Trophy,
} from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';
import { getSocket } from '../../lib/socket';

export default function CyberBattleHub() {
  const selectedStreamer = useStreamStore((s) => s.selectedStreamer);
  const streamers = useStreamStore((s) => s.streamers);
  const metrics = useStreamStore((s) => s.metrics);
  const streamerIdRef = useRef<string | null>(null);

  // Stream data
  const [sessionTimer, setSessionTimer] = useState('00:08:39');
  const [battleData, setBattleData] = useState<any>(null);
  const [vaultData, setVaultData] = useState<any>(null);
  const [chatFeed, setChatFeed] = useState<Array<{ id: string; user: string; text: string; color: string; avatar?: string }>>([
    { id: '1', user: 'Enigma_2938', text: 'used a Multiplier x3!', color: 'bg-purple-900/60 border-purple-500/40 text-purple-200' },
    { id: '2', user: 'Enigma_2938', text: 'used a Gloves!', color: 'bg-rose-900/60 border-rose-500/40 text-rose-200' },
    { id: '3', user: 'User_888', text: 'activated Gloves!', color: 'bg-blue-900/60 border-blue-500/40 text-blue-200' },
    { id: '4', user: 'Enigma_2938', text: 'used a Gloves!', color: 'bg-rose-900/60 border-rose-500/40 text-rose-200' },
    { id: '5', user: 'User_888', text: 'activated Gloves!', color: 'bg-blue-900/60 border-blue-500/40 text-blue-200' },
    { id: '6', user: 'Enigma_2938', text: 'used a Multiplier x3!', color: 'bg-purple-900/60 border-purple-500/40 text-purple-200' },
    { id: '7', user: 'User_888', text: 'activated Gloves!', color: 'bg-blue-900/60 border-blue-500/40 text-blue-200' },
    { id: '8', user: 'Enigma_2938', text: 'used a Multiplier x3!', color: 'bg-purple-900/60 border-purple-500/40 text-purple-200' },
    { id: '9', user: 'User_888', text: 'activated Gloves!', color: 'bg-blue-900/60 border-blue-500/40 text-blue-200' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Initial Load & Polling for Streamers & Vault
  useEffect(() => {
    const loadStreamers = async () => {
      try {
        const res = await fetch('/api/streamers');
        const data = await res.json();
        if (data.success && data.data) {
          useStreamStore.getState().setStreamers(data.data);
          const currentSelected = useStreamStore.getState().selectedStreamer;
          if (!currentSelected && data.data.length > 0) {
            useStreamStore.getState().setSelectedStreamer(data.data[0]);
          }
        }
      } catch (err) {}
    };

    const loadVault = async () => {
      try {
        const res = await fetch('/api/powerups/vault');
        const data = await res.json();
        if (data.success && data.data) {
          setVaultData(data.data);
        }
      } catch (err) {}
    };

    const loadBattle = async () => {
      try {
        const sId = selectedStreamer?.id;
        const url = sId ? `/api/battles/latest?streamerId=${sId}` : '/api/battles?limit=1';
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.data) {
          setBattleData(data.data);
        }
      } catch (err) {}
    };

    loadStreamers();
    loadVault();
    loadBattle();

    const interval = setInterval(() => {
      loadStreamers();
      loadVault();
      loadBattle();
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedStreamer?.id]);

  // 2. Real-time Socket & Session Timer
  useEffect(() => {
    const startedAt = selectedStreamer?.liveSession?.startedAtUtc;
    if (startedAt) {
      const startTs = new Date(startedAt).getTime();
      const tInterval = setInterval(() => {
        const diff = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setSessionTimer(`${h}:${m}:${s}`);
      }, 1000);
      return () => clearInterval(tInterval);
    }
  }, [selectedStreamer?.liveSession?.startedAtUtc]);

  useEffect(() => {
    const socket = getSocket();
    const sId = selectedStreamer?.id;
    if (sId) socket.emit('join:stream', sId);

    const onBattleUpdate = (b: any) => {
      setBattleData((prev: any) => ({ ...prev, ...b }));
    };

    const onPowerupUsed = (d: any) => {
      const user = d.user?.nickname || d.user?.uniqueId || 'Supporter';
      const pName = d.payload?.powerUpName || 'Battle Buff';
      setChatFeed((prev) => [
        { id: `${Date.now()}_${Math.random()}`, user, text: `used ${pName}!`, color: 'bg-rose-900/60 border-rose-500/40 text-rose-200' },
        ...prev.slice(0, 19),
      ]);
    };

    const onPowerupAcquired = (d: any) => {
      const user = d.user?.nickname || d.user?.uniqueId || 'Supporter';
      const pName = d.payload?.powerUpName || 'Battle Buff';
      setChatFeed((prev) => [
        { id: `${Date.now()}_${Math.random()}`, user, text: `acquired ${pName} +1`, color: 'bg-cyan-900/60 border-cyan-500/40 text-cyan-200' },
        ...prev.slice(0, 19),
      ]);
    };

    const onOpponentGift = (d: any) => {
      const user = d.user?.nickname || d.user?.uniqueId || 'Opponent Gifter';
      const gName = d.payload?.giftName || 'Gift';
      setChatFeed((prev) => [
        { id: `${Date.now()}_${Math.random()}`, user, text: `sent ${gName} to rival! ⚡`, color: 'bg-fuchsia-900/60 border-fuchsia-500/40 text-fuchsia-200' },
        ...prev.slice(0, 19),
      ]);
    };

    socket.on('battle:start', onBattleUpdate);
    socket.on('battle:update', onBattleUpdate);
    socket.on('powerup:used', onPowerupUsed);
    socket.on('powerup:acquired', onPowerupAcquired);
    socket.on('battle:opponent_gift', onOpponentGift);

    return () => {
      socket.off('battle:start', onBattleUpdate);
      socket.off('battle:update', onBattleUpdate);
      socket.off('powerup:used', onPowerupUsed);
      socket.off('powerup:acquired', onPowerupAcquired);
      socket.off('battle:opponent_gift', onOpponentGift);
    };
  }, [selectedStreamer?.id]);

  const handleSendCustomMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatFeed((prev) => [
      { id: `${Date.now()}`, user: selectedStreamer?.username || 'Host', text: chatInput, color: 'bg-blue-900/60 border-blue-500/40 text-cyan-200' },
      ...prev,
    ]);
    setChatInput('');
  };

  // Aggregated scores & calculations
  const isLive = selectedStreamer?.status === 'LIVE';
  const hostScore = Number(battleData?.hostScore || battleData?.teamAScore || 22222);
  const rivalScore = Number(battleData?.rivalScore || battleData?.teamBScore || 459);
  const totalScore = hostScore + rivalScore || 1;
  const hostPercent = Math.max(10, Math.min(90, Math.round((hostScore / totalScore) * 100)));
  const rivalPercent = 100 - hostPercent;

  // Vault KPIs
  const totalEarned = vaultData?.summary?.totalAcquired || 157;
  const activeUsers = vaultData?.summary?.activeAccountsCount || 134;
  const toolsUsed = vaultData?.summary?.totalUsed || 43;
  const totalCapacity = vaultData?.summary?.totalAvailable || 23;

  // Supporters list
  const supporterList = (vaultData?.supporterBalances || []).length > 0
    ? vaultData.supporterBalances.slice(0, 5)
    : [
        { id: '1', user: { uniqueId: 'Anonymous', nickname: 'Anonymous Enigma 🕶️' }, tool: { nameAr: 'قفازات المعركة', code: 'GLOVES' }, totalAcquired: 2000, availableBalance: 500, state: 'الحالة' },
        { id: '2', user: { uniqueId: 'Anonymous', nickname: 'Anonymous Enigma 🕶️' }, tool: { nameAr: 'قفازات المعركة', code: 'GLOVES' }, totalAcquired: 1500, availableBalance: 600, state: 'الحالة' },
        { id: '3', user: { uniqueId: 'Anonymous', nickname: 'Anonymous Enigma 🕶️' }, tool: { nameAr: 'مضاعف', code: 'BOOST_X3' }, totalAcquired: 1300, availableBalance: 500, state: 'الحالة' },
        { id: '4', user: { uniqueId: 'Anonymous', nickname: 'Anonymous Enigma 🕶️' }, tool: { nameAr: 'مضاعف', code: 'BOOST_X2' }, totalAcquired: 500, availableBalance: 200, state: 'الحالة' },
        { id: '5', user: { uniqueId: 'Anonymous', nickname: 'Anonymous Enigma 🕶️' }, tool: { nameAr: 'مضاعف', code: 'MIST' }, totalAcquired: 750, availableBalance: 200, state: 'الحالة' },
      ];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-black flex flex-col overflow-x-hidden">
      {/* ──────────────────────────────────────────────────────────
          1. TOP STREAM OPERATIONS BAR (Header)
      ────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-white/[0.08] bg-[#0d1322]/90 backdrop-blur-xl px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-50">
        {/* Left: Brand + LIVE Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-rose-500 font-black text-xl">♪</span>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-sm tracking-tight text-white">TikTok Live</span>
              <span className="font-bold text-[11px] text-cyan-400">Battle Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE</span>
          </div>

          {/* Streamer Dropdown Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#141c2e] border border-white/[0.08] text-xs">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xs font-bold ring-1 ring-purple-400/50 overflow-hidden">
              {selectedStreamer?.profileImage ? (
                <img src={selectedStreamer.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                '🕶️'
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 leading-none">Streamer info</span>
              <span className="font-bold text-white text-xs leading-tight">
                {selectedStreamer?.username || 'Enigma_2938'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Center: Battle Status & Elapsed Timer */}
        <div className="hidden md:flex flex-col items-center leading-none text-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">LIVE BATTLE STATUS</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-white font-bold">{sessionTimer} elaped</span>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Real time battle status
            </span>
          </div>
        </div>

        {/* Right: Live Viewers + System Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#141c2e] border border-white/[0.08] text-xs">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-slate-400">Live viewer</span>
              <span className="font-mono font-bold text-white">
                {metrics?.viewers ? metrics.viewers.toLocaleString() : '2.3K'}
              </span>
            </div>
          </div>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141c2e] hover:bg-[#1b263e] border border-white/[0.08] text-xs text-slate-300 transition-colors">
            <Users className="w-3.5 h-3.5" />
            <span>System</span>
          </button>

          <button className="p-1.5 rounded-xl bg-[#141c2e] hover:bg-[#1b263e] border border-white/[0.08] text-slate-400 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* KPI Command Center Mini-Subheader Label */}
      <div className="text-center py-1 text-[11px] font-mono text-slate-400/80 bg-[#0d1322]/40 border-b border-white/[0.04]">
        KPI Command Center
      </div>

      {/* ──────────────────────────────────────────────────────────
          2. MAIN 3-COLUMN DASHBOARD VIEWPORT
      ────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 max-w-[1920px] mx-auto w-full">
        {/* ========================================================
            COLUMN 1: BATTLE BUFFS VAULT (4 Cols)
        ======================================================== */}
        <section className="lg:col-span-4 flex flex-col gap-3">
          <div className="rounded-2xl bg-[#0f1526]/80 border border-white/[0.08] p-3.5 flex flex-col h-full shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
              <div>
                <h2 className="text-sm font-black text-white">Battle Buffs Vault</h2>
                <div className="text-[11px] text-cyan-400 border-b-2 border-cyan-400 pb-0.5 inline-block font-bold">
                  Batele Cards
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-slate-300">خزينة أدوات المعركة</span>
                <div className="text-[10px] text-slate-400">الأدوات النشطة</div>
              </div>
            </div>

            {/* 4 Neon Buff Cards Grid (2x2) */}
            <div className="grid grid-cols-2 gap-2.5 my-auto py-2">
              {/* Card 1: Gloves */}
              <div className="rounded-xl bg-[#12192c] border border-cyan-500/40 p-3 flex flex-col items-center text-center relative overflow-hidden group hover:border-cyan-400 transition-all shadow-lg shadow-cyan-950/30">
                <div className="w-full flex items-center justify-between text-left text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">🥊</span>
                    <div>
                      <div className="font-bold text-white text-[11px] leading-tight">Gloves</div>
                      <div className="text-[9px] text-slate-400">قفازات المعركة</div>
                    </div>
                  </div>
                </div>

                {/* Radial Glow Countdown */}
                <div className="relative my-2 w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-cyan-400 transition-all duration-1000"
                      strokeDasharray="50, 100"
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute font-black text-white text-base font-mono">15s</span>
                </div>
                <span className="text-[10px] text-slate-400">الوقت المتبقي</span>
              </div>

              {/* Card 2: Battle Cancel */}
              <div className="rounded-xl bg-[#12192c] border border-rose-500/40 p-3 flex flex-col items-center text-center relative overflow-hidden group hover:border-rose-400 transition-all shadow-lg shadow-rose-950/30">
                <div className="w-full flex items-center justify-between text-left text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs">✕</span>
                    <div>
                      <div className="font-bold text-white text-[11px] leading-tight">Battle Cancel</div>
                      <div className="text-[9px] text-slate-400">إلغاء المعركة</div>
                    </div>
                  </div>
                </div>

                {/* Radial Glow Countdown */}
                <div className="relative my-2 w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-rose-500 transition-all duration-1000"
                      strokeDasharray="75, 100"
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute font-black text-white text-base font-mono">30s</span>
                </div>
                <span className="text-[10px] text-slate-400">الوقت المتبقي</span>
              </div>

              {/* Card 3: Double Points x2 */}
              <div className="rounded-xl bg-[#12192c] border border-cyan-500/40 p-3 flex flex-col items-center text-center relative overflow-hidden group hover:border-cyan-400 transition-all shadow-lg shadow-cyan-950/30">
                <div className="w-full flex items-center justify-between text-left text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs">2</span>
                    <div>
                      <div className="font-bold text-white text-[11px] leading-tight">Double Points x2</div>
                      <div className="text-[9px] text-slate-400">مضاعف النقاط x2</div>
                    </div>
                  </div>
                </div>

                <div className="relative my-2 w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-cyan-400 transition-all duration-1000"
                      strokeDasharray="60, 100"
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute font-black text-white text-base font-mono">30s</span>
                </div>
                <span className="text-[10px] text-slate-400">الوقت المتبقي</span>
              </div>

              {/* Card 4: Triple Points x3 */}
              <div className="rounded-xl bg-[#12192c] border border-purple-500/40 p-3 flex flex-col items-center text-center relative overflow-hidden group hover:border-purple-400 transition-all shadow-lg shadow-purple-950/30">
                <div className="w-full flex items-center justify-between text-left text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs">3</span>
                    <div>
                      <div className="font-bold text-white text-[11px] leading-tight">Triple Points x3</div>
                      <div className="text-[9px] text-slate-400">مضاعف النقاط x3</div>
                    </div>
                  </div>
                </div>

                <div className="relative my-2 w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-fuchsia-400 transition-all duration-1000"
                      strokeDasharray="80, 100"
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute font-black text-white text-base font-mono">45s</span>
                </div>
                <span className="text-[10px] text-slate-400">الوقت المتبقي</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            COLUMN 2: KPIs & ARENA LEADERBOARD (5 Cols)
        ======================================================== */}
        <section className="lg:col-span-5 flex flex-col gap-3">
          {/* Top: 4 Cyberpunk KPI Cards */}
          <div className="rounded-2xl bg-[#0f1526]/80 border border-white/[0.08] p-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs">
              <span className="font-bold text-white">KPIs</span>
              <span className="font-bold text-slate-300">لوحة الصدارة</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-left">
              {/* KPI 1 */}
              <div className="p-2.5 rounded-xl bg-[#12192c] border border-white/[0.06] relative overflow-hidden">
                <div className="text-[10px] text-slate-400 font-medium">Total Points Earned</div>
                <div className="text-[9px] text-slate-500">إجمالي المكتسب</div>
                <div className="text-xl font-black text-white font-mono mt-1">{totalEarned}</div>
                {/* Neon Sparkline */}
                <div className="h-4 w-full flex items-end gap-0.5 mt-1">
                  <div className="w-1.5 h-1 bg-cyan-400/50 rounded" />
                  <div className="w-1.5 h-2 bg-cyan-400/70 rounded" />
                  <div className="w-1.5 h-3 bg-cyan-400 rounded" />
                  <div className="w-1.5 h-2 bg-cyan-400/80 rounded" />
                  <div className="w-1.5 h-4 bg-cyan-400 rounded" />
                </div>
                <span className="text-[9px] text-emerald-400 font-mono font-bold block text-right mt-0.5">▲ 15%</span>
              </div>

              {/* KPI 2 */}
              <div className="p-2.5 rounded-xl bg-[#12192c] border border-white/[0.06] relative overflow-hidden">
                <div className="text-[10px] text-slate-400 font-medium">Active Users</div>
                <div className="text-[9px] text-slate-500">اللاعبين النشطين</div>
                <div className="text-xl font-black text-white font-mono mt-1">{activeUsers}</div>
                <div className="h-4 w-full flex items-end gap-0.5 mt-1">
                  <div className="w-1.5 h-2 bg-purple-400/50 rounded" />
                  <div className="w-1.5 h-3 bg-purple-400/80 rounded" />
                  <div className="w-1.5 h-4 bg-purple-400 rounded" />
                  <div className="w-1.5 h-2 bg-purple-400/70 rounded" />
                </div>
                <span className="text-[9px] text-purple-400 font-mono font-bold block text-right mt-0.5">▲ 13%</span>
              </div>

              {/* KPI 3 */}
              <div className="p-2.5 rounded-xl bg-[#12192c] border border-white/[0.06] relative overflow-hidden">
                <div className="text-[10px] text-slate-400 font-medium">Tools Used</div>
                <div className="text-[9px] text-slate-500">الأدوات المستخدمة</div>
                <div className="text-xl font-black text-white font-mono mt-1">{toolsUsed}</div>
                <div className="h-4 w-full flex items-end gap-0.5 mt-1">
                  <div className="w-1.5 h-1 bg-blue-400/50 rounded" />
                  <div className="w-1.5 h-2 bg-blue-400/80 rounded" />
                  <div className="w-1.5 h-3 bg-blue-400 rounded" />
                  <div className="w-1.5 h-4 bg-blue-400 rounded" />
                </div>
                <span className="text-[9px] text-blue-400 font-mono font-bold block text-right mt-0.5">▲ 13%</span>
              </div>

              {/* KPI 4 */}
              <div className="p-2.5 rounded-xl bg-[#12192c] border border-white/[0.06] relative overflow-hidden">
                <div className="text-[10px] text-slate-400 font-medium">Total Capacity</div>
                <div className="text-[9px] text-slate-500">السعة الكلية</div>
                <div className="text-xl font-black text-white font-mono mt-1">{totalCapacity}</div>
                <div className="h-4 w-full flex items-end gap-0.5 mt-1">
                  <div className="w-1.5 h-3 bg-rose-400/60 rounded" />
                  <div className="w-1.5 h-2 bg-rose-400/80 rounded" />
                  <div className="w-1.5 h-4 bg-rose-400 rounded" />
                  <div className="w-1.5 h-1 bg-rose-400/50 rounded" />
                </div>
                <span className="text-[9px] text-rose-400 font-mono font-bold block text-right mt-0.5">▼ 23%</span>
              </div>
            </div>
          </div>

          {/* Bottom: Arena Leaderboard (Modernized Feed) */}
          <div className="rounded-2xl bg-[#0f1526]/80 border border-white/[0.08] p-3.5 flex flex-col flex-1 shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs">
              <span className="font-bold text-white">Arena Leaderboard</span>
              <span className="font-bold text-slate-300">قائمة المتصدرين</span>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[10px] text-slate-400 pb-2 px-2 border-b border-white/[0.04]">
              <span className="col-span-4 text-left">المستخدم</span>
              <span className="col-span-3 text-center">النشاط</span>
              <span className="col-span-2 text-center">الحالة</span>
              <span className="col-span-3 text-right">إجمالي الدعم / الرصيد</span>
            </div>

            {/* Feed Rows */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[260px] pr-1 py-1">
              {supporterList.map((sup: any, idx: number) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                return (
                  <div
                    key={sup.id || idx}
                    className="grid grid-cols-12 items-center p-2 rounded-xl bg-[#12192c]/90 hover:bg-[#18223c] border border-white/[0.04] text-xs transition-colors"
                  >
                    {/* User Profile */}
                    <div className="col-span-4 flex items-center gap-2">
                      <div className="relative">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ring-1 ${
                            isTop1
                              ? 'ring-amber-400 bg-amber-500/20 text-amber-300'
                              : isTop2
                              ? 'ring-indigo-400 bg-indigo-500/20 text-indigo-300'
                              : isTop3
                              ? 'ring-amber-600 bg-amber-600/20 text-amber-500'
                              : 'ring-slate-600 bg-slate-700 text-slate-300'
                          }`}
                        >
                          {sup.user?.avatarUrl ? (
                            <img src={sup.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            '🕶️'
                          )}
                        </div>
                        {idx < 3 && (
                          <span className="absolute -top-1 -right-1 text-[10px]">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-white truncate">
                          {sup.user?.uniqueId || 'Anonymous'}
                        </span>
                        <span className="text-[9px] text-purple-300 font-mono">Enigma 🕶️</span>
                      </div>
                    </div>

                    {/* Tool / Activity */}
                    <div className="col-span-3 text-center text-[10px] text-slate-300">
                      {sup.tool?.nameAr || 'قفازات المعركة'}
                    </div>

                    {/* Status Pill */}
                    <div className="col-span-2 text-center">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                          idx % 2 === 0
                            ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                            : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        الحالة
                      </span>
                    </div>

                    {/* Support Amount & Balance */}
                    <div className="col-span-3 flex items-center justify-end gap-2 font-mono text-[11px]">
                      <span className="text-white font-bold">{Number(sup.totalAcquired || 1500).toLocaleString()}</span>
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                        🪙 {sup.availableBalance || 500}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================
            COLUMN 3: LIVE OPERATION STREAM (3 Cols)
        ======================================================== */}
        <section className="lg:col-span-3 flex flex-col gap-3">
          {/* Live Stream Chat Feed */}
          <div className="rounded-2xl bg-[#0f1526]/80 border border-white/[0.08] p-3.5 flex flex-col h-[380px] shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
              <h3 className="text-xs font-bold text-white">Live Operation Str</h3>
              <span className="text-xs font-bold text-slate-300">سجل الحركة المباشر</span>
            </div>

            {/* Search / Filter mini-bar */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 text-xs rounded-lg bg-[#12192c] border border-white/[0.06] text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <button className="p-1 rounded-lg bg-[#12192c] border border-white/[0.06] text-slate-400 hover:text-white">
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Event Chat Bubbles Stream */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
              {chatFeed
                .filter((c) => !searchFilter || c.user.toLowerCase().includes(searchFilter.toLowerCase()) || c.text.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-[10px] shrink-0 font-bold">
                      🕶️
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="text-[10px] text-slate-400 font-mono">{msg.user}</span>
                      <div className={`px-2.5 py-1 rounded-2xl rounded-tl-none border text-[11px] font-sans inline-block mt-0.5 shadow-sm ${msg.color}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Chat Send Input Box */}
            <form onSubmit={handleSendCustomMessage} className="mt-2 flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
              <input
                type="text"
                placeholder="Text a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[#12192c] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Top Contributors MVP Podium */}
          <div className="rounded-2xl bg-[#0f1526]/80 border border-white/[0.08] p-3 flex flex-col items-center shadow-xl">
            <span className="text-xs font-bold text-slate-300 mb-2">Top Contributors MVP</span>
            {/* 3D-Style Podium (2nd, 1st, 3rd) */}
            <div className="flex items-end justify-center gap-2 w-full pt-1">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-600 ring-2 ring-indigo-400 flex items-center justify-center text-xs font-bold overflow-hidden mb-1">
                  👤
                </div>
                <div className="w-12 h-14 bg-gradient-to-t from-indigo-900 to-indigo-700/80 rounded-t-lg flex items-center justify-center font-bold text-sm text-indigo-200 border-t border-indigo-400 shadow-md">
                  2
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-500 ring-2 ring-amber-300 flex items-center justify-center text-sm font-bold overflow-hidden mb-1 shadow-lg shadow-amber-500/30">
                  🕶️
                </div>
                <div className="w-14 h-20 bg-gradient-to-t from-amber-700 to-amber-500/80 rounded-t-lg flex items-center justify-center font-black text-lg text-amber-100 border-t border-amber-300 shadow-lg">
                  1
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-purple-600 ring-2 ring-purple-400 flex items-center justify-center text-xs font-bold overflow-hidden mb-1">
                  👤
                </div>
                <div className="w-12 h-10 bg-gradient-to-t from-purple-900 to-purple-700/80 rounded-t-lg flex items-center justify-center font-bold text-sm text-purple-200 border-t border-purple-400 shadow-md">
                  3
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ──────────────────────────────────────────────────────────
          3. BOTTOM: VS BATTLE GAUGE (Power-O-Meter)
      ────────────────────────────────────────────────────────── */}
      <footer className="p-3 lg:px-6 border-t border-white/[0.08] bg-[#0c1220]/95 backdrop-blur-xl">
        <div className="max-w-[1920px] mx-auto flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-cyan-400 flex items-center gap-1.5 font-mono">
              <span>VS Battle Gauge</span>
              <span className="text-slate-400">({hostPercent}%)</span>
              <span className="font-mono text-white text-sm">{hostScore.toLocaleString()}</span>
            </span>
            <span className="text-rose-400 flex items-center gap-1.5 font-mono">
              <span className="font-mono text-white text-sm">{rivalScore.toLocaleString()}</span>
              <span className="text-slate-400">({rivalPercent}%)</span>
              <span>Rival Team</span>
            </span>
          </div>

          {/* Neon VS Battle Gauge */}
          <div className="flex items-center gap-3">
            {/* Host Avatar (Left) */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 ring-2 ring-cyan-400/80 shadow-lg shadow-cyan-500/40">
                <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-sm">
                  {selectedStreamer?.profileImage ? (
                    <img src={selectedStreamer.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    '🕶️'
                  )}
                </div>
              </div>
            </div>

            {/* Blue Side Progress */}
            <div className="flex-1 h-3 rounded-full bg-slate-900 border border-cyan-500/30 overflow-hidden p-0.5 flex">
              <div
                style={{ width: `${hostPercent}%` }}
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-300 rounded-full shadow-lg shadow-cyan-500/50 transition-all duration-500"
              />
            </div>

            {/* Glowing VS Badge in Center */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-rose-500 flex items-center justify-center font-black text-sm text-white shadow-xl shadow-purple-500/30 ring-2 ring-white/20 shrink-0">
              VS
            </div>

            {/* Red Side Progress */}
            <div className="flex-1 h-3 rounded-full bg-slate-900 border border-rose-500/30 overflow-hidden p-0.5 flex justify-end">
              <div
                style={{ width: `${rivalPercent}%` }}
                className="h-full bg-gradient-to-l from-rose-600 via-red-500 to-pink-400 rounded-full shadow-lg shadow-rose-500/50 transition-all duration-500"
              />
            </div>

            {/* Rival Avatar (Right) */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 p-0.5 ring-2 ring-rose-400/80 shadow-lg shadow-rose-500/40">
                <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-sm">
                  {battleData?.rivalImage ? (
                    <img src={battleData.rivalImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    '👤'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
