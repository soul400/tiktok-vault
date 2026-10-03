'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Crown,
  Radio,
  Zap,
  Swords,
  Users,
  Shield,
  Star,
  Gift,
  Heart,
  MessageSquare,
  Trophy,
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  Flame,
  Search,
  Upload,
} from 'lucide-react';

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Dynamic countdown for Demo 7 (Supporters inventory duration)
  const countdowns = [
    '4 أيام 07 ساعات',
    '3 أيام 16 ساعة',
    '2 يوم 18 ساعة',
    '1 يوم 09 ساعات',
  ];

  const faqs = [
    {
      q: 'هل أستطيع إنشاء حساب بنفسي؟',
      a: 'لا. الحسابات يتم إنشاؤها وتفعيلها عبر إدارة مشروع الجولات لضمان استقرار الخوادم وجودة الاتصال بالبثوث.',
    },
    {
      q: 'هل يعمل على الجوال والكمبيوتر؟',
      a: 'نعم، الواجهة مصممة بتقنيات الويب الحديثة وتعمل بسلاسة فائقة على شاشات الجوال، الأجهزة اللوحية، وأجهزة الكمبيوتر.',
    },
    {
      q: 'هل يحتاج النظام تثبيت أي برنامج أو إضافة؟',
      a: 'لا، النسخة السحابية تعمل بالكامل من خلال المتصفح ولا تتطلب أي تثبيت خارجي.',
    },
    {
      q: 'هل يحتاج جهازي أن يبقى قيد التشغيل أثناء البث؟',
      a: 'لا، الخوادم السحابية للمنصة تعمل على مدار الساعة بنسبة تشغيل 99.9% وتتولى الاتصال بخوادم TikTok مباشرة.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans selection:bg-[#ff6a00] selection:text-white" dir="rtl">
      {/* 1. Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#eee] px-6 lg:px-12 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Brand */}
          <Link href="#top" className="flex items-center gap-3 shrink-0">
            <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff6a00] to-[#ff9b3f] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-orange-500/25">
              ♛
            </span>
            <div className="grid">
              <b className="text-lg font-black text-[#111827] leading-tight">مشروع الجولات</b>
              <small className="text-[11px] text-[#6b7280] font-medium">إدارة بث أذكى · AEP</small>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-2 mx-auto">
            <a href="#top" className="px-3 py-2 text-xs font-bold text-[#ff6a00] hover:text-[#ff6a00] transition-colors relative after:content-[''] after:absolute after:bottom-0 after:right-3 after:left-3 after:h-0.5 after:bg-[#ff6a00] after:rounded-full">
              الرئيسية
            </a>
            <a href="#features" className="px-3 py-2 text-xs font-bold text-[#374151] hover:text-[#ff6a00] transition-colors">
              المميزات
            </a>
            <a href="#enigma" className="px-3 py-2 text-xs font-bold text-[#7c3aed] hover:text-[#6d28d9] transition-colors flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#ff6a00]" />
              Enigma LAB
            </a>
            <a href="#how" className="px-3 py-2 text-xs font-bold text-[#374151] hover:text-[#ff6a00] transition-colors">
              كيف يعمل
            </a>
            <a href="#faq" className="px-3 py-2 text-xs font-bold text-[#374151] hover:text-[#ff6a00] transition-colors">
              الأسئلة الشائعة
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0b1320] text-white hover:bg-[#1a2538] transition-all shadow-sm"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#ff6a00] to-[#ff8a21] hover:from-[#e55f00] hover:to-[#ff7b0f] text-white transition-all shadow-md shadow-orange-500/25 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              لوحة التحكم
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100"
            aria-label="قائمة التنقل"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="lg:hidden pt-4 pb-2 border-t border-gray-100 mt-3 flex flex-col gap-2 bg-white">
            <a href="#top" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-xs font-bold text-[#ff6a00]">الرئيسية</a>
            <a href="#features" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-xs font-bold text-[#374151]">المميزات</a>
            <a href="#enigma" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-xs font-bold text-[#7c3aed]">Enigma LAB</a>
            <a href="#how" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-xs font-bold text-[#374151]">كيف يعمل</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-xs font-bold text-[#374151]">الأسئلة الشائعة</a>
            <div className="flex gap-2 pt-2 px-4">
              <Link href="/login" className="flex-1 text-center py-2 rounded-xl text-xs font-bold bg-[#0b1320] text-white">تسجيل الدخول</Link>
              <Link href="/dashboard" className="flex-1 text-center py-2 rounded-xl text-xs font-bold bg-[#ff6a00] text-white">لوحة التحكم</Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section id="top" className="relative overflow-hidden bg-gradient-to-br from-white via-[#fffaf6] to-[#fff2e6] py-16 lg:py-24 border-b border-[#f0f0f0]">
        {/* Glow orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Hero Copy (5 cols) */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-right">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fff0e4] text-[#c94f00] border border-[#ffd6b6] text-xs font-black shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#ff6a00]" />
              المنصة لإدارة ومتابعة جولات TikTok LIVE
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#111827] leading-[1.2] tracking-tight">
              إدارة البث والجولات
              <br />
              <span className="text-[#ff6a00] bg-gradient-to-r from-[#ff6a00] to-[#ff9b3f] bg-clip-text text-transparent">
                والداعمين من مكان واحد
              </span>
            </h1>

            <p className="text-base text-[#4b5563] leading-relaxed max-w-lg mx-auto lg:mx-0">
              راقب المتصلين، تابع الداعمين، أدوات الجولات، المخزون، المحادثات المهمة، التقارير وEnigma من واجهة واحدة مرتبة وواضحة.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                href="/dashboard"
                className="px-7 py-3.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-[#ff6a00] to-[#ff8a21] hover:from-[#e55f00] hover:to-[#ff7b0f] text-white shadow-xl shadow-orange-500/30 transition-all flex items-center gap-2"
              >
                <span>دخول إلى لوحة التحكم</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-gray-50 text-[#111827] border border-[#cfd5dc] shadow-sm transition-all"
              >
                تسجيل الدخول
              </Link>
            </div>

            {/* Hero Quick Benefits */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 pt-3 text-xs text-[#475569] font-semibold">
              <span className="flex items-center gap-1.5">
                <b className="text-[#ff6a00] text-sm">⚡</b> إعداد سريع
              </span>
              <span className="flex items-center gap-1.5">
                <b className="text-[#ff6a00] text-sm">◎</b> متابعة لحظية
              </span>
              <span className="flex items-center gap-1.5">
                <b className="text-[#ff6a00] text-sm">◫</b> يعمل من المتصفح
              </span>
            </div>
          </div>

          {/* Hero Device Stage: Laptop Mockup (7 cols) */}
          <div className="lg:col-span-7 flex justify-center relative">
            <div className="w-full max-w-[680px] filter drop-shadow-2xl">
              {/* Laptop Screen */}
              <div className="bg-[#081220] rounded-[24px] border-[8px] border-[#111827] border-b-[16px] p-3 text-white overflow-hidden shadow-2xl relative">
                {/* Laptop Camera Notch */}
                <div className="absolute top-0 left-[38%] right-[38%] h-2.5 bg-[#111827] rounded-b-lg mx-auto" />

                {/* Dashboard Top Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#1b283b] text-xs pt-1">
                  <div>
                    <strong className="text-white text-xs block font-bold">إدارة جولات البث باحتراف</strong>
                    <small className="text-[#93a4b8] text-[9px]">الداعمين · الأدوات · المحادثات · Enigma</small>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#3a1021] text-[#ff7a9c] text-[10px] font-bold border border-[#ff7a9c]/30 flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff446d]" />
                    ● LIVE
                  </span>
                </div>

                {/* Quick Stats Grid (4 cols) */}
                <div className="grid grid-cols-4 gap-1.5 my-2">
                  <div className="bg-[#101d31] border border-[#26344c] rounded-lg p-2 text-center">
                    <small className="text-[#97a8bd] text-[8px] block">متصلون الآن</small>
                    <b className="text-sm font-black text-white font-mono">27</b>
                    <em className="text-[8px] text-[#66e3ac] not-italic block">● مباشر</em>
                  </div>
                  <div className="bg-[#101d31] border border-[#26344c] rounded-lg p-2 text-center">
                    <small className="text-[#97a8bd] text-[8px] block">VIP</small>
                    <b className="text-sm font-black text-amber-400 font-mono">8</b>
                    <em className="text-[8px] text-amber-300 not-italic block">مهم</em>
                  </div>
                  <div className="bg-[#101d31] border border-[#26344c] rounded-lg p-2 text-center">
                    <small className="text-[#97a8bd] text-[8px] block">أدوات اليوم</small>
                    <b className="text-sm font-black text-purple-400 font-mono">14</b>
                    <em className="text-[8px] text-purple-300 not-italic block">نشطة</em>
                  </div>
                  <div className="bg-[#101d31] border border-[#26344c] rounded-lg p-2 text-center">
                    <small className="text-[#97a8bd] text-[8px] block">جوائز محفوظة</small>
                    <b className="text-sm font-black text-blue-400 font-mono">46</b>
                    <em className="text-[8px] text-blue-300 not-italic block">في السجل</em>
                  </div>
                </div>

                {/* Dashboard Inner Grid */}
                <div className="grid grid-cols-3 gap-2 text-right">
                  {/* Panel 1: Live Stream VS */}
                  <div className="bg-[#0b1728] border border-[#25334a] rounded-xl p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold mb-1.5">
                      <span>البث المباشر</span>
                      <span className="text-[#ff8a21] font-mono">02:21</span>
                    </div>

                    <div className="bg-gradient-to-r from-[#2b1e1a] to-[#11223a] rounded-lg p-2 flex items-center justify-around my-1">
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6a00] to-[#9b3412] mx-auto flex items-center justify-center font-bold text-xs text-white">
                          م
                        </div>
                        <b className="text-[9px] block text-white mt-1">الأساسي</b>
                        <small className="text-[8px] text-[#b8c4d4] font-mono">98.1K</small>
                      </div>

                      <span className="text-xs font-black text-[#ff8a21]">VS</span>

                      <div className="text-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563eb] to-[#0f2f65] mx-auto flex items-center justify-center font-bold text-xs text-white">
                          ع
                        </div>
                        <b className="text-[9px] block text-white mt-1">الخصم</b>
                        <small className="text-[8px] text-[#b8c4d4] font-mono">635</small>
                      </div>
                    </div>

                    <div className="p-1.5 bg-[#0b2c24] border border-[#15b878]/30 rounded-md text-[8px] text-[#76e6b8] text-center font-semibold mt-1">
                      ● البث مستمر ويوجد به جولة حالية
                    </div>
                  </div>

                  {/* Panel 2: Connected People */}
                  <div className="bg-[#0b1728] border border-[#25334a] rounded-xl p-2.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold mb-1.5">
                      <span>المتصلون الآن</span>
                      <span className="text-emerald-400 font-mono">27</span>
                    </div>
                    <div className="space-y-1.5 text-[9px]">
                      <div className="flex items-center justify-between pb-1 border-b border-[#1e2b3f]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[8px] font-bold">س</span>
                          <span className="text-white font-bold">سعود</span>
                        </div>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1b2940] text-emerald-300">قفاز ×2</span>
                      </div>
                      <div className="flex items-center justify-between pb-1 border-b border-[#1e2b3f]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-fuchsia-600 flex items-center justify-center text-[8px] font-bold">ر</span>
                          <span className="text-white font-bold">ريم عبدالله</span>
                        </div>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1b2940] text-fuchsia-300">غيمة ×1</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold">O</span>
                          <span className="text-white font-bold">Oxygeen</span>
                        </div>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1b2940] text-amber-300">خزينة ×1</span>
                      </div>
                    </div>
                  </div>

                  {/* Panel 3: VIP Chats */}
                  <div className="bg-[#0b1728] border border-[#25334a] rounded-xl p-2.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold mb-1.5">
                      <span>المحادثات المهمة</span>
                      <span className="px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 text-[8px] font-bold">VIP</span>
                    </div>
                    <div className="space-y-1.5 text-[8px]">
                      <div className="pb-1 border-b border-[#1e2b3f]">
                        <b className="text-amber-300 block font-bold">ريم عبدالله:</b>
                        <span className="text-slate-300">أنا موجودة 👑</span>
                      </div>
                      <div className="pb-1 border-b border-[#1e2b3f]">
                        <b className="text-blue-300 block font-bold">سعود:</b>
                        <span className="text-slate-300">إذا احتجت القفاز حاضر 🖐️</span>
                      </div>
                      <div>
                        <b className="text-emerald-300 block font-bold">Oxygeen:</b>
                        <span className="text-slate-300">تم التعزيز! ⚡</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wide Live Activity Bar */}
                <div className="mt-2 p-2 bg-[#0b1728] border border-[#25334a] rounded-xl flex items-center justify-between text-[9px]">
                  <span className="text-[#93a4b8] font-bold">من نزل أداة في البث (لحظي):</span>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span>سعود <b>قفاز تعزيز ×1</b></span>
                    <span className="text-slate-600">|</span>
                    <span>ريم عبدالله <b>غيمة ×1</b></span>
                    <span className="text-slate-600">|</span>
                    <span>بنع موضي <b>تمديد وقت ×1</b></span>
                  </div>
                </div>
              </div>

              {/* Laptop Base */}
              <div className="w-[108%] -mr-[4%] h-4 bg-gradient-to-b from-[#d8dce2] to-[#9ea5af] rounded-b-[40px] shadow-lg" />
            </div>

            {/* Floating Tags */}
            <div className="hidden sm:block absolute -right-4 top-24 bg-[#151f2e] border border-[#2b3440] text-white px-3.5 py-2 rounded-2xl shadow-xl text-xs font-bold animate-bounce duration-1000">
              <span className="text-[#ff446d]">● LIVE</span> بث مباشر بإدارة أذكى
            </div>
            <div className="hidden sm:block absolute -left-4 bottom-12 bg-[#171717] border border-[#333] text-white px-3.5 py-2 rounded-2xl shadow-xl text-xs font-bold">
              <span className="text-[#ff8a21]">▥</span> كل شيء في مكان واحد
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section (9 Showcase Cards) */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          {/* Section Heading */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 rounded-lg bg-[#ff6a00] text-white text-xs font-black mb-3">
              المميزات الرئيسية
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#111827]">
              كيف تساعدك المنصة أثناء البث؟
            </h2>
            <p className="text-sm text-[#6b7280] mt-2">
              كل ميزة معها مثال بصري يوضح كيف تظهر داخل النظام بدقة.
            </p>
          </div>

          {/* 9 Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Connected Viewers */}
            <article className="p-5 border border-[#e5e7eb] rounded-3xl bg-white shadow-xl shadow-black/5 hover:border-orange-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#ff6a00] text-white font-black flex items-center justify-center text-sm shrink-0">
                    1
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#111827]">رصد المتصلين الآن</h3>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">
                      يعرض لك الداعمين الموجودين في البث مع حالة الاتصال ومعلومات سريعة عنهم.
                    </p>
                  </div>
                </div>

                {/* Dark Demo 1 */}
                <div className="bg-[#0b1523] border border-[#1f2f46] rounded-2xl p-3.5 text-white text-xs space-y-2 font-sans">
                  <div className="flex items-center justify-between pb-2 border-b border-[#213048]">
                    <b className="font-bold">المتصلون الآن (27)</b>
                    <span className="text-[#3ee7a5]">● مباشر</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#1e2b3f]/70">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[10px]">س</span>
                      <div>
                        <b className="text-[11px] block">سعود</b>
                        <small className="text-[#65d9a9] text-[9px]">● متصل الآن</small>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1b2940] text-[#a8d3ff] border border-[#33435c]">قفاز ×2</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#1e2b3f]/70">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-fuchsia-600 flex items-center justify-center font-bold text-[10px]">ر</span>
                      <div>
                        <b className="text-[11px] block">ريم عبدالله</b>
                        <small className="text-[#65d9a9] text-[9px]">● متصل الآن</small>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1b2940] text-fuchsia-300 border border-[#33435c]">غيمة ×1</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px]">O</span>
                      <div>
                        <b className="text-[11px] block">Oxygeen</b>
                        <small className="text-[#65d9a9] text-[9px]">● متصل الآن</small>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1b2940] text-amber-300 border border-[#33435c]">خزينة ×1</span>
                  </div>
                </div>
              </div>
            </article>

            {/* Feature 2: VIP Chats */}
            <article className="p-5 border border-[#e5e7eb] rounded-3xl bg-white shadow-xl shadow-black/5 hover:border-orange-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#ff6a00] text-white font-black flex items-center justify-center text-sm shrink-0">
                    2
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#111827]">المحادثات المهمة</h3>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">
                      تجمع رسائل الحسابات المختارة والمحادثات المهمة في لوحة مستقلة وواضحة.
                    </p>
                  </div>
                </div>

                {/* Dark Demo 2 */}
                <div className="bg-[#0b1523] border border-[#1f2f46] rounded-2xl p-3.5 text-white text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#213048]">
                    <b className="font-bold flex items-center gap-1">⭐ المحادثات المهمة</b>
                    <span className="px-1.5 py-0.5 rounded bg-[#34205e] text-[#d8c0ff] text-[10px] font-bold">VIP</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#1e2b3f]/70">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-fuchsia-600 flex items-center justify-center font-bold text-[10px]">ر</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <b className="text-[11px]">ريم عبدالله</b>
                          <span className="text-[8px] bg-[#5f4311] text-[#ffcf66] px-1 rounded">VIP</span>
                        </div>
                        <span className="text-[10px] text-[#ccd6e4]">مستمرين يا بطل ❤️</span>
                      </div>
                    </div>
                    <small className="text-[#94a3b8] text-[9px] font-mono">11:08</small>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#1e2b3f]/70">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[10px]">س</span>
                      <div>
                        <b className="text-[11px]">سعود</b>
                        <span className="text-[10px] text-[#ccd6e4] block">قفاز تعزيز ×1 🖐️</span>
                      </div>
                    </div>
                    <small className="text-[#94a3b8] text-[9px] font-mono">11:07</small>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px]">ب</span>
                      <div>
                        <b className="text-[11px]">بنع موضي</b>
                        <span className="text-[10px] text-[#ccd6e4] block">تمديد وقت +1 ⚡</span>
                      </div>
                    </div>
                    <small className="text-[#94a3b8] text-[9px] font-mono">11:06</small>
                  </div>
                </div>
              </div>
            </article>

            {/* Feature 3: Rounds & Battle Tools */}
            <article className="p-5 border border-[#e5e7eb] rounded-3xl bg-white shadow-xl shadow-black/5 hover:border-orange-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#ff6a00] text-white font-black flex items-center justify-center text-sm shrink-0">
                    3
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#111827]">إدارة الجولات والأدوات</h3>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">
                      تعرف الأدوات التي ظهرت خلال الجولة وسجل استخدامها بدون ما تتشتت بين الشاشات.
                    </p>
                  </div>
                </div>

                {/* Dark Demo 3 */}
                <div className="bg-[#0b1523] border border-[#1f2f46] rounded-2xl p-3.5 text-white text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#213048]">
                    <b className="font-bold">أدوات مستخدمة اليوم</b>
                    <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono font-bold">14</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1e2b3f]/70">
                    <span className="text-[11px]">🖐️ قفاز تعزيز</span>
                    <b className="text-amber-400 font-mono">×2</b>
                    <small className="text-[#8fa1b8] text-[10px]">12 مرة</small>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1e2b3f]/70">
                    <span className="text-[11px]">🌫️ غيمة</span>
                    <b className="text-blue-400 font-mono">×1</b>
                    <small className="text-[#8fa1b8] text-[10px]">8 مرات</small>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[11px]">⏱️ تمديد وقت</span>
                    <b className="text-emerald-400 font-mono">×1</b>
                    <small className="text-[#8fa1b8] text-[10px]">4 مرات</small>
                  </div>
                </div>
              </div>
            </article>

            {/* Feature 4: Round Result & OCR */}
            <article className="p-5 border border-[#e5e7eb] rounded-3xl bg-white shadow-xl shadow-black/5 hover:border-orange-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#ff6a00] text-white font-black flex items-center justify-center text-sm shrink-0">
                    4
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#111827]">نتيجة الجولة و OCR</h3>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">
                      ترفع صورة نتيجة الجولة ليتم قراءتها ومراجعة البيانات المستخرجة داخل النظام.
                    </p>
                  </div>
                </div>

                {/* Dark Demo 4 */}
                <div className="bg-[#0b1523] border border-[#1f2f46] rounded-2xl p-3.5 text-white text-xs space-y-2 text-center">
                  <div className="border border-dashed border-[#4d6380] rounded-xl p-4 bg-[#0f1b2c] flex flex-col items-center justify-center gap-1.5 min-h-[110px]">
                    <Upload className="w-6 h-6 text-[#4aa3ff]" />
                    <b className="text-[11px] text-white font-bold">اسحب صورة نتيجة الجولة هنا</b>
                    <small className="text-[#8ea0b7] text-[9px]">أو اضغط للاختيار السريع</small>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0d382d] border border-[#15b878]/30 text-[#7ef0bd] text-[10px] font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تم استخراج بيانات الجولة بنجاح للمراجعة
                  </div>
                </div>
              </div>
            </article>

            {/* Feature 5: Auto Prize Log */}
            <article className="p-5 border border-[#e5e7eb] rounded-3xl bg-white shadow-xl shadow-black/5 hover:border-orange-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#ff6a00] text-white font-black flex items-center justify-center text-sm shrink-0">
                    5
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#111827]">حفظ الجوائز تلقائياً</h3>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">
                      كل دعم يتم تسجيله في سجل منظم مع تفاصيل الداعم والجولة والأداة المستخدمة.
                    </p>
                  </div>
                </div>

                {/* Dark Demo 5 */}
                <div className="bg-[#0b1523] border border-[#1f2f46] rounded-2xl p-3.5 text-white text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#213048]">
                    <b className="font-bold">مخزون الداعمين</b>
                    <span className="text-emerald-400 font-bold">محفوظ لحظياً</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#1e2b3f]/70">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center font-bold text-[10px]">ف</span>
                      <div>
                        <b className="text-[11px] block">فهد</b>
                        <small className="text-[#94a3b8] text-[9px]">قفاز ×2 + غيمة ×1</small>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#193150] text-[#a8d3ff] font-bold">3 أدوات</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#1e2b3f]/70">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px]">O</span>
                      <div>
                        <b className="text-[11px] block">Oxygeen</b>
                        <small className="text-[#94a3b8] text-[9px]">قفاز خزينة ×1</small>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#193150] text-[#a8d3ff] font-bold">1 أداة</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center font-bold text-[10px]">ع</span>
                      <div>
                        <b className="text-[11px] block">العنزي</b>
                        <small className="text-[#94a3b8] text-[9px]">قفاز تعزيز ×1</small>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#193150] text-[#a8d3ff] font-bold">1 أداة</span>
                  </div>
                </div>
              </div>
            </article>

            {/* Feature 6: Tool Deduction */}
            <article className="p-5 border border-[#e5e7eb] rounded-3xl bg-white shadow-xl shadow-black/5 hover:border-orange-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#ff6a00] text-white font-black flex items-center justify-center text-sm shrink-0">
                    6
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#111827]">خصم الأدوات عند الاستخدام</h3>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">
                      عند استخدام أداة يرصدها النظام يتم تسجيلها وخصمها من المخزون بدقة تامة.
                    </p>
                  </div>
                </div>

                {/* Dark Demo 6 */}
                <div className="bg-[#0b1523] border border-[#1f2f46] rounded-2xl p-3.5 text-white text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#213048]">
                    <b className="font-bold">سجل استخدام الأدوات</b>
                    <span className="text-rose-400 font-bold">خصم فوري</span>
                  </div>
                  <div className="grid grid-cols-4 items-center py-1 border-b border-[#1e2b3f]/70 text-[10px]">
                    <span className="font-bold">سعود</span>
                    <span className="text-slate-300 col-span-2">🖐️ استخدم قفاز تعزيز</span>
                    <div className="text-left font-mono">
                      <b className="text-[#fb7185]">-1</b>
                      <small className="text-slate-500 mr-1">11:15</small>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center py-1 border-b border-[#1e2b3f]/70 text-[10px]">
                    <span className="font-bold">بنع موضي</span>
                    <span className="text-slate-300 col-span-2">🌫️ استخدم غيمة</span>
                    <div className="text-left font-mono">
                      <b className="text-[#fb7185]">-1</b>
                      <small className="text-slate-500 mr-1">11:14</small>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center py-1 text-[10px]">
                    <span className="font-bold">ريم عبدالله</span>
                    <span className="text-slate-300 col-span-2">🔨 استخدمت مطرقة</span>
                    <div className="text-left font-mono">
                      <b className="text-[#fb7185]">-1</b>
                      <small className="text-slate-500 mr-1">11:13</small>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Feature 7: Inventory + Duration Countdown */}
            <article className="p-5 border border-[#e5e7eb] rounded-3xl bg-white shadow-xl shadow-black/5 hover:border-orange-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#ff6a00] text-white font-black flex items-center justify-center text-sm shrink-0">
                    7
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#111827]">مخزون الداعمين + مدة الأداة</h3>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">
                      تعرف ما يملكه كل داعم والمدة المتبقية لكل أداة حتى انتهاء صلاحيتها.
                    </p>
                  </div>
                </div>

                {/* Dark Demo 7 */}
                <div className="bg-[#0b1523] border border-[#1f2f46] rounded-2xl p-3.5 text-white text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#213048]">
                    <b className="font-bold">🎁 مخزون الداعمين</b>
                    <span className="text-[#ffd19c] text-[10px]">المدة القصوى 5 أيام</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#1e2b3f]/70">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center font-bold text-[10px]">ف</span>
                      <div>
                        <b className="text-[11px] block">فهد</b>
                        <small className="text-slate-400 text-[9px]">🖐️ قفاز تعزيز ×2</small>
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-lg text-[#ffd19c] bg-[#4a2a0d] border border-[#7a4617] font-mono">
                      {countdowns[0]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#1e2b3f]/70">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-fuchsia-600 flex items-center justify-center font-bold text-[10px]">ر</span>
                      <div>
                        <b className="text-[11px] block">ريم عبدالله</b>
                        <small className="text-slate-400 text-[9px]">🌫️ غيمة ×1</small>
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-lg text-[#ffd19c] bg-[#4a2a0d] border border-[#7a4617] font-mono">
                      {countdowns[1]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px]">O</span>
                      <div>
                        <b className="text-[11px] block">Oxygeen</b>
                        <small className="text-slate-400 text-[9px]">⏱️ تمديد وقت ×1</small>
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-lg text-[#ffd19c] bg-[#4a2a0d] border border-[#7a4617] font-mono">
                      {countdowns[2]}
                    </span>
                  </div>
                </div>
              </div>
            </article>

            {/* Feature 8: Reports & Analytics */}
            <article className="p-5 border border-[#e5e7eb] rounded-3xl bg-white shadow-xl shadow-black/5 hover:border-orange-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#ff6a00] text-white font-black flex items-center justify-center text-sm shrink-0">
                    8
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#111827]">التقارير والسجل</h3>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">
                      ارجع للجولات والأحداث والداعمين والمخزون وبيانات الاستخدام في سجل واحد.
                    </p>
                  </div>
                </div>

                {/* Dark Demo 8 */}
                <div className="bg-[#0b1523] border border-[#1f2f46] rounded-2xl p-3.5 text-white text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#213048]">
                    <b className="font-bold">إحصائيات الجولات</b>
                    <span className="text-[#94a3b8] text-[10px]">آخر 7 أيام</span>
                  </div>
                  {/* Mini Bars Chart */}
                  <div className="h-16 flex items-end gap-2 px-2 pb-1 border-b border-[#233248]">
                    <div className="flex-1 bg-gradient-to-t from-[#ff6a00] to-[#ff9f43] rounded-t h-[38%]" />
                    <div className="flex-1 bg-gradient-to-t from-[#ff6a00] to-[#ff9f43] rounded-t h-[66%]" />
                    <div className="flex-1 bg-gradient-to-t from-[#ff6a00] to-[#ff9f43] rounded-t h-[49%]" />
                    <div className="flex-1 bg-gradient-to-t from-[#ff6a00] to-[#ff9f43] rounded-t h-[82%]" />
                    <div className="flex-1 bg-gradient-to-t from-[#ff6a00] to-[#ff9f43] rounded-t h-[58%]" />
                    <div className="flex-1 bg-gradient-to-t from-[#ff6a00] to-[#ff9f43] rounded-t h-[94%]" />
                    <div className="flex-1 bg-gradient-to-t from-[#ff6a00] to-[#ff9f43] rounded-t h-[71%]" />
                  </div>
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-[#101f33] p-1.5 rounded-lg">
                      <b className="text-sm font-black text-white font-mono block">27</b>
                      <small className="text-[9px] text-[#95a4b8]">جولة</small>
                    </div>
                    <div className="bg-[#101f33] p-1.5 rounded-lg">
                      <b className="text-sm font-black text-purple-400 font-mono block">14</b>
                      <small className="text-[9px] text-[#95a4b8]">أداة مرصودة</small>
                    </div>
                    <div className="bg-[#101f33] p-1.5 rounded-lg">
                      <b className="text-sm font-black text-blue-400 font-mono block">46</b>
                      <small className="text-[9px] text-[#95a4b8]">سجل محفوظ</small>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Feature 9: Enigma LAB — إنقما */}
            <article id="enigma" className="p-5 border-2 border-[#ffd0ae] rounded-3xl bg-gradient-to-b from-white to-[#fff9f4] shadow-xl shadow-orange-500/10 hover:border-orange-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#ff6a00] text-white font-black flex items-center justify-center text-sm shrink-0">
                    9
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#111827] flex items-center gap-1.5">
                      <span>Enigma LAB — إنقما</span>
                      <Crown className="w-4 h-4 text-amber-500" />
                    </h3>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">
                      رصد ظهور Enigma والبحث عن مطابقات داخل بيانات المشروع المحفوظة مع سجل تاريخي.
                    </p>
                  </div>
                </div>

                {/* Dark Demo 9: Enigma */}
                <div className="bg-[#0d1624] border border-[#2d3c53] rounded-2xl p-3.5 text-white text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-[#472b08] text-[#ffae4e] flex items-center justify-center font-bold">♛</span>
                      <div>
                        <small className="text-[8px] text-[#a3b0c4] block">ENIGMA LAB</small>
                        <b className="text-[11px] text-[#ffbf72]">تم التعرف على Enigma</b>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#0d3c2e] text-[#9ff1cb] text-[9px] font-bold">مطابقة 98%</span>
                  </div>

                  <div className="p-2.5 bg-[#101f31] border border-[#283b55] rounded-xl flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff7b00] to-[#6d3300] flex items-center justify-center font-bold text-xs text-white shrink-0">
                      E
                    </div>
                    <div>
                      <b className="text-[10px] text-white block">تم العثور على تطابق داخل بيانات المشروع</b>
                      <p className="text-[8px] text-[#9cacc0] mt-0.5">
                        السجل السابق: ظهور محفوظ • جلسة سابقة • بيانات فنية متطابقة
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-[9px]">
                    <div className="bg-[#111f31] px-2 py-1 rounded text-[#c8d4e3]">● تم التعرف على Enigma بالبث المباشر</div>
                    <div className="bg-[#111f31] px-2 py-1 rounded text-[#c8d4e3]">● مطابقة لحظية داخل قاعدة بيانات المشروع</div>
                    <div className="bg-[#111f31] px-2 py-1 rounded text-[#c8d4e3]">● سجل تاريخي وموثق للظهور والدعم</div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 4. Extra Features Bar (Dark Ink Band) */}
      <section className="bg-[#0b1320] py-8 border-y border-[#1e2a3a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111b28] border border-[#2d3949] rounded-2xl p-4 text-white">
            <b className="text-sm font-black text-[#ffb066] block mb-1">🔎 الكلمات المهمة</b>
            <span className="text-xs text-[#aeb9c7] leading-relaxed">
              رصد أي رسالة في الشات تحتوي الكلمات المحددة.
            </span>
          </div>

          <div className="bg-[#111b28] border border-[#2d3949] rounded-2xl p-4 text-white">
            <b className="text-sm font-black text-[#ffb066] block mb-1">◎ Top Viewers</b>
            <span className="text-xs text-[#aeb9c7] leading-relaxed">
              متابعة أبرز المشاهدين اللحظيين وأكثرهم تفاعلاً.
            </span>
          </div>

          <div className="bg-[#111b28] border border-[#2d3949] rounded-2xl p-4 text-white">
            <b className="text-sm font-black text-[#ffb066] block mb-1">⚡ الذكاء الاصطناعي</b>
            <span className="text-xs text-[#aeb9c7] leading-relaxed">
              تحليل وتنبؤ نزول أدوات المعركة وسرعة الدعم.
            </span>
          </div>

          <div className="bg-[#111b28] border border-[#2d3949] rounded-2xl p-4 text-white">
            <b className="text-sm font-black text-[#ffb066] block mb-1">⇢ الهدايا المرسلة</b>
            <span className="text-xs text-[#aeb9c7] leading-relaxed">
              تسجيل وتوثيق من استخدم أو أرسل أداة يرصدها النظام.
            </span>
          </div>
        </div>
      </section>

      {/* 5. How It Works (4 Steps) */}
      <section id="how" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 rounded-lg bg-[#ff6a00] text-white text-xs font-black mb-3">
              كيف يعمل؟
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#111827]">
              أربع خطوات وتبدأ المتابعة
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <article className="p-6 border border-[#ececec] rounded-2xl bg-white shadow-xl shadow-black/5 hover:-translate-y-1 transition-all">
              <b className="text-[#ff6a00] text-xs font-black block mb-2">01</b>
              <h3 className="text-base font-black text-[#111827] mb-1.5">تحصل على حساب</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                الإدارة تنشئ حسابك وتزودك ببيانات الدخول المعتمدة.
              </p>
            </article>

            <article className="p-6 border border-[#ececec] rounded-2xl bg-white shadow-xl shadow-black/5 hover:-translate-y-1 transition-all">
              <b className="text-[#ff6a00] text-xs font-black block mb-2">02</b>
              <h3 className="text-base font-black text-[#111827] mb-1.5">تسجل الدخول</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                تفتح لوحة التحكم الخاصة بك مباشرة من أي متصفح.
              </p>
            </article>

            <article className="p-6 border border-[#ececec] rounded-2xl bg-white shadow-xl shadow-black/5 hover:-translate-y-1 transition-all">
              <b className="text-[#ff6a00] text-xs font-black block mb-2">03</b>
              <h3 className="text-base font-black text-[#111827] mb-1.5">تختار حساب TikTok</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                تحدد الحساب المراد متابعته أو ربطه داخل النظام.
              </p>
            </article>

            <article className="p-6 border border-[#ececec] rounded-2xl bg-white shadow-xl shadow-black/5 hover:-translate-y-1 transition-all">
              <b className="text-[#ff6a00] text-xs font-black block mb-2">04</b>
              <h3 className="text-base font-black text-[#111827] mb-1.5">تبدأ المراقبة</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                تظهر الجولات والداعمين والرسائل والأدوات داخل اللوحة لحظياً.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 6. Benefits Band (Navy Gradient) */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 mb-16">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-[#0b1320] via-[#131e2e] to-[#1a2433] text-white grid grid-cols-2 md:grid-cols-4 gap-6 shadow-2xl">
          <div className="space-y-1">
            <b className="text-sm font-black text-[#ffb066] block">🚀 أسرع في الإدارة</b>
            <span className="text-xs text-[#b9c2cf]">كل الأدوات في مكان واحد</span>
          </div>
          <div className="space-y-1">
            <b className="text-sm font-black text-[#ffb066] block">◉ وضوح أكبر</b>
            <span className="text-xs text-[#b9c2cf]">لوحات منظمة وواضحة</span>
          </div>
          <div className="space-y-1">
            <b className="text-sm font-black text-[#ffb066] block">▥ متابعة لحظية</b>
            <span className="text-xs text-[#b9c2cf]">أحداث البث أمامك مباشرة</span>
          </div>
          <div className="space-y-1">
            <b className="text-sm font-black text-[#ffb066] block">★ تنظيم أقوى</b>
            <span className="text-xs text-[#b9c2cf]">سجلات ومخزون وتقارير</span>
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section id="faq" className="py-16 bg-[#fffaf6] border-t border-[#f0f0f0]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-lg bg-[#ff6a00] text-white text-xs font-black mb-3">
              الأسئلة الشائعة
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#111827]">
              معلومات سريعة قبل البداية
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-[#e6e6e6] rounded-2xl bg-white p-5 cursor-pointer shadow-sm hover:border-orange-200 transition-all"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <div className="flex items-center justify-between gap-4 font-bold text-sm text-[#111827]">
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isOpen && (
                    <p className="text-xs text-[#667085] leading-relaxed pt-3 border-t border-gray-100 mt-3">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Final CTA Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 my-16">
        <div className="p-8 sm:p-12 border border-[#ffd5b8] rounded-3xl bg-gradient-to-r from-[#fffaf6] to-[#fff2e7] flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-orange-500/5">
          <div className="max-w-xl text-center md:text-right space-y-2">
            <span className="text-xs font-black text-[#e65c00]">
              خطوتك القادمة نحو بث أكثر تنظيماً
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#111827]">
              ابدأ رحلتك مع مشروع الجولات الآن
            </h2>
            <p className="text-xs sm:text-sm text-[#667085]">
              إدارة أسهل، متابعة أوضح، وكل أدوات الجولات والداعمين وEnigma في مكان واحد.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-[#0b1320] text-white hover:bg-[#1a2538] transition-all shadow-md"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/dashboard"
              className="px-7 py-3 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-[#ff6a00] to-[#ff8a21] text-white hover:from-[#e55f00] hover:to-[#ff7b0f] transition-all shadow-lg shadow-orange-500/25 flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              دخول إلى اللوحة
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="border-t border-[#eee] bg-white py-8 px-6 lg:px-12 text-xs text-[#7b8492]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff6a00] to-[#ff9b3f] flex items-center justify-center text-white text-base font-bold shadow-md shadow-orange-500/20">
              ♛
            </span>
            <div>
              <b className="text-sm font-bold text-[#111827] block">مشروع الجولات</b>
              <small className="text-[#7b8492]">كل أدوات البث والجولات في مكان واحد · AEP</small>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#4b5563]">
            <a href="#features" className="hover:text-[#ff6a00] transition-colors">المميزات</a>
            <a href="#enigma" className="hover:text-[#ff6a00] transition-colors">Enigma LAB</a>
            <a href="#how" className="hover:text-[#ff6a00] transition-colors">كيف يعمل</a>
            <a href="#faq" className="hover:text-[#ff6a00] transition-colors">الأسئلة الشائعة</a>
            <Link href="/login" className="hover:text-[#ff6a00] transition-colors">تسجيل الدخول</Link>
            <Link href="/dashboard" className="hover:text-[#ff6a00] transition-colors">لوحة التحكم</Link>
          </div>

          <div className="text-center md:text-left text-[#9ca3af]">
            © 2026 مشروع الجولات AEP. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
}
