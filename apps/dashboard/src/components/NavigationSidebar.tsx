'use client';

import React from 'react';
import {
  Home,
  MessageSquare,
  Swords,
  Package,
  Crown,
  FlaskConical,
  FileText,
  Settings,
  User,
  Bell,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface NavigationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function NavigationSidebar({ activeTab, onTabChange }: NavigationSidebarProps) {
  const mainNavItems = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'comments', label: 'الكومنت اللحظي', icon: MessageSquare },
    { id: 'battles', label: 'ميدان المعارك (PK)', icon: Swords },
    { id: 'powerups', label: 'خزينة الأدوات والمعركة', icon: Package },
    { id: 'supporters', label: 'صدارة الداعمين', icon: Crown },
    { id: 'enigma', label: 'انيقما لاب', icon: FlaskConical },
    { id: 'reports', label: 'التقارير و السجلات', icon: FileText },
  ];

  const quickToolItems = [
    { id: 'settings', label: 'إعدادات البث', icon: Settings },
    { id: 'account', label: 'إدارة الحساب', icon: User },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'help', label: 'المساعدة', icon: HelpCircle },
  ];

  return (
    <aside dir="rtl" className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 shrink-0 select-none shadow-sm z-20 h-screen sticky top-0 overflow-y-auto">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-blue-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2">
              <path d="M4 6l8-4 8 4v12l-8 4-8-4V6z" strokeLinejoin="round" />
              <path d="M4 6l8 4 8-4" strokeLinejoin="round" />
              <path d="M12 10v12" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-black tracking-tight text-blue-900 leading-none">
              AEP
            </div>
            <div className="text-[9px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">
              AL-SHAIB ENTERTAINMENT PLATFORM
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25 font-bold translate-x-0.5'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Tools Section */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-400 px-3 tracking-wide">
            أدوات سريعة
          </div>
          <div className="space-y-0.5">
            {quickToolItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Promo Card: الشايب للترفيه */}
      <div className="mt-4 pt-3">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#0c1a2e] to-[#060b14] border border-blue-900/40 p-4 text-white shadow-lg group">
          {/* Subtle glowing background aura */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-amber-500/15 rounded-full blur-xl pointer-events-none" />

          <div className="relative flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-amber-400/40 shadow-inner shrink-0 bg-slate-800 flex items-center justify-center">
              {/* Fallback character visual */}
              <div className="w-full h-full bg-gradient-to-tr from-blue-700 via-indigo-900 to-amber-600 flex items-center justify-center">
                <Crown className="w-7 h-7 text-amber-300 drop-shadow-md animate-pulse" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold text-amber-300 tracking-wider">منصة النخبة</span>
              </div>
              <div className="text-base font-black tracking-tight text-white drop-shadow">
                الشايب للترفيه
              </div>
              <div className="text-[10px] text-blue-200/70 font-medium">
                بثوث التحدي الاحترافية
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
