'use client';

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Sparkles,
  RefreshCw,
  Flame,
  Clock,
  History,
  TrendingUp,
  User,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  SlidersHorizontal,
  Trash2,
  Lock,
  X,
  AlertTriangle,
} from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { TacticalVaultCards, ToolItemData } from './TacticalVaultCards';
import { SupporterToolBalancesTable, SupporterBalanceRecord } from './SupporterToolBalancesTable';

interface VaultData {
  summary: {
    totalAvailable: number;
    totalUsed: number;
    totalAcquired: number;
    activeToolsCount: number;
    activeAccountsCount?: number;
  };
  tools: ToolItemData[];
  supporterBalances?: SupporterBalanceRecord[];
  activeEffects: Array<{
    id: string;
    code: string;
    nameAr: string;
    userName: string;
    userHandle?: string;
    userAvatar?: string;
    multiplier: number;
    remainingSeconds: number;
    occurredAt: string;
  }>;
  recentTransactions: Array<{
    id: string;
    transactionType: 'ACQUIRED' | 'USED';
    quantity: number;
    occurredAt: string;
    tool: {
      code: string;
      nameAr: string;
      multiplier?: number;
      durationSeconds?: number;
    };
    user: {
      userId?: string;
      uniqueId: string;
      displayName: string;
      avatarUrl?: string;
    };
    battleId?: string;
  }>;
}

