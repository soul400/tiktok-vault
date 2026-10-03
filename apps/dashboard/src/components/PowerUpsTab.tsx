'use client';

import React, { useEffect, useState } from 'react';
import { formatRiyadhDateTime } from '@aep/shared';
import {
  Zap,
  Shield,
  Flame,
  Clock,
  Layers,
  Archive,
  History,
  CheckCircle2,
  Sparkles,
  Box,
  ArrowUpRight,
  TrendingUp,
  PackageCheck,
  Award,
} from 'lucide-react';
import { getSocket } from '../lib/socket';

export function PowerUpsTab() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [overview, setOverview] = useState<any | null>(null);
  const [weeklySnapshots, setWeeklySnapshots] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'inventory' | 'transactions' | 'weekly'>('inventory');

  const fetchData = async () => {
    try {
      const [catRes, overRes, weekRes] = await Promise.all([
        fetch('/api/powerups/catalog'),
        fetch('/api/powerups/overview'),
        fetch('/api/powerups/weekly'),
      ]);
      const catData = await catRes.json();
      const overData = await overRes.json();
      const weekData = await weekRes.json();

      if (catData.success) setCatalog(catData.data);
      if (overData.success) setOverview(overData.data);
      if (weekData.success) setWeeklySnapshots(weekData.data);
    } catch (err) {
      console.error('Failed to fetch powerups data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);

    const socket = getSocket();
    const onPowerupUpdate = () => {
      fetchData();
    };

    socket.on('powerup:acquired', onPowerupUpdate);
    socket.on('powerup:used', onPowerupUpdate);

    return () => {
      clearInterval(interval);
      socket.off('powerup:acquired', onPowerupUpdate);
      socket.off('powerup:used', onPowerupUpdate);
    };
  }, []);

  const getToolTheme = (code: string) => {
    switch (code) {
      case 'GLOVES':
        return {
          icon: '🥊',
          bg: 'from-rose-500/10 via-red-500/5 to-rose-500/10',
          border: 'border-rose-400/40 hover:border-rose-500',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          text: 'text-rose-600',
          shadow: 'shadow-rose-500/10',
        };
      case 'THUNDER':
        return {
          icon: '⚡',
          bg: 'from-amber-500/10 via-yellow-500/5 to-amber-500/10',
          border: 'border-amber-400/40 hover:border-amber-500',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          text: 'text-amber-600',
          shadow: 'shadow-amber-500/10',
        };
      case 'MIST':
        return {
          icon: '🌫️',
          bg: 'from-purple-500/10 via-indigo-500/5 to-purple-500/10',
          border: 'border-purple-400/40 hover:border-purple-500',
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
          text: 'text-purple-600',
          shadow: 'shadow-purple-500/10',
        };
      case 'BOOST_X2':
        return {
          icon: '×2',
          bg: 'from-blue-500/10 via-cyan-500/5 to-blue-500/10',
          border: 'border-blue-400/40 hover:border-blue-500',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          text: 'text-blue-600',
          shadow: 'shadow-blue-500/10',
        };
      case 'BOOST_X3':
        return {
          icon: '×3',
          bg: 'from-fuchsia-500/10 via-pink-500/5 to-fuchsia-500/10',
          border: 'border-fuchsia-400/40 hover:border-fuchsia-500',
          badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
          text: 'text-fuchsia-600',
          shadow: 'shadow-fuchsia-500/10',
        };
      case 'EXTRA_TIME':
        return {
          icon: '⏳',
          bg: 'from-emerald-500/10 via-teal-500/5 to-emerald-500/10',
          border: 'border-emerald-400/40 hover:border-emerald-500',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          text: 'text-emerald-600',
          shadow: 'shadow-emerald-500/10',
        };
      default:
        return {
          icon: '📜',
          bg: 'from-indigo-500/10 via-blue-500/5 to-indigo-500/10',
          border: 'border-indigo-400/40 hover:border-indigo-500',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          text: 'text-indigo-600',
          shadow: 'shadow-indigo-500/10',
        };
    }
  };

  const POWERUP_NAMES: Record<string, string> = {
    GLOVES: 'قفازات المعركة (الضربة القاضية)',
    MIST: 'ضباب المعركة (حجب النقاط)',
    THUNDER: 'صاعقة الرعد',
    BOOST_X2: 'مضاعف النقاط ×2',
    BOOST_X3: 'مضاعف النقاط ×3',
    EXTRA_TIME: 'الوقت الإضافي',
    MATCH_GUIDE: 'دليل استراتيجية المعركة',
    POTION: 'جرعة الحماس',
  };

  const getToolDisplayName = (tool: any) => {
    if (!tool) return 'أداة معركة';
    if (!tool.nameAr || tool.nameAr.includes('?')) {
      return POWERUP_NAMES[tool.code] || tool.nameEn || tool.code;
    }
    return tool.nameAr;
  };

  const totalHolders = overview?.topHolders?.length || 0;
  const totalAvailableTools = overview?.topHolders?.reduce((sum: number, h: any) => sum + (h.quantity || 0), 0) || 0;
  const totalTx = overview?.totalTransactions || 0;

  return (
    <div dir="rtl" className="space-y-6">
      {/* 1. Golden Command Vault Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#11192e] via-[#1a233d] to-[#0f172a] border border-amber-500/40 p-6 text-white shadow-xl shadow-amber-500/5">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
              <Zap className="w-7 h-7 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black tracking-tight text-white">
                  خزينة أدوات المعركة النشطة
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 font-mono font-black tracking-wider">
                  LIVE VAULT PRO
                </span>
              </div>
              <p className="text-xs text-amber-100/80 font-medium mt-1">
                رصد فوري لحيازة القفازات ومضاعفات النقاط بدقة حسابية كاملة وتوثيق فوري لكل جولة
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200">
              <PackageCheck className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-amber-200/70 font-semibold">الأدوات المتاحة</div>
                <div className="text-sm font-black text-amber-300 font-mono">{totalAvailableTools} أداة</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-400/40 text-blue-200">
              <Award className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-[10px] text-blue-200/70 font-semibold">الداعمين المالكين</div>
                <div className="text-sm font-black text-blue-300 font-mono">{totalHolders} حساب</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200">
              <History className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] text-emerald-200/70 font-semibold">حركات الاستخدام</div>
                <div className="text-sm font-black text-emerald-300 font-mono">{totalTx} حركة</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Visual Catalog Grid with Distinct Jewel Colors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {catalog.map((tool) => {
          const theme = getToolTheme(tool.code);
          return (
            <div
              key={tool.id}
              className={`rounded-2xl border p-4 text-center bg-gradient-to-b ${theme.bg} ${theme.border} shadow-sm transition-all hover:scale-[1.02] hover:shadow-md flex flex-col items-center justify-between group`}
            >
              <div className="w-13 h-13 mx-auto mb-2.5 rounded-2xl bg-white/90 border border-white shadow-md flex items-center justify-center text-2xl group-hover:rotate-6 transition-transform">
                {theme.icon}
              </div>
              <h3 className="text-xs font-black text-slate-800 truncate w-full">{getToolDisplayName(tool)}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">{tool.code}</p>
              <div className={`mt-2.5 w-full text-[10px] font-black rounded-lg py-1 border ${theme.badge}`}>
                {tool.multiplier > 1 ? `مضاعف ${tool.multiplier}x` : `${tool.durationSeconds} ثانية`}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Subtabs Switcher with Gold Theme */}
      <div className="flex items-center gap-2 bg-amber-50/60 p-1.5 rounded-2xl border border-amber-200/70 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setViewMode('inventory')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-black ${
            viewMode === 'inventory'
              ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white shadow-md shadow-amber-500/25'
              : 'text-amber-900/70 hover:text-amber-950 hover:bg-amber-100/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>خزينة المخزون الحي (Live Inventory)</span>
        </button>
        <button
          onClick={() => setViewMode('transactions')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-black ${
            viewMode === 'transactions'
              ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white shadow-md shadow-amber-500/25'
              : 'text-amber-900/70 hover:text-amber-950 hover:bg-amber-100/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>دفتر القيود المحاسبي (Transaction Ledger)</span>
        </button>
        <button
          onClick={() => setViewMode('weekly')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-black ${
            viewMode === 'weekly'
              ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white shadow-md shadow-amber-500/25'
              : 'text-amber-900/70 hover:text-amber-950 hover:bg-amber-100/60'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>الأرشيف الأسبوعي المجمع (Weekly Snapshots)</span>
        </button>
      </div>

      {/* 4. Tab 1: Live Inventory Table */}
      {viewMode === 'inventory' && (
        <div className="bg-white border border-amber-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Box className="w-4 h-4 text-amber-500" />
                أرصدة الأدوات للداعمين والمستخدمين في المعركة
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تحديث لحظي لعدد القفازات والأدوات المحمولة مع كل جولة
              </p>
            </div>
            <span className="text-xs font-mono font-black text-amber-900 bg-amber-100/80 border border-amber-300 px-3.5 py-1.5 rounded-xl shadow-inner">
              {totalHolders} حسابات نشطة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-amber-100 bg-amber-50/50 text-amber-950 font-black">
                  <th className="py-3.5 px-4 rounded-r-xl">الداعم / المستخدم</th>
                  <th className="py-3.5 px-4">الأداة</th>
                  <th className="py-3.5 px-4 text-center">الرصيد المتاح</th>
                  <th className="py-3.5 px-4 text-center">إجمالي ما تم حيازته</th>
                  <th className="py-3.5 px-4 text-center">المستخدم منها</th>
                  <th className="py-3.5 px-4 rounded-l-xl">آخر حيازة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {overview?.topHolders && overview.topHolders.length > 0 ? (
                  overview.topHolders.map((item: any) => {
                    const theme = getToolTheme(item.powerUp?.code);
                    return (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3 px-4 font-sans font-bold text-slate-800 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-900 font-bold flex items-center justify-center text-xs shadow-sm overflow-hidden border border-amber-300">
                            {item.user?.avatarUrl ? (
                              <img src={item.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (item.user?.nickname || item.user?.uniqueId || '?')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900">@{item.user?.uniqueId || 'مستخدم'}</div>
                            {item.user?.nickname && item.user.nickname !== item.user.uniqueId && (
                              <div className="text-[10px] text-slate-400 font-normal">{item.user.nickname}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center gap-2 font-bold text-slate-800">
                            <span className="text-lg">{theme.icon}</span>
                            <span>{getToolDisplayName(item.powerUp)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-3 py-1 rounded-xl bg-amber-500 text-white font-black text-sm shadow-sm shadow-amber-500/30">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-700 font-bold">{item.totalAcquired}</td>
                        <td className="py-3 px-4 text-center text-slate-700 font-bold">{item.totalUsed}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] font-sans">
                          {item.lastAcquiredAt ? formatRiyadhDateTime(item.lastAcquiredAt) : '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 font-sans text-xs">
                      <PackageCheck className="w-8 h-8 mx-auto text-amber-300 mb-2" />
                      لا توجد أدوات نشطة في المخزون حالياً. الأدوات تُرصد فور حصول الداعمين عليها في الجولات.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Transaction Ledger */}
      {viewMode === 'transactions' && (
        <div className="bg-white border border-amber-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                سجل قيود الحركات المحاسبية للأدوات
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                كل عملية اكتساب أو استخدام تُقيد كحركة تدقيقية موثقة
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl">
              إجمالي الحركات: {overview?.totalTransactions || 0}
            </span>
          </div>

          <div className="space-y-2.5">
            {overview?.recentUsage && overview.recentUsage.length > 0 ? (
              overview.recentUsage.map((tx: any, idx: number) => {
                const theme = getToolTheme(tx.powerUp?.code);
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-amber-100 bg-amber-50/30 hover:bg-amber-50/70 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-white shadow-sm border border-amber-200 flex items-center justify-center text-lg">
                        {theme.icon}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">
                          استخدم <span className="text-blue-600 font-black">@{tx.user?.uniqueId || 'داعم'}</span> أداة{' '}
                          <span className="font-black text-slate-900">{getToolDisplayName(tx.powerUp)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {tx.usedAt ? formatRiyadhDateTime(tx.usedAt) : ''}
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                      تم الاستخدام بنجاح
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                لا توجد حركات استخدام مسجلة في الجولة الحالية.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Tab 3: Weekly Snapshots */}
      {viewMode === 'weekly' && (
        <div className="bg-white border border-amber-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Archive className="w-4 h-4 text-emerald-500" />
                ملخصات وأرشيف التسويات الأسبوعية
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تجميع تراكمي لمجموع ما تم تداوله من أدوات على مستوى الأسابيع
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {weeklySnapshots.length > 0 ? (
              weeklySnapshots.map((snap: any, i: number) => (
                <div key={i} className="p-5 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-white text-xs space-y-2.5 shadow-sm">
                  <div className="font-black text-slate-800 flex items-center justify-between">
                    <span className="text-sm">أسبوع #{snap.weekNumber || i + 1}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">{snap.year || 2026}</span>
                  </div>
                  <div className="text-slate-600 flex justify-between pt-1 border-t border-amber-100">
                    <span>إجمالي المكتسب:</span>
                    <span className="font-black text-amber-600 font-mono text-sm">{snap.totalAcquired || 0}</span>
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>إجمالي المستخدم:</span>
                    <span className="font-black text-blue-600 font-mono text-sm">{snap.totalUsed || 0}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-slate-400 text-xs">
                لا توجد أرشيفات أسبوعية سابقة محفوظة بعد.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
