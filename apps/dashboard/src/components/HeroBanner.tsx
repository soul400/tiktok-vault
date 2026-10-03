'use client';

import React from 'react';
import { Crown, Radio } from 'lucide-react';

export function HeroBanner() {
  return (
    <div dir="ltr" className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-100/90 p-5 shadow-sm">
      {/* Decorative background blurs */}
      <div className="absolute -top-12 right-1/4 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 left-1/3 w-64 h-64 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Side: LIVE Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500 text-white text-xs font-black shadow-sm shadow-rose-500/20">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Center: Title & Subtitle */}
        <div dir="rtl" className="text-center space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-blue-900 tracking-tight">
            مركز القيادة اللحظي — مشروع الجولات AEP
          </h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium flex items-center justify-center flex-wrap gap-2">
            <span>متابعة لحظية للبث</span>
            <span className="text-blue-300">•</span>
            <span>إدارة التحديات</span>
            <span className="text-blue-300">•</span>
            <span>التفاعل مع الجمهور</span>
            <span className="text-blue-300">•</span>
            <span className="text-blue-600 font-bold">تحقيق أعلى النتائج</span>
          </p>
        </div>

        {/* Right Side: AEP Crown Logo */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <Crown className="w-8 h-8 text-blue-600 stroke-[2.2]" />
            <span className="text-xs font-black text-blue-900 tracking-wider">AEP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
