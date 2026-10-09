'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';
import { getSocket } from '../../lib/socket';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  color: string;
  avatar?: string;
  timestamp?: string;
}

const REFERENCE_TOOLS = [
  {
    code: 'GLOVES',
    nameAr: 'قفازات المعركة',
    nameEn: 'Gloves',
    iconEmoji: '🥊',
    borderColor: 'border-cyan-500/40 hover:border-cyan-400',
    ringColor: 'text-cyan-400',
    shadowColor: 'shadow-cyan-950/30',
  },
  {
    code: 'BOOST_X3',
    nameAr: 'مضاعف النقاط x3',
    nameEn: 'Triple Points x3',
    iconEmoji: '3️⃣',
    borderColor: 'border-fuchsia-500/40 hover:border-fuchsia-400',
    ringColor: 'text-fuchsia-400',
    shadowColor: 'shadow-fuchsia-950/30',
  },
  {
    code: 'BOOST_X2',
    nameAr: 'مضاعف النقاط x2',
    nameEn: 'Double Points x2',
    iconEmoji: '2️⃣',
    borderColor: 'border-blue-500/40 hover:border-blue-400',
    ringColor: 'text-blue-400',
    shadowColor: 'shadow-blue-950/30',
  },
  {
    code: 'MIST',
    nameAr: 'ضباب المعركة',
    nameEn: 'Mist',
    iconEmoji: '☁️',
    borderColor: 'border-purple-500/40 hover:border-purple-400',
    ringColor: 'text-purple-400',
    shadowColor: 'shadow-purple-950/30',
  },
];

