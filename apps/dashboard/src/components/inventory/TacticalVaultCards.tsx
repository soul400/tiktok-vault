'use client';

import React from 'react';
import { Sparkles, Clock, Flame, ShieldAlert, CheckCircle2, Trash2 } from 'lucide-react';

export interface ToolItemData {
  code: string;
  nameAr: string;
  nameEn: string;
  badgeText: string;
  badgeColor: string;
  borderColor: string;
  glowColor: string;
  iconBg: string;
  iconEmoji: string;
  type: string;
  multiplier: number;
  durationSeconds: number;
  description: string;
  remainingCount: number;
  totalAcquired: number;
  totalUsed: number;
  isActive: boolean;
  activeRemainingSeconds: number;
  activeUser?: string;
  topHolders?: Array<{
    userId: string;
    uniqueId: string;
    displayName: string;
    avatarUrl?: string;
    quantity: number;
  }>;
}

interface TacticalVaultCardsProps {
  tools: ToolItemData[];
  onSelectTool?: (tool: ToolItemData) => void;
  selectedToolCode?: string | null;
  onResetVault?: () => void;
}

export function TacticalVaultCards({ tools, onSelectTool, selectedToolCode, onResetVault }: TacticalVaultCardsProps) {
  // Filter out MATCH_GUIDE and THUNDER — only keep the 5 battle tools
  const HIDDEN_CODES = ['MATCH_GUIDE', 'THUNDER'];
  const visibleTools = tools.filter((t) => !HIDDEN_CODES.includes(t.code));

  return (
    <div className="w-full space-y-3">
      {/* Header Label */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
            خزينة أدوات المعركة التكتيكية (Battle Power-Up Vault)
          </h2>
          <span className="text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
            {visibleTools.length} أدوات معتمدة
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            انقر على أي أداة لعرض أرصدتها وسجل استخدامها بالجدول أدناه
          </div>
          {onResetVault && (
            <button
              onClick={onResetVault}
              title="تصفير بيانات المخزون والحركات"
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all shadow-sm group select-none"
            >
              <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>تصفير المخزون</span>
            </button>
          )}
        </div>
      </div>

      {/* 5 Tactical Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {visibleTools.map((tool) => {
          const isSelected = selectedToolCode === tool.code;
          const hasRemaining = tool.remainingCount > 0;

          return (
            <div
              key={tool.code}
              onClick={() => onSelectTool && onSelectTool(tool)}
              className={`relative cursor-pointer rounded-2xl bg-[#0c1220]/90 border transition-all duration-200 p-3.5 flex flex-col justify-between items-center text-center select-none group min-h-[175px] ${
                tool.borderColor
              } ${
                isSelected
                  ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20 bg-[#111a2f]'
                  : 'hover:bg-[#10182b] hover:scale-[1.02]'
              } ${tool.isActive ? 'border-amber-400 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/20' : ''}`}
            >
              {/* Active Indicator Flare */}
              {tool.isActive && (
                <div className="absolute -top-1.5 -right-1.5 flex items-center gap-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full shadow animate-bounce">
                  <Flame className="w-2.5 h-2.5" />
                  <span>نشط ({tool.activeRemainingSeconds}ث)</span>
                </div>
              )}

              {/* Top Circular Icon */}
              <div className="relative mb-2.5">
                <div
                  className={`w-12 h-12 rounded-full ${tool.iconBg} flex items-center justify-center text-2xl shadow-inner border border-white/20 transition-transform group-hover:scale-110`}
                >
                  {tool.iconEmoji}
                </div>
                {/* Stock Counter Badge */}
                <div
                  className={`absolute -bottom-1 -left-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black border shadow-sm ${
                    hasRemaining
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                      : 'bg-slate-800 text-slate-400 border-white/10'
                  }`}
                >
                  {tool.remainingCount}
                </div>
              </div>

              {/* Title & English Code */}
              <div className="space-y-0.5 mb-2 w-full">
                <div className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                  {tool.nameAr}
                </div>
                <div className="text-[10px] font-mono text-slate-500 tracking-wider truncate">
                  {tool.code}
                </div>
              </div>

              {/* Bottom Pill Badge - Exact match with reference image */}
              <div className="w-full pt-1">
                <div
                  className={`w-full py-1 px-2 rounded-xl text-center font-bold text-xs font-mono border shadow-sm transition-all ${
                    tool.badgeColor
                  } ${
                    tool.isActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      : ''
                  }`}
                >
                  {tool.isActive ? `نشط (${tool.activeRemainingSeconds}ث)` : tool.badgeText}
                </div>
              </div>

              {/* Mini Stats Bar */}
              <div className="w-full mt-2 pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-slate-400 tabular-nums">
                <span title="إجمالي المستخدم">مستخدم: {tool.totalUsed}</span>
                <span title="إجمالي المكتسب">مكتسب: {tool.totalAcquired}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
