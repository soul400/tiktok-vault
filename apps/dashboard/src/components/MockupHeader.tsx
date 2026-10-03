'use client';

import React from 'react';
import { useStreamStore } from '../store/useStreamStore';
import { CheckCircle2, Users, TrendingUp, MapPin, Radio } from 'lucide-react';

export function MockupHeader() {
  const { selectedStreamer, metrics, health } = useStreamStore();

  const username = selectedStreamer?.username || 'mohra.2000';
  const isLive = selectedStreamer?.status === 'LIVE' || true;
  const viewerCount = metrics?.viewers > 0 ? `${(metrics.viewers / 1000).toFixed(1)}K` : '8.7K';

  return (
    <header className="h-20 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
      {/* Streamer Profile Section */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-13 h-13 rounded-full ring-2 ring-blue-500/80 ring-offset-2 overflow-hidden bg-slate-100 shadow-md">
            {selectedStreamer?.profileImage ? (
              <img
                src={selectedStreamer.profileImage}
                alt={username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-slate-800 to-indigo-950 flex items-center justify-center text-white font-bold text-lg">
                M
              </div>
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-slate-800 tracking-tight">
              @{username}
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 text-white" />
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-extrabold tracking-wide">
              PRO
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              متصل الآن
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
              TikTok LIVE
            </span>
          </div>
        </div>

        {/* Metrics Pills */}
        <div className="hidden xl:flex items-center gap-2.5 mr-4 border-r border-slate-200/80 pr-5">
          {/* Followers */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">المتابعين</div>
              <div className="font-extrabold text-slate-800">2.3M</div>
            </div>
          </div>

          {/* Average Viewers */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">المتوسط المباشر</div>
              <div className="font-extrabold text-slate-800">{viewerCount}</div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">الموقع</div>
              <div className="font-extrabold text-slate-800 flex items-center gap-1">
                <span>السعودية</span>
                <span>🇸🇦</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Telemetry & LIVE Waveform Section */}
      <div className="flex items-center gap-5">
        <div className="hidden md:flex items-center gap-4">
          {/* Animated Audio Equalizer Waveform */}
          <div className="flex items-end gap-1 h-7 px-2">
            <span className="w-1 bg-cyan-500 rounded-full animate-[pulse_1s_infinite_100ms] h-3" />
            <span className="w-1 bg-cyan-500 rounded-full animate-[pulse_1.2s_infinite_200ms] h-6" />
            <span className="w-1 bg-blue-600 rounded-full animate-[pulse_0.8s_infinite_300ms] h-4" />
            <span className="w-1 bg-blue-500 rounded-full animate-[pulse_1.4s_infinite_150ms] h-7" />
            <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.9s_infinite_250ms] h-5" />
            <span className="w-1 bg-blue-600 rounded-full animate-[pulse_1.1s_infinite_350ms] h-3" />
          </div>

          <div className="text-right">
            <div className="text-xs font-black text-slate-800">
              الاتصال الاحترافي بالبث
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              توليد وربط بيانات البث بشكل آمن ومستقر
            </div>
          </div>
        </div>

        {/* Pulsing LIVE Capsule Badge */}
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-500/25 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>LIVE</span>
        </div>
      </div>
    </header>
  );
}
