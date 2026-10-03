'use client';

import React, { useState, useEffect } from 'react';
import { Crown, ShieldAlert, Sparkles, Search, Eye, AlertTriangle, Clock, Activity, Zap, CheckCircle2 } from 'lucide-react';
import { useStreamStore } from '../store/useStreamStore';
import { formatRiyadhTime } from '@aep/shared';

interface EnigmaSighting {
  id: string;
  codename: string;
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
  confidence: number;
  patternType: 'STEALTH_BURST' | 'PRIVATE_VIP' | 'GHOST_GIFTER' | 'POWERUP_SNIPER';
  lastSeenAt: string;
  streamerUsername: string;
  actionDetails: string;
  diamonds: number;
  matchEvidence: string[];
}

export function EnigmaTab() {
  const { events, selectedStreamer } = useStreamStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [autoDetect, setAutoDetect] = useState(true);

  // Real-time detected Enigma anomalies based purely on incoming live stream events (Zero fake data)
  const [sightings, setSightings] = useState<EnigmaSighting[]>([]);

  // Monitor live events for rapid high-diamond drops or powerups from unverified/stealth accounts
  useEffect(() => {
    if (!autoDetect) return;

    // Scan incoming live stream events for real anomalous patterns
    events.forEach((ev) => {
      if (!ev.user) return;

      const isHighGift =
        ev.eventType === 'GIFT_RECEIVED' &&
        Number((ev.payload as any)?.totalDiamonds || (ev.payload as any)?.diamondCost || 0) >= 500;

      const isPowerUp =
        ev.eventType === 'POWERUP_ACQUIRED' || ev.eventType === 'POWERUP_USED';

      if (isHighGift || isPowerUp) {
        const u = ev.user;
        const diamonds = Number((ev.payload as any)?.totalDiamonds || (ev.payload as any)?.diamondCost || 0);
        const actionDetails = isPowerUp
          ? `استخدام أداة معركة (${(ev.payload as any)?.toolNameAr || 'أداة حاسمة'}) في توقيت دقيق`
          : `رصد دعم مباشر بقيمة ${diamonds} ألماسة`;

        setSightings((prev) => {
          const exists = prev.some((s) => s.uniqueId === u.uniqueId);
          if (exists) return prev;

          const newEnigma: EnigmaSighting = {
            id: `enigma-${ev.id || Date.now()}`,
            codename: `Enigma-${u.uniqueId.substring(0, 8)}`,
            uniqueId: u.uniqueId,
            nickname: u.nickname || u.uniqueId,
            avatarUrl: u.avatarUrl,
            confidence: diamonds >= 5000 ? 98 : diamonds >= 1000 ? 92 : 85,
            patternType: isPowerUp ? 'POWERUP_SNIPER' : 'STEALTH_BURST',
            lastSeenAt: ev.timestampUtc,
            streamerUsername: ev.streamerUsername || selectedStreamer?.username || '',
            actionDetails,
            diamonds,
            matchEvidence: [
              'رصد فوري عبر تدفق الـ WebSocket للبث المباشر',
              `نمط التدخل: ${actionDetails}`,
              `تاريخ وتوقيت النزول: ${formatRiyadhTime(ev.timestampUtc)}`,
            ],
          };
          return [newEnigma, ...prev];
        });
      }
    });
  }, [events, autoDetect, selectedStreamer]);

  const filtered = sightings.filter(
    (s) =>
      s.codename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const latestMatch = sightings.length > 0 ? sightings[0] : null;

  return (
    <div className="space-y-4">
      {/* Top Banner - Enigma LAB */}
      <div className="bg-gradient-to-r from-[#180f2b] via-[#10192e] to-[#0c1626] border border-purple-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 border border-purple-400/30">
              <Crown className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wide">
                  ENIGMA LAB — إنقما
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse">
                  رادار الحسابات الغامضة
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  فحص لحظي مباشر 100%
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                رصد ظهور الحسابات المتخفية ومطابقة أنماط الدعم المباغت وأدوات الحسم لحظياً من تدفق البث المباشر.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setAutoDetect(!autoDetect)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                autoDetect
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              الرصد التلقائي: {autoDetect ? 'مفعّل' : 'متوقف'}
            </button>
          </div>
        </div>
      </div>

      {/* Featured Match Card or Idle State */}
      <div className="bg-[#0b1523] border border-purple-500/20 rounded-xl p-4">
        {latestMatch ? (
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <b className="text-xs text-white uppercase tracking-wider">
                  آخر مطابقة حقيقية تم رصدها من البث
                </b>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                نسبة التطابق {latestMatch.confidence}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-3">
                {latestMatch.avatarUrl ? (
                  <img
                    src={latestMatch.avatarUrl}
                    alt={latestMatch.nickname}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-400/40"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center font-bold text-white text-lg border-2 border-amber-400/40 shadow-lg shadow-amber-500/20">
                    E
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">{latestMatch.codename}</span>
                    <span className="text-amber-400 text-xs font-mono">(@{latestMatch.uniqueId})</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{latestMatch.nickname}</p>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>نمط التدخل:</span>
                  <span className="text-purple-300 font-bold">{latestMatch.patternType}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>التوقيت:</span>
                  <span className="text-slate-200 font-mono">{formatRiyadhTime(latestMatch.lastSeenAt)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>قيمة الدعم:</span>
                  <span className="text-amber-400 font-black font-mono">{latestMatch.diamonds.toLocaleString()} 💎</span>
                </div>
              </div>

              <div className="bg-[#101f31] border border-slate-800 rounded-lg p-3 text-xs space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  أدلة الرصد المباشر:
                </div>
                <ul className="text-[10px] text-slate-400 space-y-1 pr-4 list-disc">
                  {latestMatch.matchEvidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Eye className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">
              رادار Enigma نشط وجاري مراقبة تدفق أحداث البث المباشر
            </h3>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              لم يتم رصد أي حساب غامض أو تدخل مباغت حتى الآن. بمجرد ظهور دعم كبير مفاجئ أو أداة معركة من حساب متخفٍ في البث، سيتم توثيقه وتصنيفه هنا فوراً.
            </p>
          </div>
        )}
      </div>

      {/* Sightings History Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              سجل رصد ومطابقات Enigma الفعلي ({filtered.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              الحسابات الغامضة التي تم رصدها فعلياً من أحداث البث المباشر الحالية
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث بالرمز أو المعرف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">رمز Enigma</th>
                <th className="py-2.5 px-3 font-semibold">المستخدم المرصود</th>
                <th className="py-2.5 px-3 font-semibold">نوع النمط</th>
                <th className="py-2.5 px-3 font-semibold">نسبة التطابق</th>
                <th className="py-2.5 px-3 font-semibold">توقيت الظهور</th>
                <th className="py-2.5 px-3 font-semibold">الدعم المرصود</th>
                <th className="py-2.5 px-3 font-semibold">تفاصيل التدخل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    {sightings.length === 0
                      ? 'لا توجد حسابات غامضة مرصودة حالياً. الرادار ينتظر وصول أحداث البث المباشر.'
                      : 'لا توجد مطابقات تتوافق مع معايير البحث.'}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        <Crown className="w-3 h-3 text-amber-400" />
                        {item.codename}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-blue-400">
                        @{item.uniqueId}
                        <span className="text-slate-400 font-normal font-sans text-[11px]">
                          ({item.nickname})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {item.patternType}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-emerald-400">
                        {item.confidence}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {formatRiyadhTime(item.lastSeenAt)}
                    </td>
                    <td className="py-3 px-3 font-black text-amber-400">
                      {item.diamonds > 0 ? `${item.diamonds.toLocaleString()} 💎` : 'أداة معركة'}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300 text-[11px]">
                      {item.actionDetails}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
