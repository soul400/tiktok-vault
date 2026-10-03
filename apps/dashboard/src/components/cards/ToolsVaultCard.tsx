'use client';

import React, { useEffect, useState } from 'react';
import { Package, Zap, Shield, Bomb, Target, Star, ArrowLeft, Sparkles } from 'lucide-react';
import { getSocket } from '../../lib/socket';

interface ToolsVaultCardProps {
  onManageTools?: () => void;
}

interface CatalogTool {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  multiplier: number;
  durationSeconds: number;
}

interface InventoryItem {
  quantity: number;
  totalAcquired: number;
  totalUsed: number;
  lastAcquiredAt: string | null;
  lastUsedAt: string | null;
  user: { uniqueId: string; nickname: string };
  powerUp: { code: string; nameAr: string };
}

const POWERUP_NAMES: Record<string, string> = {
  GLOVES: 'القفاز',
  MIST: 'الضباب',
  THUNDER: 'البرق',
  BOOST_X2: '×2',
  BOOST_X3: '×3',
  EXTRA_TIME: 'الوقت',
  MATCH_GUIDE: 'الدليل',
  POTION: 'الجرعة',
};

const TOOL_ICONS: Record<string, string> = {
  GLOVES: '🥊',
  MIST: '🌫️',
  THUNDER: '⚡',
  BOOST_X2: '×2',
  BOOST_X3: '×3',
  EXTRA_TIME: '⏳',
  MATCH_GUIDE: '📜',
  POTION: '🧪',
};

const TOOL_COLORS: Record<string, string> = {
  GLOVES: 'text-rose-500 bg-rose-50 border-rose-200',
  MIST: 'text-slate-500 bg-slate-50 border-slate-200',
  THUNDER: 'text-amber-500 bg-amber-50 border-amber-200',
  BOOST_X2: 'text-blue-500 bg-blue-50 border-blue-200',
  BOOST_X3: 'text-red-500 bg-red-50 border-red-200',
  EXTRA_TIME: 'text-emerald-500 bg-emerald-50 border-emerald-200',
  MATCH_GUIDE: 'text-indigo-500 bg-indigo-50 border-indigo-200',
  POTION: 'text-purple-500 bg-purple-50 border-purple-200',
};

export function ToolsVaultCard({ onManageTools }: ToolsVaultCardProps) {
  const [catalog, setCatalog] = useState<CatalogTool[]>([]);
  const [overview, setOverview] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [catRes, overRes] = await Promise.all([
        fetch('/api/powerups/catalog'),
        fetch('/api/powerups/overview'),
      ]);
      const catData = await catRes.json();
      const overData = await overRes.json();
      if (catData.success) setCatalog(catData.data);
      if (overData.success) setOverview(overData.data);
    } catch (err) {
      console.error('Failed to fetch powerups:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);

    const socket = getSocket();
    const onUpdate = () => fetchData();
    socket.on('powerup:acquired', onUpdate);
    socket.on('powerup:used', onUpdate);

    return () => {
      clearInterval(interval);
      socket.off('powerup:acquired', onUpdate);
      socket.off('powerup:used', onUpdate);
    };
  }, []);

  // Build counts from overview topHolders
  const holdersByCode: Record<string, number> = {};
  if (overview?.topHolders) {
    for (const h of overview.topHolders) {
      const code = h.powerUp?.code || 'UNKNOWN';
      holdersByCode[code] = (holdersByCode[code] || 0) + h.quantity;
    }
  }

  // Build tool display list from catalog
  const toolsDisplay = catalog.slice(0, 7).map((t) => ({
    code: t.code,
    name: POWERUP_NAMES[t.code] || t.nameAr || t.nameEn || t.code,
    icon: TOOL_ICONS[t.code] || '📦',
    count: holdersByCode[t.code] || 0,
    color: TOOL_COLORS[t.code] || 'text-slate-500 bg-slate-50 border-slate-200',
  }));

  // Recent usage ledger
  const recentUsage = overview?.recentUsage?.slice(0, 3) || [];
  const topHolders = overview?.topHolders?.slice(0, 3) || [];

  // Build display ledger from topHolders (last acquired)
  const ledger = topHolders.map((h: any) => ({
    user: h.user?.nickname || h.user?.uniqueId || 'مستخدم',
    action: `حصل على ${POWERUP_NAMES[h.powerUp?.code] || h.powerUp?.nameAr || h.powerUp?.code}`,
    time: h.lastAcquiredAt
      ? new Date(h.lastAcquiredAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      : '—',
    icon: TOOL_ICONS[h.powerUp?.code] || '📦',
    color: TOOL_COLORS[h.powerUp?.code]?.split(' ')[0] || 'text-slate-500',
  }));

  return (
    <div dir="rtl" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">خزينة الأدوات و المعركة</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold">
          <span>{catalog.length} أدوات</span>
          <Sparkles className="w-3 h-3" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto space-y-3">
        {/* Available Tools Label */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">الأدوات المتاحة في المعركة</span>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
            <Package className="w-4 h-4 drop-shadow" />
          </div>
        </div>

        {/* Tool Count Pills */}
        <div className="grid grid-cols-5 gap-1.5">
          {toolsDisplay.length > 0 ? (
            toolsDisplay.slice(0, 5).map((t) => (
              <div
                key={t.code}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${t.color}`}
              >
                <span className="text-base">{t.icon}</span>
                <span className="text-xs font-black">x{t.count}</span>
              </div>
            ))
          ) : (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50 text-center animate-pulse">
                <div className="w-5 h-5 bg-slate-200 rounded mb-1" />
                <div className="w-6 h-3 bg-slate-200 rounded" />
              </div>
            ))
          )}
        </div>

        {/* Manage CTA */}
        <button
          onClick={onManageTools}
          className="w-full mt-1 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
        >
          <span>إدارة الأدوات</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        {/* Recent Activity Ledger */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400">سجل الاستخدام الأخير</div>
          <div className="space-y-1.5">
            {ledger.length > 0 ? ledger.map((u: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
              >
                <span className="text-[10px] text-slate-400 font-medium">{u.time}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">{u.action}</span>
                  <span className={`text-sm ${u.color}`}>{u.icon}</span>
                </div>
              </div>
            )) : (
              <div className="text-[11px] text-slate-400 text-center py-2">لا توجد عمليات حديثة</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
