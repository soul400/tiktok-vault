'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, Lock, User, ArrowLeft, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }

    setLoading(true);
    setError('');

    // Mock authentication: simulate instant secure authentication and redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard');
    }, 600);
  };

  const handleQuickDemo = () => {
    setUsername('admin_demo');
    setPassword('aep2026');
    setLoading(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffaf6] via-[#fff7f0] to-[#f4f7fa] text-[#111827] flex flex-col font-sans selection:bg-[#ff6a00] selection:text-white" dir="rtl">
      {/* Top Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6a00] to-[#ff9b3f] flex items-center justify-center text-white text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            ♛
          </span>
          <div className="grid">
            <b className="text-base text-[#111827] leading-tight">مشروع الجولات</b>
            <small className="text-[11px] text-[#6b7280]">AEP TikTok LIVE</small>
          </div>
        </Link>

        <Link
          href="/"
          className="text-xs font-bold text-[#6b7280] hover:text-[#ff6a00] flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50"
        >
          العودة للرئيسية
          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
        </Link>
      </header>

      {/* Login Card Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#e5e7eb] rounded-3xl p-8 shadow-2xl shadow-black/5 relative overflow-hidden">
          {/* Decorative Corner Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-200/40 to-transparent rounded-bl-full pointer-events-none" />

          {/* Heading */}
          <div className="text-center mb-7 relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 text-[#ff6a00] border border-orange-100 mb-3 shadow-sm">
              <Crown className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-[#111827]">تسجيل الدخول</h1>
            <p className="text-xs text-[#6b7280] mt-1.5">
              أدخل بيانات حسابك المعتمد للدخول إلى لوحة إدارة البث والجولات
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-[#374151] mb-1.5">
                اسم المستخدم أو المعرف
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9ca3af] absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pr-10 pl-4 py-2.5 text-xs bg-[#f9fafb] border border-[#d1d5db] rounded-xl text-[#111827] focus:outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-orange-500/20 font-mono transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#374151]">
                  كلمة المرور
                </label>
                <span className="text-[11px] text-[#ff6a00] hover:underline cursor-pointer">
                  نسيت كلمة المرور؟
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9ca3af] absolute right-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-4 py-2.5 text-xs bg-[#f9fafb] border border-[#d1d5db] rounded-xl text-[#111827] focus:outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-orange-500/20 font-mono transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#6b7280]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-[#ff6a00] focus:ring-orange-500 w-4 h-4" />
                <span>تذكر هذا الجهاز</span>
              </label>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> اتصال آمن SSL
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#ff6a00] to-[#ff8a21] hover:from-[#e55f00] hover:to-[#ff7b0f] text-white rounded-xl text-xs font-black shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <span>دخول إلى لوحة التحكم</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Bypass */}
          <div className="mt-5 pt-4 border-t border-[#f3f4f6] text-center">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2.5 px-3 bg-[#0b1320] hover:bg-[#121c2b] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-[#ff8a21]" />
              دخول سريع ومباشر للتجربة (Demo Access)
            </button>

            <p className="text-[11px] text-[#9ca3af] mt-3 leading-relaxed">
              الحسابات الرسمية يتم إنشاؤها وتفعيلها عبر إدارة مشروع الجولات.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <footer className="py-4 text-center text-xs text-[#9ca3af] border-t border-[#eee]">
        © 2026 مشروع الجولات — AEP TikTok LIVE Intelligence. جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}