export function VaultToolsManager() {
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [selectedToolCode, setSelectedToolCode] = useState<string | null>('GLOVES');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'ACQUIRED' | 'USED'>('ALL');

  // Reset Vault State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetToast, setResetToast] = useState<string | null>(null);

  const handleConfirmReset = async () => {
    if (!resetPassword) {
      setResetError('يرجى إدخال كلمة المرور');
      return;
    }
    try {
      setIsSubmittingReset(true);
      setResetError(null);
      const res = await fetch('/api/powerups/vault/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setResetError(json.message || 'كلمة المرور غير صحيحة');
        return;
      }
      setIsResetModalOpen(false);
      setResetPassword('');
      setResetToast('تم تصفير جميع بيانات المخزون بنجاح');
      setTimeout(() => setResetToast(null), 4000);
      await fetchVault();
    } catch (err: any) {
      setResetError(err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const fetchVault = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/powerups/vault');
      const json = await res.json();
      if (json.success && json.data) {
        setVaultData(json.data);
      }
    } catch (err) {
      console.error('Failed to load vault data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVault();
    const interval = setInterval(fetchVault, 5000);

    const socket = getSocket();
    const onAcquired = () => fetchVault();
    const onUsed = () => fetchVault();
    const onAlert = () => fetchVault();

    socket.on('powerup:acquired', onAcquired);
    socket.on('powerup:used', onUsed);
    socket.on('alerts:powerup', onAlert);

    return () => {
      clearInterval(interval);
      socket.off('powerup:acquired', onAcquired);
      socket.off('powerup:used', onUsed);
      socket.off('alerts:powerup', onAlert);
    };
  }, []);

  const rawTools = vaultData?.tools || [];
  // Filter out MATCH_GUIDE and THUNDER
  const tools = rawTools.filter((t) => t.code !== 'MATCH_GUIDE' && t.code !== 'THUNDER');
  const selectedTool = tools.find((t) => t.code === selectedToolCode) || null;

  const rawActiveEffects = vaultData?.activeEffects || [];
  const activeEffects = rawActiveEffects.filter((e) => e.code !== 'MATCH_GUIDE' && e.code !== 'THUNDER');

  const summary = {
    totalAvailable: tools.reduce((acc, t) => acc + t.remainingCount, 0),
    totalUsed: tools.reduce((acc, t) => acc + t.totalUsed, 0),
    totalAcquired: tools.reduce((acc, t) => acc + t.totalAcquired, 0),
    activeToolsCount: activeEffects.length,
    activeAccountsCount: 0,
  };

  // Filter supporter balances: only show approved tools with availableBalance > 0
  const allBalances = (vaultData?.supporterBalances || [])
    .filter((b) => b.tool.code !== 'MATCH_GUIDE' && b.tool.code !== 'THUNDER')
    .filter((b) => b.availableBalance > 0);

  const displayedBalances = selectedToolCode
    ? allBalances.filter((b) => b.tool.code === selectedToolCode)
    : allBalances;

  summary.activeAccountsCount = displayedBalances.length;

  const transactions = (vaultData?.recentTransactions || []).filter(
    (tx) => tx.tool.code !== 'MATCH_GUIDE' && tx.tool.code !== 'THUNDER'
  );

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'ALL') return true;
    return t.transactionType === filterType;
  });

  return (
    <div className="w-full space-y-5">
      {/* 1. Vault Top KPI Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Ready Tools in Vault */}
        <div className="p-3.5 rounded-2xl bg-[#0c1220] border border-cyan-500/20 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400">الأدوات الجاهزة بالخزينة</span>
            <div className="text-2xl font-black text-cyan-400 font-mono tabular-nums leading-none">
              {summary.totalAvailable}
            </div>
            <span className="text-[10px] text-cyan-500/80 font-medium">متاحة للإطلاق الفوري</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Active Tools Right Now */}
        <div className="p-3.5 rounded-2xl bg-[#0c1220] border border-amber-500/20 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400">الأدوات النشطة حالياً</span>
            <div className="text-2xl font-black text-amber-400 font-mono tabular-nums leading-none flex items-center gap-1.5">
              <span>{summary.activeToolsCount}</span>
              {summary.activeToolsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <span className="text-[10px] text-amber-500/80 font-medium">تأثير ساري في الجولة</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Total Tools Used */}
        <div className="p-3.5 rounded-2xl bg-[#0c1220] border border-fuchsia-500/20 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400">إجمالي المستخدم</span>
            <div className="text-2xl font-black text-fuchsia-400 font-mono tabular-nums leading-none">
              {summary.totalUsed}
            </div>
            <span className="text-[10px] text-fuchsia-500/80 font-medium">تم تفعيلها في المعارك</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Total Acquired */}
        <div className="p-3.5 rounded-2xl bg-[#0c1220] border border-emerald-500/20 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400">إجمالي المكتسب</span>
            <div className="text-2xl font-black text-emerald-400 font-mono tabular-nums leading-none">
              {summary.totalAcquired}
            </div>
            <span className="text-[10px] text-emerald-500/80 font-medium">مستلم من الدعم</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Tactical Cards - 5 Active Tools */}
      <div className="p-4 rounded-3xl bg-[#0a0f1d] border border-white/[0.08] shadow-xl">
        <TacticalVaultCards
          tools={tools}
          selectedToolCode={selectedToolCode}
          onSelectTool={(tool) => {
            setSelectedToolCode((prev) => (prev === tool.code ? null : tool.code));
          }}
          onResetVault={() => {
            setIsResetModalOpen(true);
            setResetPassword('');
            setResetError(null);
          }}
        />
      </div>

      {/* 3. Supporter Tool Balances Table - Filtered by Clicked Tool */}
      <SupporterToolBalancesTable
        balances={displayedBalances}
        activeAccountsCount={displayedBalances.length}
        selectedTool={selectedTool}
        onClearFilter={() => setSelectedToolCode(null)}
      />

      {/* 4. Operational Two-Column Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (5 Cols): Selected Tool Detailed Inspector */}
        <div className="lg:col-span-5 space-y-4">
          {selectedTool ? (
            <div className="p-4 rounded-3xl bg-[#0a0f1d] border border-white/[0.08] space-y-4">
              {/* Tool Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl ${selectedTool.iconBg} flex items-center justify-center text-2xl shadow-inner border border-white/20`}
                  >
                    {selectedTool.iconEmoji}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-100">{selectedTool.nameAr}</h3>
                    <div className="text-xs font-mono text-cyan-400 tracking-wider">
                      {selectedTool.code} • {selectedTool.type}
                    </div>
                  </div>
                </div>

                <div
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${selectedTool.badgeColor}`}
                >
                  {selectedTool.badgeText}
                </div>
              </div>

              {/* Description & Tactical Advice */}
              <div className="p-3 rounded-2xl bg-[#070a12] border border-white/[0.04] text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-slate-200">التأثير التكتيكي: </span>
                {selectedTool.description}
              </div>

              {/* Stock Details & Ratios */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[#070a12] border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 mb-0.5">المتوفر بالخزينة</div>
                  <div className="text-lg font-black text-cyan-400 font-mono tabular-nums">
                    {selectedTool.remainingCount}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#070a12] border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 mb-0.5">المستخدم</div>
                  <div className="text-lg font-black text-fuchsia-400 font-mono tabular-nums">
                    {selectedTool.totalUsed}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#070a12] border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 mb-0.5">إجمالي المكتسب</div>
                  <div className="text-lg font-black text-emerald-400 font-mono tabular-nums">
                    {selectedTool.totalAcquired}
                  </div>
                </div>
              </div>

              {/* Usage Progress Gauge */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>نسبة الاستهلاك التكتيكي</span>
                  <span className="text-slate-200 font-bold">
                    {selectedTool.totalAcquired > 0
                      ? Math.round((selectedTool.totalUsed / selectedTool.totalAcquired) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden flex border border-white/[0.04]">
                  <div
                    style={{
                      width: `${
                        selectedTool.totalAcquired > 0
                          ? (selectedTool.remainingCount / selectedTool.totalAcquired) * 100
                          : 0
                      }%`,
                    }}
                    className="h-full bg-cyan-500 transition-all duration-300"
                  />
                  <div
                    style={{
                      width: `${
                        selectedTool.totalAcquired > 0
                          ? (selectedTool.totalUsed / selectedTool.totalAcquired) * 100
                          : 0
                      }%`,
                    }}
                    className="h-full bg-fuchsia-600 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Top Supporters holding/funding this tool */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>أبرز الداعمين الممولين للأداة</span>
                  <span className="text-[10px] font-mono text-slate-500">حملة الأدوات</span>
                </div>

                {selectedTool.topHolders && selectedTool.topHolders.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedTool.topHolders.map((holder, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-[#070a12] border border-white/[0.04] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-[10px] text-cyan-400">
                            {holder.avatarUrl ? (
                              <img src={holder.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              holder.uniqueId?.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-200 truncate max-w-[130px]">
                              {holder.displayName}
                            </div>
                            <div dir="ltr" className="text-[10px] text-slate-500 font-mono">
                              @{holder.uniqueId}
                            </div>
                          </div>
                        </div>

                        <div className="text-left font-mono">
                          <span className="text-xs font-bold text-cyan-400 tabular-nums">
                            {holder.quantity}
                          </span>
                          <span className="text-[10px] text-slate-500 mr-1">أداة</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#070a12] border border-dashed border-white/[0.06] text-center text-xs text-slate-500">
                    لا يوجد حائزين حاليين لهذه الأداة
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Active Effects Card */}
          {activeEffects.length > 0 && (
            <div className="p-4 rounded-3xl bg-[#0a0f1d] border border-amber-500/30 shadow-lg shadow-amber-500/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-400">
                  <Flame className="w-4 h-4 animate-bounce" />
                  <span className="text-xs font-bold">أدوات نشطة بالبث حالياً ({activeEffects.length})</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </div>

              <div className="space-y-2">
                {activeEffects.map((effect) => (
                  <div
                    key={effect.id}
                    className="p-3 rounded-xl bg-[#070a12] border border-amber-500/20 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-100">{effect.nameAr}</div>
                      <div className="text-[10px] text-slate-400">
                        مفعل بواسطة: <span className="text-cyan-400 font-bold">{effect.userName}</span>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <div className="text-sm font-black text-amber-400 tabular-nums animate-pulse">
                        {effect.remainingSeconds} ثانية
                      </div>
                      <div className="text-[9px] text-slate-500">متبقي على الانتهاء</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Real-time Audit & Operations Stream */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-3xl bg-[#0a0f1d] border border-white/[0.08] shadow-xl space-y-3 flex flex-col h-full min-h-[500px]">
            {/* Table Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-100">
                  سجل حركة واستخدام الأدوات اللحظي (Live Operations Stream)
                </h3>
              </div>

              {/* Action Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    filterType === 'ALL'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-[#070a12] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  الكل ({transactions.length})
                </button>
                <button
                  onClick={() => setFilterType('ACQUIRED')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    filterType === 'ACQUIRED'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-[#070a12] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  اكتساب
                </button>
                <button
                  onClick={() => setFilterType('USED')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    filterType === 'USED'
                      ? 'bg-fuchsia-500 text-slate-950 font-bold'
                      : 'bg-[#070a12] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  استخدام
                </button>
                <button
                  onClick={fetchVault}
                  title="تحديث فوري"
                  className="p-1 rounded-lg bg-[#070a12] text-slate-400 hover:text-cyan-400 border border-white/[0.06]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Scrollable Audit Feed */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[580px]">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => {
                  const isUsed = tx.transactionType === 'USED';
                  const dateStr = new Date(tx.occurredAt).toLocaleTimeString('ar-SA', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-[#070a12] border border-white/[0.04] hover:border-white/[0.1] transition-all flex items-center justify-between gap-3 text-xs"
                    >
                      {/* Left: Action Icon + User + Tool Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                            isUsed
                              ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {isUsed ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-200 truncate">
                              {tx.user.displayName || tx.user.uniqueId}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              @{tx.user.uniqueId}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                                isUsed
                                  ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {isUsed ? 'تفعيل أداة' : 'استلام أداة'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span className="text-cyan-400 font-semibold">{tx.tool.nameAr}</span>
                            <span className="text-slate-600">•</span>
                            <span className="font-mono text-slate-500">{tx.tool.code}</span>
                            {tx.quantity > 1 && (
                              <span className="text-slate-300 font-bold font-mono">
                                x{tx.quantity}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Timestamp */}
                      <div className="text-left shrink-0 font-mono text-[10px] text-slate-500">
                        {dateStr}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Shield className="w-10 h-10 text-slate-700 mb-2 stroke-[1.5]" />
                  <p className="text-xs">لا توجد حركات مسجلة حالياً في هذا التصنيف</p>
                  <span className="text-[10px] text-slate-600 mt-1">
                    يتم تسجيل أي قفازات، مضاعفات، أو أدوات تكتيكية لحظياً
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Toast */}
      {resetToast && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resetToast}</span>
        </div>
      )}

      {/* Password Confirmation Modal for Vault Reset */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[#0c1220] border border-rose-500/30 p-6 shadow-2xl shadow-rose-950/50 space-y-5 text-right select-none">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsResetModalOpen(false);
                setResetPassword('');
                setResetError(null);
              }}
              className="absolute top-4 left-4 p-1 rounded-xl bg-white/[0.04] text-slate-400 hover:text-slate-100 hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header / Icon */}
            <div className="flex items-start gap-3 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100">
                  تأكيد تصفير بيانات المخزون
                </h3>
                <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                  تحذير: سيتم حذف وتصفير جميع أرصدة الأدوات وسجلات حركات الداعمين بالكامل للبدء من جديد.
                </p>
              </div>
            </div>

            {/* Password Input Section */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-300">
                أدخل كلمة المرور لتأكيد العملية:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => {
                    setResetPassword(e.target.value);
                    setResetError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmReset();
                  }}
                  placeholder="••••"
                  autoFocus
                  maxLength={10}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#060912] border border-white/10 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20 text-center text-lg font-mono tracking-widest text-slate-100 outline-none transition-all placeholder:text-slate-600"
                />
                <div className="absolute right-3 top-3 text-slate-500 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
              </div>

              {resetError && (
                <div className="text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 rounded-xl py-1.5 px-3 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3">
              <button
                disabled={isSubmittingReset || !resetPassword}
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-rose-950/40 disabled:text-slate-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmittingReset ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>تأكيد التصفير النهائي</span>
              </button>

              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetPassword('');
                  setResetError(null);
                }}
                className="py-2.5 px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-bold text-xs border border-white/10 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
