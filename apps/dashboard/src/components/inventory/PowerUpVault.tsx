'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, RefreshCw } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { PowerUpItem } from './PowerUpItem';

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

const DEFAULT_ITEMS = [
  { code: 'GLOVES', nameAr: 'قفازات المعركة (الضربة القاضية)', icon: '🥊' },
  { code: 'MIST', nameAr: 'ضباب المعركة (حجب النقاط)', icon: '🌫️' },
  { code: 'THUNDER', nameAr: 'صاعقة الرعد / الحماس', icon: '⚡' },
  { code: 'BOOST_X2', nameAr: 'مضاعف النقاط ×2', icon: '×2' },
  { code: 'BOOST_X3', nameAr: 'مضاعف النقاط ×3', icon: '×3' },
  { code: 'EXTRA_TIME', nameAr: 'الوقت الإضافي', icon: '⏳' },
];

export function PowerUpVault() {
  const [itemsData, setItemsData] = useState<any[]>(DEFAULT_ITEMS);
  const [recentAcquiredCode, setRecentAcquiredCode] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [catRes, overRes] = await Promise.all([
        fetch('/api/powerups/catalog'),
        fetch('/api/powerups/overview'),
      ]);
      const catData = await catRes.json();
      const overData = await overRes.json();

      const holders = overData?.data?.topHolders || [];
      const usage = overData?.data?.recentUsage || [];

      // Calculate totals per tool code
      const merged = DEFAULT_ITEMS.map((item) => {
        const itemHolders = holders.filter((h: any) => h.powerUp?.code === item.code);
        const remaining = itemHolders.reduce((sum: number, h: any) => sum + Number(h.quantity || 0), 0);
        const totalAcquired = itemHolders.reduce((sum: number, h: any) => sum + Number(h.totalAcquired || 0), 0);
        const totalUsed = itemHolders.reduce((sum: number, h: any) => sum + Number(h.totalUsed || 0), 0);

        return {
          ...item,
          remainingCount: remaining,
          totalAcquired: Math.max(totalAcquired, remaining + totalUsed),
          totalUsed,
        };
      });

      setItemsData(merged);
    } catch (err) {
      console.error('Failed to fetch power-up vault data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);

    const socket = getSocket();
    const onAcquired = (data: any) => {
      const code = data?.payload?.powerUpCode || 'GLOVES';
      setRecentAcquiredCode(code);
      fetchData();
      setTimeout(() => setRecentAcquiredCode(null), 3000);
    };

    const onUsed = () => {
      fetchData();
    };

    socket.on('powerup:acquired', onAcquired);
    socket.on('powerup:used', onUsed);

    return () => {
      clearInterval(interval);
      socket.off('powerup:acquired', onAcquired);
      socket.off('powerup:used', onUsed);
    };
  }, []);

  const totalVaultRemaining = itemsData.reduce((sum, item) => sum + (item.remainingCount || 0), 0);

  return (
    <div className="w-full bg-[#101625] border border-white/[0.08] rounded-xl flex flex-col h-[380px] overflow-hidden">
      {/* Header */}
      <div className="bg-[#070A12] px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-200">خزينة أدوات المعركة (Power-Up Vault)</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
            {totalVaultRemaining} أداة جاهزة
          </span>
        </div>
      </div>

      {/* Grid of Power-up Items */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
        {itemsData.map((item) => (
          <PowerUpItem
            key={item.code}
            code={item.code}
            nameAr={item.nameAr}
            icon={item.icon}
            remainingCount={item.remainingCount || 0}
            totalAcquired={item.totalAcquired || 0}
            totalUsed={item.totalUsed || 0}
            isRecent={recentAcquiredCode === item.code}
          />
        ))}
      </div>
    </div>
  );
}
