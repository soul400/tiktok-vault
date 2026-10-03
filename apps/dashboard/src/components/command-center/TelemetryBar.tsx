'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Users, Heart, Gem, Gift, MessageSquare, TrendingUp } from 'lucide-react';
import { useStreamStore } from '../../store/useStreamStore';

export function TelemetryBar() {
  const metrics = useStreamStore((s) => s.metrics);
  const prevMetricsRef = useRef(metrics);
  const [deltas, setDeltas] = useState<{ [key: string]: number }>({});

  // Calculate real deltas when metrics change (never synthetic)
  useEffect(() => {
    const prev = prevMetricsRef.current;
    const newDeltas: { [key: string]: number } = {};

    if (metrics.viewers !== prev.viewers && prev.viewers > 0) {
      newDeltas.viewers = metrics.viewers - prev.viewers;
    }
    if (metrics.likes > prev.likes && prev.likes > 0) {
      newDeltas.likes = metrics.likes - prev.likes;
    }
    if (metrics.diamonds > prev.diamonds && prev.diamonds > 0) {
      newDeltas.diamonds = metrics.diamonds - prev.diamonds;
    }
    if (metrics.gifts > prev.gifts && prev.gifts > 0) {
      newDeltas.gifts = metrics.gifts - prev.gifts;
    }

    if (Object.keys(newDeltas).length > 0) {
      setDeltas(newDeltas);
      const timer = setTimeout(() => setDeltas({}), 2000);
      return () => clearTimeout(timer);
    }

    prevMetricsRef.current = metrics;
  }, [metrics]);

  const cards = [
    {
      id: 'viewers',
      label: 'المشاهدون اللحظيون',
      value: metrics.viewers,
      icon: Users,
      accent: 'text-cyan-400',
      bgGlow: 'bg-cyan-500/10',
      borderAccent: 'border-cyan-500/20',
      delta: deltas.viewers,
    },
    {
      id: 'likes',
      label: 'إجمالي الإعجابات',
      value: metrics.likes,
      icon: Heart,
      accent: 'text-rose-400',
      bgGlow: 'bg-rose-500/10',
      borderAccent: 'border-rose-500/20',
      delta: deltas.likes,
    },
    {
      id: 'diamonds',
      label: 'أرباح الألماس',
      value: metrics.diamonds,
      icon: Gem,
      accent: 'text-amber-400',
      bgGlow: 'bg-amber-500/10',
      borderAccent: 'border-amber-500/20',
      delta: deltas.diamonds,
    },
    {
      id: 'gifts',
      label: 'الهدايا المستلمة',
      value: metrics.gifts,
      icon: Gift,
      accent: 'text-purple-400',
      bgGlow: 'bg-purple-500/10',
      borderAccent: 'border-purple-500/20',
      delta: deltas.gifts,
    },
    {
      id: 'comments',
      label: 'التعليقات الحية',
      value: metrics.comments,
      icon: MessageSquare,
      accent: 'text-emerald-400',
      bgGlow: 'bg-emerald-500/10',
      borderAccent: 'border-emerald-500/20',
      delta: deltas.comments,
    },
  ];

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className={`relative bg-[#101625] border border-white/[0.08] hover:${c.borderAccent} rounded-xl px-3.5 py-2.5 flex items-center justify-between transition-colors shadow-sm`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg ${c.bgGlow} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${c.accent}`} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400 font-medium truncate">{c.label}</div>
                <div className="text-lg font-black text-white font-mono tabular-nums leading-tight tracking-tight">
                  {c.value.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Real Delta Indicator if active */}
            {c.delta !== undefined && c.delta !== 0 && (
              <div
                dir="ltr"
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  c.delta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                } transition-opacity`}
              >
                {c.delta > 0 ? `+${c.delta.toLocaleString()}` : c.delta.toLocaleString()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
