'use client';

import React, { useState } from 'react';
import {
  Radio,
  Swords,
  Tv,
  Crown,
  Shield,
  History,
  BarChart3,
  Eye,
  Server,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { id: 'command', label: 'COMMAND', labelAr: 'غرفة القيادة', icon: Radio },
    { id: 'battles', label: 'BATTLES', labelAr: 'ميدان المعارك', icon: Swords },
    { id: 'stream', label: 'STREAM', labelAr: 'شاشة البث', icon: Tv },
    { id: 'supporters', label: 'SUPPORTERS', labelAr: 'كبار الداعمين', icon: Crown },
    { id: 'powerups', label: 'POWER-UPS', labelAr: 'خزينة الأدوات', icon: Shield },
    { id: 'history', label: 'HISTORY', labelAr: 'الأرشيف والسجل', icon: History },
    { id: 'analytics', label: 'ANALYTICS', labelAr: 'التحليلات المتقدمة', icon: BarChart3 },
    { id: 'watchlist', label: 'WATCHLIST', labelAr: 'قائمة المراقبة', icon: Eye },
    { id: 'system', label: 'SYSTEM', labelAr: 'صحة النظام', icon: Server },
  ];

  return (
    <aside
      className={`bg-[#070A12] border-l border-white/[0.08] flex flex-col justify-between py-4 px-2 transition-all duration-300 z-30 select-none ${
        isExpanded ? 'w-52' : 'w-16'
      }`}
    >
      {/* Navigation Items */}
      <div className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={item.labelAr}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              {isExpanded && (
                <div className="flex items-center justify-between w-full truncate">
                  <span className="truncate">{item.labelAr}</span>
                  <span className="text-[9px] font-mono font-bold text-slate-500">{item.label}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Expand / Collapse Button */}
      <div className="pt-2 border-t border-white/[0.06]">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
          title={isExpanded ? 'تصغير القائمة' : 'توسيع القائمة'}
        >
          {isExpanded ? (
            <div className="flex items-center gap-2 text-xs font-mono">
              <ChevronRight className="w-4 h-4" />
              <span>COLLAPSE</span>
            </div>
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