export default function CyberBattleHub() {
  const selectedStreamer = useStreamStore((s) => s.selectedStreamer);
  const streamers = useStreamStore((s) => s.streamers);
  const metrics = useStreamStore((s) => s.metrics);

  // Stream & Hub State
  const [sessionTimer, setSessionTimer] = useState('00:00:00');
  const [battleData, setBattleData] = useState<any>(null);
  const [vaultData, setVaultData] = useState<any>(null);
  const [chatFeed, setChatFeed] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedToolFilter, setSelectedToolFilter] = useState<string>('ALL');
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});

  // 1. Authoritative Snapshot Loaders
  const loadStreamers = async () => {
    try {
      const res = await fetch('/api/streamers');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        useStreamStore.getState().setStreamers(data.data);
        const currentSelected = useStreamStore.getState().selectedStreamer;
        const matchingStreamer = data.data.find(
          (s: any) =>
            s.id === currentSelected?.id ||
            s.username?.toLowerCase() === currentSelected?.username?.toLowerCase()
        ) || data.data[0];

        if (matchingStreamer) {
          useStreamStore.getState().setSelectedStreamer(matchingStreamer);
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

        // Synchronize active timers
        const timers: Record<string, number> = {};
        if (data.data.tools) {
          for (const t of data.data.tools) {
            if (t.isActive && t.activeRemainingSeconds > 0) {
              timers[t.code] = t.activeRemainingSeconds;
            }
          }
        }
        setActiveTimers(timers);

        // Initialize chat feed with real transactions if chat feed is empty
        if (data.data.recentTransactions && data.data.recentTransactions.length > 0) {
          setChatFeed((prev) => {
            if (prev.length > 0) return prev;
            return data.data.recentTransactions.slice(0, 15).map((tx: any) => ({
              id: tx.id,
              user: tx.user?.displayName || tx.user?.uniqueId || 'داعم',
              text:
                tx.transactionType === 'USED'
                  ? `استخدم ${tx.tool?.nameAr || 'أداة معركة'} ⚡`
                  : `اكتسب ${tx.tool?.nameAr || 'أداة معركة'} +${tx.quantity}`,
              color:
                tx.transactionType === 'USED'
                  ? 'bg-rose-900/60 border-rose-500/40 text-rose-200'
                  : 'bg-cyan-900/60 border-cyan-500/40 text-cyan-200',
              timestamp: tx.occurredAt,
            }));
          });
        }
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

  // 2. Initial Mount and Reconnect Fetch (Event-driven primary with 30s background sync)
  useEffect(() => {
    loadStreamers();
    loadVault();
    loadBattle();

    // Low-frequency safety sync (30s) instead of aggressive 4s polling
    const bgSyncInterval = setInterval(() => {
      loadStreamers();
      loadVault();
      loadBattle();
    }, 30000);

    return () => clearInterval(bgSyncInterval);
  }, [selectedStreamer?.id]);

  // 3. Local Countdown Ticker for Active Effects
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTimers((prev) => {
        let hasChanges = false;
        const updated = { ...prev };
        for (const code of Object.keys(updated)) {
          if (updated[code] > 0) {
            updated[code] -= 1;
            hasChanges = true;
          }
        }
        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 4. Session Elapsed Timer
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
    } else {
      setSessionTimer('00:00:00');
    }
  }, [selectedStreamer?.liveSession?.startedAtUtc]);

  // 5. Real-Time Socket Gateway Listeners
  useEffect(() => {
    const socket = getSocket();
    const sId = selectedStreamer?.id;
    if (sId) socket.emit('join:stream', sId);

    const onConnect = () => {
      loadStreamers();
      loadVault();
      loadBattle();
    };

    const onBattleStart = (b: any) => {
      setBattleData(b);
      // Battle in progress confirms streamer is actively live
      if (selectedStreamer && selectedStreamer.status !== 'LIVE') {
        useStreamStore.getState().setSelectedStreamer({
          ...selectedStreamer,
          status: 'LIVE',
        });
      }
    };

    const onBattleUpdate = (b: any) => {
      setBattleData((prev: any) => ({
        ...prev,
        ...b,
        teams: b.teams || prev?.teams,
      }));
    };

    const onBattleEnd = (b: any) => {
      setBattleData((prev: any) => ({
        ...prev,
        status: 'FINISHED',
        ...b,
      }));
    };

    const onPowerupUsed = (d: any) => {
      const user = d.user?.nickname || d.user?.uniqueId || 'داعم';
      const pName = d.payload?.powerUpName || 'أداة معركة';
      setChatFeed((prev) => [
        {
          id: `${Date.now()}_${Math.random()}`,
          user,
          text: `استخدم ${pName}! ⚡`,
          color: 'bg-rose-900/60 border-rose-500/40 text-rose-200',
        },
        ...prev.slice(0, 24),
      ]);
      loadVault();
    };

    const onPowerupAcquired = (d: any) => {
      const user = d.user?.nickname || d.user?.uniqueId || 'داعم';
      const pName = d.payload?.powerUpName || 'أداة معركة';
      setChatFeed((prev) => [
        {
          id: `${Date.now()}_${Math.random()}`,
          user,
          text: `اكتسب ${pName} +1 🎁`,
          color: 'bg-cyan-900/60 border-cyan-500/40 text-cyan-200',
        },
        ...prev.slice(0, 24),
      ]);
      loadVault();
    };

    const onOpponentGift = (d: any) => {
      const user = d.user?.nickname || d.user?.uniqueId || 'داعم الخصم';
      const gName = d.payload?.giftName || 'هدية';
      setChatFeed((prev) => [
        {
          id: `${Date.now()}_${Math.random()}`,
          user,
          text: `أرسل ${gName} لفريق المنافس! ⚡`,
          color: 'bg-fuchsia-900/60 border-fuchsia-500/40 text-fuchsia-200',
        },
        ...prev.slice(0, 24),
      ]);
    };

    socket.on('connect', onConnect);
    socket.on('battle:start', onBattleStart);
    socket.on('battle:update', onBattleUpdate);
    socket.on('battle:end', onBattleEnd);
    socket.on('powerup:used', onPowerupUsed);
    socket.on('powerup:acquired', onPowerupAcquired);
    socket.on('battle:opponent_gift', onOpponentGift);

    return () => {
      socket.off('connect', onConnect);
      socket.off('battle:start', onBattleStart);
      socket.off('battle:update', onBattleUpdate);
      socket.off('battle:end', onBattleEnd);
      socket.off('powerup:used', onPowerupUsed);
      socket.off('powerup:acquired', onPowerupAcquired);
      socket.off('battle:opponent_gift', onOpponentGift);
    };
  }, [selectedStreamer?.id]);

  const handleSendCustomMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatFeed((prev) => [
      {
        id: `${Date.now()}`,
        user: selectedStreamer?.displayName || selectedStreamer?.username || 'المضيف',
        text: chatInput,
        color: 'bg-blue-900/60 border-blue-500/40 text-cyan-200',
      },
      ...prev,
    ]);
    setChatInput('');
  };

  // Authoritative Battle Resolution
  const teamAData = battleData?.teams?.find((t: any) => t.teamId === 'TEAM_A');
  const teamBData = battleData?.teams?.find((t: any) => t.teamId === 'TEAM_B');
  const teamAHosts: any[] = teamAData?.hosts || [];
  const teamBHosts: any[] = teamBData?.hosts || [];

  const is2v2 =
    battleData?.battleType === '2v2' ||
    teamAHosts.length > 1 ||
    teamBHosts.length > 1 ||
    (battleData?.participants && battleData.participants.length >= 4);

  // Host (Team A Primary) - deterministically identify primary tracked streamer
  const streamerName = selectedStreamer?.username?.toLowerCase();
  const streamerId = selectedStreamer?.id ? String(selectedStreamer.id) : null;
  const foundHost = teamAHosts.find((h: any) =>
    h.isHost === true ||
    h.role === 'HOST' ||
    (streamerName && h.uniqueId?.toLowerCase() === streamerName) ||
    (streamerId && (String(h.userId) === streamerId || String(h.id) === streamerId))
  ) || teamAHosts[0];

  const hostUser = foundHost || {
    uniqueId: selectedStreamer?.username || 'mohra.2000',
    nickname: selectedStreamer?.displayName || 'المهره 💛',
    avatarUrl: selectedStreamer?.profileImage,
  };
  const effectiveHostAvatar = hostUser.avatarUrl || selectedStreamer?.profileImage || '';

  // Host Teammate (Team A Secondary for 2v2)
  const hostPartner = teamAHosts.find((h: any) => h !== foundHost) || (teamAHosts.length > 1 ? teamAHosts[1] : null);

  // Rival 1 (Team B Primary)
  const foundRival1 = teamBHosts.find((h: any) => h.isHost === true || h.role === 'HOST') || teamBHosts[0];
  const rivalUser1 = foundRival1 || {
    uniqueId: battleData?.rivalUsername || 'rival',
    nickname: battleData?.rivalNickname || 'المنافس',
    avatarUrl: battleData?.rivalImage || '',
  };

  // Rival 2 (Team B Secondary for 2v2)
  const rivalUser2 = teamBHosts.find((h: any) => h !== foundRival1) || (teamBHosts.length > 1 ? teamBHosts[1] : null);

  // Non-Compounding Authoritative Scores
  const hostScore = Number(battleData?.hostScore ?? battleData?.teamAScore ?? 0);
  const rivalScore = Number(battleData?.rivalScore ?? battleData?.teamBScore ?? 0);
  const totalScore = hostScore + rivalScore;
  const hostPercent = totalScore > 0 ? Math.max(5, Math.min(95, Math.round((hostScore / totalScore) * 100))) : 50;
  const rivalPercent = 100 - hostPercent;

  // Real Vault KPIs directly from database aggregation
  const totalEarned = Number(vaultData?.summary?.totalAcquired ?? 0);
  const activeUsers = Number(vaultData?.summary?.activeAccountsCount ?? 0);
  const toolsUsed = Number(vaultData?.summary?.totalUsed ?? 0);
  const totalCapacity = Number(vaultData?.summary?.totalAvailable ?? 0);

  // Top Contributors MVP (Extracted from real battle armies or vault top supporters)
  const teamAContributors: any[] = teamAData?.contributors || [];
  const top1Contributor = teamAContributors[0] || null;
  const top2Contributor = teamAContributors[1] || null;
  const top3Contributor = teamAContributors[2] || null;

  // Filtered Supporter Balances
  const allSupporterBalances: any[] = vaultData?.supporterBalances || [];
  const filteredSupporters = useMemo(() => {
    return allSupporterBalances.filter((sup) => {
      const matchesTool = selectedToolFilter === 'ALL' || sup.tool?.code === selectedToolFilter;
      const term = searchFilter.trim().toLowerCase();
      const matchesSearch =
        !term ||
        sup.user?.uniqueId?.toLowerCase().includes(term) ||
        sup.user?.displayName?.toLowerCase().includes(term) ||
        sup.tool?.nameAr?.toLowerCase().includes(term);
      return matchesTool && matchesSearch;
    });
  }, [allSupporterBalances, selectedToolFilter, searchFilter]);

  // Display Tools in Vault (Merged specs with live server counts)
  const displayTools = useMemo(() => {
    const serverTools: any[] = vaultData?.tools || [];
    return REFERENCE_TOOLS.map((ref) => {
      const serverMatch = serverTools.find((t) => t.code === ref.code);
      const remainingSeconds = activeTimers[ref.code] ?? serverMatch?.activeRemainingSeconds ?? 0;
      const isActive = remainingSeconds > 0;

      return {
        ...ref,
        remainingCount: serverMatch?.remainingCount ?? 0,
        totalAcquired: serverMatch?.totalAcquired ?? 0,
        totalUsed: serverMatch?.totalUsed ?? 0,
        isActive,
        activeRemainingSeconds: remainingSeconds,
        activeUser: serverMatch?.activeUser,
      };
    });
  }, [vaultData?.tools, activeTimers]);

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

          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-black ${
              selectedStreamer?.status === 'LIVE'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                selectedStreamer?.status === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>{selectedStreamer?.status === 'LIVE' ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          {/* Streamer Dropdown Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#141c2e] border border-white/[0.08] text-xs">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xs font-bold ring-1 ring-purple-400/50 overflow-hidden shrink-0">
              {effectiveHostAvatar ? (
                <img src={effectiveHostAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                '👑'
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 leading-none">
                {selectedStreamer?.displayName || 'المضيف'}
              </span>
              <span className="font-bold text-white text-xs leading-tight">
                @{selectedStreamer?.username || 'mohra.2000'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Center: Battle Status & Elapsed Timer */}
        <div className="hidden md:flex flex-col items-center leading-none text-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">LIVE BATTLE STATUS</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-white font-bold">{sessionTimer} elapsed</span>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {battleData?.status === 'IN_PROGRESS' || battleData?.status === 'BATTLE' ? 'جولة مشتعلة' : 'متصل بالبث المباشر'}
            </span>
          </div>
        </div>

        {/* Right: Live Viewers + Refresh / Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#141c2e] border border-white/[0.08] text-xs">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-slate-400">المشاهدين</span>
              <span className="font-mono font-bold text-white">
                {metrics?.viewers ? metrics.viewers.toLocaleString() : '0'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              loadVault();
              loadBattle();
            }}
            title="تحديث البيانات لحظياً"
            className="p-1.5 rounded-xl bg-[#141c2e] hover:bg-[#1b263e] border border-white/[0.08] text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* KPI Command Center Mini-Subheader Label */}
      <div className="text-center py-1 text-[11px] font-mono text-slate-400/80 bg-[#0d1322]/40 border-b border-white/[0.04]">
        مركز قيادة عمليات الجولات التكتيكية — TikTok Live Operations Hub
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
                  Battle Cards
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-slate-300">خزينة أدوات المعركة</span>
                <div className="text-[10px] text-slate-400">حالة الأدوات اللحظية</div>
              </div>
            </div>

            {/* Neon Buff Cards Grid (2x2) */}
            <div className="grid grid-cols-2 gap-2.5 my-auto py-2">
              {displayTools.map((tool) => {
                const isTicking = tool.isActive && tool.activeRemainingSeconds > 0;
                const dashOffset = isTicking ? Math.max(0, 100 - (tool.activeRemainingSeconds / 30) * 100) : 100;

                return (
                  <div
                    key={tool.code}
                    className={`rounded-xl bg-[#12192c] border p-3 flex flex-col items-center text-center relative overflow-hidden group transition-all shadow-lg ${
                      tool.borderColor
                    } ${tool.shadowColor}`}
                  >
                    <div className="w-full flex items-center justify-between text-left text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{tool.iconEmoji}</span>
                        <div>
                          <div className="font-bold text-white text-[11px] leading-tight">{tool.nameEn}</div>
                          <div className="text-[9px] text-slate-400">{tool.nameAr}</div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                          isTicking
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : tool.remainingCount > 0
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isTicking ? 'نشط' : tool.remainingCount > 0 ? 'متاح' : '0'}
                      </span>
                    </div>

                    {/* Radial Glow Countdown or Count Indicator */}
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
                          className={`${tool.ringColor} transition-all duration-1000`}
                          strokeDasharray={isTicking ? `${dashOffset}, 100` : '100, 100'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="font-black text-white text-base font-mono">
                          {isTicking ? `${tool.activeRemainingSeconds}s` : tool.remainingCount}
                        </span>
                        <span className="text-[8px] text-slate-400 -mt-1 font-mono">
                          {isTicking ? 'متبقي' : 'متوفر'}
                        </span>
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-between text-[10px] text-slate-400 mt-1 border-t border-white/[0.04] pt-1">
                      <span>إجمالي: {tool.totalAcquired}</span>
                      <span>مستخدم: {tool.totalUsed}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Balance Summary Footer */}
            <div className="mt-auto pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-300">
              <span className="text-[11px] text-slate-400">إجمالي رصيد الخزينة:</span>
              <span className="font-mono font-bold text-cyan-400">{totalCapacity} أداة جاهزة</span>
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
              <span className="font-bold text-white">KPI Command Center</span>
              <span className="font-bold text-slate-300">مؤشرات الأداء اللحظية</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-left">
              {/* KPI 1: Points Earned */}
              <div className="p-2.5 rounded-xl bg-[#12192c] border border-white/[0.06] relative overflow-hidden">
                <div className="text-[10px] text-slate-400 font-medium">Total Earned</div>
                <div className="text-[9px] text-slate-500">إجمالي المكتسب</div>
                <div className="text-xl font-black text-white font-mono mt-1">{totalEarned.toLocaleString()}</div>
                <div className="h-4 w-full flex items-end gap-0.5 mt-1">
                  <div className="w-1.5 h-1 bg-cyan-400/50 rounded" />
                  <div className="w-1.5 h-2 bg-cyan-400/70 rounded" />
                  <div className="w-1.5 h-3 bg-cyan-400 rounded" />
                  <div className="w-1.5 h-2 bg-cyan-400/80 rounded" />
                  <div className="w-1.5 h-4 bg-cyan-400 rounded" />
                </div>
                <span className="text-[9px] text-emerald-400 font-mono font-bold block text-right mt-0.5">
                  رصيد حي
                </span>
              </div>

              {/* KPI 2: Active Accounts */}
              <div className="p-2.5 rounded-xl bg-[#12192c] border border-white/[0.06] relative overflow-hidden">
                <div className="text-[10px] text-slate-400 font-medium">Active Users</div>
                <div className="text-[9px] text-slate-500">الداعمين النشطين</div>
                <div className="text-xl font-black text-white font-mono mt-1">{activeUsers}</div>
                <div className="h-4 w-full flex items-end gap-0.5 mt-1">
                  <div className="w-1.5 h-2 bg-purple-400/50 rounded" />
                  <div className="w-1.5 h-3 bg-purple-400/80 rounded" />
                  <div className="w-1.5 h-4 bg-purple-400 rounded" />
                  <div className="w-1.5 h-2 bg-purple-400/70 rounded" />
                </div>
                <span className="text-[9px] text-purple-400 font-mono font-bold block text-right mt-0.5">
                  حساب مسجل
                </span>
              </div>

              {/* KPI 3: Tools Used */}
              <div className="p-2.5 rounded-xl bg-[#12192c] border border-white/[0.06] relative overflow-hidden">
                <div className="text-[10px] text-slate-400 font-medium">Tools Used</div>
                <div className="text-[9px] text-slate-500">الأدوات المستهلكة</div>
                <div className="text-xl font-black text-white font-mono mt-1">{toolsUsed}</div>
                <div className="h-4 w-full flex items-end gap-0.5 mt-1">
                  <div className="w-1.5 h-1 bg-blue-400/50 rounded" />
                  <div className="w-1.5 h-2 bg-blue-400/80 rounded" />
                  <div className="w-1.5 h-3 bg-blue-400 rounded" />
                  <div className="w-1.5 h-4 bg-blue-400 rounded" />
                </div>
                <span className="text-[9px] text-blue-400 font-mono font-bold block text-right mt-0.5">
                  استخدام مؤكد
                </span>
              </div>

              {/* KPI 4: Total Vault Available */}
              <div className="p-2.5 rounded-xl bg-[#12192c] border border-white/[0.06] relative overflow-hidden">
                <div className="text-[10px] text-slate-400 font-medium">Vault Balance</div>
                <div className="text-[9px] text-slate-500">السعة المتاحة</div>
                <div className="text-xl font-black text-white font-mono mt-1">{totalCapacity}</div>
                <div className="h-4 w-full flex items-end gap-0.5 mt-1">
                  <div className="w-1.5 h-3 bg-rose-400/60 rounded" />
                  <div className="w-1.5 h-2 bg-rose-400/80 rounded" />
                  <div className="w-1.5 h-4 bg-rose-400 rounded" />
                  <div className="w-1.5 h-1 bg-rose-400/50 rounded" />
                </div>
                <span className="text-[9px] text-cyan-400 font-mono font-bold block text-right mt-0.5">
                  جاهز للإطلاق
                </span>
              </div>
            </div>
          </div>

          {/* Bottom: Arena Leaderboard with Tool Filtering */}
          <div className="rounded-2xl bg-[#0f1526]/80 border border-white/[0.08] p-3.5 flex flex-col flex-1 shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Arena Leaderboard</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold">
                  {filteredSupporters.length} داعم
                </span>
              </div>
              <span className="font-bold text-slate-300">قائمة المتصدرين والمخزون</span>
            </div>

            {/* Filter Pills for Tools */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 border-b border-white/[0.04] scrollbar-none text-xs">
              <button
                onClick={() => setSelectedToolFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 ${
                  selectedToolFilter === 'ALL'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-[#12192c] text-slate-400 hover:text-white'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setSelectedToolFilter('GLOVES')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 ${
                  selectedToolFilter === 'GLOVES'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-[#12192c] text-slate-400 hover:text-white'
                }`}
              >
                <span>🥊</span> قفازات
              </button>
              <button
                onClick={() => setSelectedToolFilter('BOOST_X3')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 ${
                  selectedToolFilter === 'BOOST_X3'
                    ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20'
                    : 'bg-[#12192c] text-slate-400 hover:text-white'
                }`}
              >
                <span>3️⃣</span> مضاعف x3
              </button>
              <button
                onClick={() => setSelectedToolFilter('BOOST_X2')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 ${
                  selectedToolFilter === 'BOOST_X2'
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-[#12192c] text-slate-400 hover:text-white'
                }`}
              >
                <span>2️⃣</span> مضاعف x2
              </button>
              <button
                onClick={() => setSelectedToolFilter('MIST')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 ${
                  selectedToolFilter === 'MIST'
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                    : 'bg-[#12192c] text-slate-400 hover:text-white'
                }`}
              >
                <span>☁️</span> ضباب
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[10px] text-slate-400 pb-2 px-2 border-b border-white/[0.04]">
              <span className="col-span-4 text-left">المستخدم</span>
              <span className="col-span-3 text-center">الأداة المخزنة</span>
              <span className="col-span-2 text-center">الحالة</span>
              <span className="col-span-3 text-right">المكتسب / المتاح</span>
            </div>

            {/* Feed Rows */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[250px] pr-1 py-1">
              {filteredSupporters.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1">
                  <span>لا توجد سجلات مطابقة في الخزينة حالياً</span>
                  <span className="text-[10px] text-slate-600">
                    يتم تسجيل الأرصدة آلياً فور التقاط بطاقات الدعم من البث
                  </span>
                </div>
              ) : (
                filteredSupporters.map((sup: any, idx: number) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;
                  const isEnigma =
                    Boolean(sup.user?.isEnigma) ||
                    (sup.user?.uniqueId && sup.user.uniqueId.toLowerCase().includes('enigma'));

                  return (
                    <div
                      key={sup.id || idx}
                      className="grid grid-cols-12 items-center p-2 rounded-xl bg-[#12192c]/90 hover:bg-[#18223c] border border-white/[0.04] text-xs transition-colors"
                    >
                      {/* User Profile */}
                      <div className="col-span-4 flex items-center gap-2">
                        <div className="relative shrink-0">
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
                            ) : isEnigma ? (
                              '🕶️'
                            ) : (
                              sup.user?.displayName?.charAt(0) || '👤'
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
                            {sup.user?.displayName || sup.user?.uniqueId || 'داعم'}
                          </span>
                          <span className="text-[9px] text-slate-400 truncate">
                            {isEnigma ? 'Enigma 🕶️' : `@${sup.user?.uniqueId || 'user'}`}
                          </span>
                        </div>
                      </div>

                      {/* Tool / Activity */}
                      <div className="col-span-3 text-center text-[10px] text-slate-300 flex items-center justify-center gap-1">
                        <span>{sup.tool?.iconEmoji || '⚡'}</span>
                        <span className="truncate">{sup.tool?.nameAr || 'أداة معركة'}</span>
                      </div>

                      {/* Status Pill */}
                      <div className="col-span-2 text-center">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                            sup.availableBalance > 0
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {sup.availableBalance > 0 ? 'متاح' : 'مستهلك'}
                        </span>
                      </div>

                      {/* Support Amount & Balance */}
                      <div className="col-span-3 flex items-center justify-end gap-1.5 font-mono text-[11px]">
                        <span className="text-slate-400 text-[10px]">
                          {Number(sup.totalAcquired || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                          🪙 {sup.availableBalance}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* ========================================================
            COLUMN 3: LIVE OPERATION STREAM & TOP CONTRIBUTORS MVP (3 Cols)
        ======================================================== */}
        <section className="lg:col-span-3 flex flex-col gap-3">
          {/* Live Stream Chat Feed */}
          <div className="rounded-2xl bg-[#0f1526]/80 border border-white/[0.08] p-3.5 flex flex-col h-[340px] shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
              <h3 className="text-xs font-bold text-white">Live Operation Stream</h3>
              <span className="text-xs font-bold text-slate-300">سجل الحركة المباشر</span>
            </div>

            {/* Search / Filter mini-bar */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="بحث في الأحداث..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 text-xs rounded-lg bg-[#12192c] border border-white/[0.06] text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Event Chat Bubbles Stream */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
              {chatFeed.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  في انتظار أحداث البث المباشر...
                </div>
              ) : (
                chatFeed
                  .filter(
                    (c) =>
                      !searchFilter ||
                      c.user.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      c.text.toLowerCase().includes(searchFilter.toLowerCase())
                  )
                  .map((msg) => (
                    <div key={msg.id} className="flex items-start gap-2 text-xs">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-[10px] shrink-0 font-bold overflow-hidden">
                        {msg.avatar ? (
                          <img src={msg.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          '⚡'
                        )}
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-[10px] text-slate-400 font-mono truncate">{msg.user}</span>
                        <div
                          className={`px-2.5 py-1 rounded-2xl rounded-tl-none border text-[11px] font-sans inline-block mt-0.5 shadow-sm ${msg.color}`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Chat Send Input Box */}
            <form onSubmit={handleSendCustomMessage} className="mt-2 flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
              <input
                type="text"
                placeholder="إرسال ملاحظة تكتيكية..."
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

          {/* Top Contributors MVP Podium (Authoritative from Live Armies) */}
          <div className="rounded-2xl bg-[#0f1526]/80 border border-white/[0.08] p-3 flex flex-col items-center shadow-xl">
            <div className="w-full flex items-center justify-between pb-1.5 mb-1 border-b border-white/[0.04]">
              <span className="text-xs font-bold text-white">Top Contributors MVP</span>
              <span className="text-[10px] text-cyan-400 font-bold">متصدرو الجولة</span>
            </div>

            {top1Contributor ? (
              /* 3D-Style Podium (2nd, 1st, 3rd) with Real Verified Contributors */
              <div className="flex items-end justify-center gap-2 w-full pt-1">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full bg-indigo-600 ring-2 ring-indigo-400 flex items-center justify-center text-xs font-bold overflow-hidden mb-1 shadow-md"
                    title={top2Contributor ? `@${top2Contributor.uniqueId} (${top2Contributor.nickname})` : 'المركز الثاني'}
                  >
                    {top2Contributor?.avatarUrl ? (
                      <img src={top2Contributor.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : top2Contributor?.isEnigma ? (
                      '🕶️'
                    ) : (
                      top2Contributor?.nickname?.charAt(0) || '🥈'
                    )}
                  </div>
                  <div className="text-[9px] text-indigo-300 font-mono font-bold max-w-[60px] truncate text-center">
                    {top2Contributor?.nickname || top2Contributor?.uniqueId || '---'}
                  </div>
                  <div className="text-[8px] text-slate-400 font-mono">
                    {top2Contributor ? `${top2Contributor.score.toLocaleString()} 💎` : '0'}
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-t from-indigo-900 to-indigo-700/80 rounded-t-lg flex items-center justify-center font-bold text-sm text-indigo-200 border-t border-indigo-400 shadow-md mt-0.5">
                    2
                  </div>
                </div>

                {/* 1st Place (Center & Highest) */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 h-10 rounded-full bg-amber-500 ring-2 ring-amber-300 flex items-center justify-center text-sm font-bold overflow-hidden mb-1 shadow-lg shadow-amber-500/30"
                    title={`@${top1Contributor.uniqueId} (${top1Contributor.nickname})`}
                  >
                    {top1Contributor.avatarUrl ? (
                      <img src={top1Contributor.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : top1Contributor.isEnigma ? (
                      '🕶️'
                    ) : (
                      top1Contributor.nickname?.charAt(0) || '🥇'
                    )}
                  </div>
                  <div className="text-[10px] text-amber-200 font-mono font-black max-w-[70px] truncate text-center">
                    {top1Contributor.nickname || top1Contributor.uniqueId}
                  </div>
                  <div className="text-[9px] text-amber-400 font-mono font-bold">
                    {top1Contributor.score.toLocaleString()} 💎
                  </div>
                  <div className="w-16 h-20 bg-gradient-to-t from-amber-700 to-amber-500/80 rounded-t-lg flex items-center justify-center font-black text-lg text-amber-100 border-t border-amber-300 shadow-lg mt-0.5">
                    1
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full bg-purple-600 ring-2 ring-purple-400 flex items-center justify-center text-xs font-bold overflow-hidden mb-1 shadow-md"
                    title={top3Contributor ? `@${top3Contributor.uniqueId} (${top3Contributor.nickname})` : 'المركز الثالث'}
                  >
                    {top3Contributor?.avatarUrl ? (
                      <img src={top3Contributor.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : top3Contributor?.isEnigma ? (
                      '🕶️'
                    ) : (
                      top3Contributor?.nickname?.charAt(0) || '🥉'
                    )}
                  </div>
                  <div className="text-[9px] text-purple-300 font-mono font-bold max-w-[60px] truncate text-center">
                    {top3Contributor?.nickname || top3Contributor?.uniqueId || '---'}
                  </div>
                  <div className="text-[8px] text-slate-400 font-mono">
                    {top3Contributor ? `${top3Contributor.score.toLocaleString()} 💎` : '0'}
                  </div>
                  <div className="w-14 h-11 bg-gradient-to-t from-purple-900 to-purple-700/80 rounded-t-lg flex items-center justify-center font-bold text-sm text-purple-200 border-t border-purple-400 shadow-md mt-0.5">
                    3
                  </div>
                </div>
              </div>
            ) : (
              /* Honest empty state when no battle contributors recorded yet */
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1 w-full">
                <Trophy className="w-6 h-6 text-slate-600" />
                <span>في انتظار مساهمات الداعمين في الجولة</span>
                <span className="text-[10px] text-slate-600">تظهر هنا منصة التتويج لحظياً أثناء اشتعال الجولة</span>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ──────────────────────────────────────────────────────────
          3. BOTTOM: VS BATTLE GAUGE (Power-O-Meter)
      ────────────────────────────────────────────────────────── */}
      <footer className="p-3 lg:px-6 border-t border-white/[0.08] bg-[#0c1220]/95 backdrop-blur-xl">
        <div className="max-w-[1920px] mx-auto flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 flex items-center gap-1.5 font-mono">
                <span>فريق المضيف (Team A)</span>
                <span className="text-slate-400">({hostPercent}%)</span>
                <span className="font-mono text-white text-sm font-extrabold">{hostScore.toLocaleString()}</span>
              </span>
              {is2v2 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  2v2 QUAD
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {is2v2 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  2v2 RIVALS
                </span>
              )}
              <span className="text-rose-400 flex items-center gap-1.5 font-mono">
                <span className="font-mono text-white text-sm font-extrabold">{rivalScore.toLocaleString()}</span>
                <span className="text-slate-400">({rivalPercent}%)</span>
                <span>فريق المنافس (Team B)</span>
              </span>
            </div>
          </div>

          {/* Neon VS Battle Gauge */}
          <div className="flex items-center gap-3">
            {/* Team A (Host Team) Avatars (Left) */}
            <div className="flex items-center -space-x-2 shrink-0">
              {/* Host Avatar */}
              <div className="relative group cursor-pointer" title={`@${hostUser.uniqueId} (${hostUser.nickname})`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 ring-2 ring-cyan-400/80 shadow-lg shadow-cyan-500/40">
                  <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-sm">
                    {effectiveHostAvatar ? (
                      <img src={effectiveHostAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '👑'
                    )}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full text-[8px] font-black bg-blue-600 text-white border border-blue-400 leading-none">
                  H
                </span>
              </div>

              {/* Host Partner Avatar (2v2) */}
              {is2v2 && (
                <div
                  className="relative group cursor-pointer"
                  title={hostPartner ? `@${hostPartner.uniqueId} (${hostPartner.nickname})` : 'شريك المضيف'}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 ring-2 ring-blue-400/70 shadow-md shadow-blue-500/30">
                    <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-xs">
                      {hostPartner?.avatarUrl ? (
                        <img src={hostPartner.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        '👤'
                      )}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full text-[8px] font-black bg-indigo-600 text-white border border-indigo-400 leading-none">
                    P
                  </span>
                </div>
              )}
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

            {/* Team B (Rival Team) Avatars (Right) */}
            <div className="flex items-center -space-x-2 shrink-0">
              {/* Rival Partner Avatar (2v2) */}
              {is2v2 && (
                <div
                  className="relative group cursor-pointer"
                  title={rivalUser2 ? `@${rivalUser2.uniqueId} (${rivalUser2.nickname})` : 'شريك الخصم'}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-rose-600 p-0.5 ring-2 ring-purple-400/70 shadow-md shadow-purple-500/30">
                    <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-xs">
                      {rivalUser2?.avatarUrl ? (
                        <img src={rivalUser2.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        '👤'
                      )}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -left-1 px-1 py-0.2 rounded-full text-[8px] font-black bg-purple-600 text-white border border-purple-400 leading-none">
                    P
                  </span>
                </div>
              )}

              {/* Rival 1 Avatar */}
              <div
                className="relative group cursor-pointer"
                title={`@${rivalUser1.uniqueId} (${rivalUser1.nickname})`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 p-0.5 ring-2 ring-rose-400/80 shadow-lg shadow-rose-500/40">
                  <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-sm">
                    {rivalUser1.avatarUrl ? (
                      <img src={rivalUser1.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '👤'
                    )}
                  </div>
                </div>
                <span className="absolute -bottom-1 -left-1 px-1 py-0.2 rounded-full text-[8px] font-black bg-rose-600 text-white border border-rose-400 leading-none">
                  R
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
