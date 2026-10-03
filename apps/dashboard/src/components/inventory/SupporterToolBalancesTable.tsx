'use client';

import React from 'react';
import { Box, User, Sparkles } from 'lucide-react';

export interface SupporterBalanceRecord {
  id: string;
  user: {
    userId?: string;
    uniqueId: string;
    displayName: string;
    avatarUrl?: string;
  };
  tool: {
    code: string;
    nameAr: string;
    iconEmoji: string;
  };
  availableBalance: number;
  totalAcquired: number;
  totalUsed: number;
  lastAcquiredAt: string;
}

interface SupporterToolBalancesTableProps {
  balances: SupporterBalanceRecord[];
  activeAccountsCount?: number;
  selectedTool?: {
    code: string;
    nameAr: string;
    iconEmoji: string;
  } | null;
  onClearFilter?: () => void;
}

export function SupporterToolBalancesTable({
  balances,
  activeAccountsCount,
  selectedTool,
  onClearFilter,
}: SupporterToolBalancesTableProps) {
  const visibleBalances = balances.filter((b) => b.availableBalance > 0);
  const count = activeAccountsCount ?? visibleBalances.length;

  return (
    <div className="w-full rounded-3xl bg-[#090e1c] border border-amber-500/20 shadow-2xl p-5 lg:p-7 space-y-6">
      {/* Header matching the reference image */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Right (in RTL): Title + Icon + Subtitle */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Box className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
                <span>
                  {selectedTool
                    ? `أرصدة ${selectedTool.nameAr} ${selectedTool.iconEmoji} للداعمين`
                    : 'أرصدة الأدوات للداعمين والمستخدمين في المعركة'}
                </span>
              </h2>
              {selectedTool && onClearFilter && (
                <button
                  onClick={onClearFilter}
                  className="text-[11px] font-mono font-semibold text-cyan-400 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 px-2.5 py-0.5 rounded-lg border border-cyan-500/30 transition-colors"
                >
                  عرض جميع الأدوات
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedTool
                ? `عرض مخصص لأرصدة وحركات ${selectedTool.nameAr} فقط (${count} حساب داعم)`
                : 'تحديث لحظي لعدد القفازات والأدوات المحمولة مع كل جولة'}
            </p>
          </div>
        </div>

        {/* Left (in RTL): Golden Active Accounts Badge */}
        <div className="px-4 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono font-bold text-xs shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{count} حسابات نشطة</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-amber-500/10 text-slate-400 text-xs font-bold select-none">
              <th className="pb-3.5 pr-3 font-bold text-slate-300">الداعم / المستخدم</th>
              <th className="pb-3.5 text-center font-bold text-slate-300">الأداة</th>
              <th className="pb-3.5 text-center font-bold text-slate-300">الرصيد المتاح</th>
              <th className="pb-3.5 text-center font-bold text-slate-300">إجمالي ما تم حيازته</th>
              <th className="pb-3.5 text-center font-bold text-slate-300">المستخدم منها</th>
              <th className="pb-3.5 pl-3 text-left font-bold text-slate-300">آخر حيازة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-xs">
            {visibleBalances.length > 0 ? (
              visibleBalances.map((record) => {
                const u = record.user;
                const initial = u.uniqueId ? u.uniqueId.slice(0, 2).toUpperCase() : '??';

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-white/[0.02] transition-colors duration-150 group"
                  >
                    {/* 1. الداعم / المستخدم */}
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-xs text-amber-300 shrink-0 shadow-inner">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            initial
                          )}
                        </div>

                        {/* Handles */}
                        <div className="min-w-0">
                          <div dir="ltr" className="font-bold text-slate-100 group-hover:text-amber-300 transition-colors text-xs truncate">
                            @{u.uniqueId}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                            {u.displayName || u.uniqueId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. الأداة */}
                    <td className="py-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-base">{record.tool.iconEmoji || '🥊'}</span>
                        <span className="font-bold text-slate-200 text-xs">
                          {record.tool.nameAr}
                        </span>
                      </div>
                    </td>

                    {/* 3. الرصيد المتاح (Orange/Amber Badge exactly like image) */}
                    <td className="py-3.5 text-center">
                      <div className="inline-flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-xs flex items-center justify-center shadow-md shadow-amber-500/20">
                          {record.availableBalance}
                        </div>
                      </div>
                    </td>

                    {/* 4. إجمالي ما تم حيازته */}
                    <td className="py-3.5 text-center font-mono font-bold text-slate-200 tabular-nums">
                      {record.totalAcquired}
                    </td>

                    {/* 5. المستخدم منها */}
                    <td className="py-3.5 text-center font-mono font-bold text-slate-400 tabular-nums">
                      {record.totalUsed}
                    </td>

                    {/* 6. آخر حيازة */}
                    <td className="py-3.5 pl-3 text-left font-mono text-[11px] text-slate-400 tabular-nums">
                      {record.lastAcquiredAt}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <Box className="w-8 h-8 text-slate-700 mx-auto mb-2 stroke-[1.5]" />
                  <p className="text-xs">
                    {selectedTool
                      ? `لا توجد أرصدة مسجلة حالياً لأداة ${selectedTool.nameAr}`
                      : 'لا توجد أرصدة أدوات مسجلة حالياً للداعمين'}
                  </p>
                  <span className="text-[10px] text-slate-600">
                    {selectedTool
                      ? `سيتم إدراج أي داعم يحصل على ${selectedTool.nameAr} فوراً وبشكل لحظي`
                      : 'سيتم إدراج أي داعم يقوم بإرسال قفاز أو أداة معركة فوراً وبشكل لحظي'}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
