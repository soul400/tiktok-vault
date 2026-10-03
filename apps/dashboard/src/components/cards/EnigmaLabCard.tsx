'use client';

import React from 'react';
import { FlaskConical, Plus, Users, Scan, Beaker, CheckCircle, ArrowLeft } from 'lucide-react';

interface EnigmaLabCardProps {
  onEnterLab?: () => void;
}

export function EnigmaLabCard({ onEnterLab }: EnigmaLabCardProps) {
  const labStats = [
    { id: 'total', label: 'العدد الكلي', value: '98,907', icon: Users, color: 'text-blue-600' },
    { id: 'active', label: 'المعاريف النشطين', value: '15,284', icon: Scan, color: 'text-indigo-600' },
    { id: 'experiments', label: 'التجارب المنفذة', value: '6,432', icon: Beaker, color: 'text-purple-600' },
    { id: 'success', label: 'معدل النجاح', value: '98.7%', icon: CheckCircle, color: 'text-emerald-600' },
  ];

  return (
    <div dir="rtl" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">انيقما لاب</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold">
          <span>مخزون المعركة</span>
          <Plus className="w-3 h-3" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto space-y-3">
        {/* Futuristic Cybernetic Laboratory Visual */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#0e1326] via-[#161c38] to-[#0a0d1a] border border-indigo-900/40 p-3 text-center flex flex-col items-center justify-center min-h-[120px] shadow-inner group">
          {/* Cybernetic Aura */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />

          {/* Glowing Beaker Logo */}
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-indigo-500/30 mb-1.5 group-hover:scale-105 transition-transform">
            <FlaskConical className="w-6 h-6 animate-pulse" />
          </div>

          <div className="relative z-10 font-black tracking-widest text-xs uppercase text-indigo-200 drop-shadow">
            ENIGMA LAB
          </div>
          <div className="relative z-10 text-[10px] text-slate-400 font-medium mt-0.5">
            محرك التحليل الاستخباري والتعرف على الداعمين
          </div>
        </div>

        {/* 4 Counter Cards */}
        <div className="grid grid-cols-4 gap-2">
          {labStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className="bg-slate-50/80 border border-slate-100 rounded-xl p-2 text-center flex flex-col items-center justify-center space-y-1"
              >
                <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                <div className="text-[10px] text-slate-400 font-medium truncate w-full">
                  {stat.label}
                </div>
                <div className="font-black text-slate-800 text-xs font-mono">
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <button
          onClick={onEnterLab}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 transition-all"
        >
          <span>الدخول إلى أنيقما لاب</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
