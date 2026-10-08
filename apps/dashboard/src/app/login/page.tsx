'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex items-center justify-center p-4 font-sans select-none" dir="rtl">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold animate-pulse shadow-lg shadow-cyan-500/20">
          ♛
        </div>
        <h1 className="text-lg font-black text-slate-100">جاري الدخول إلى لوحة العمليات مباشرة...</h1>
        <p className="text-xs text-slate-400 font-mono">AEP LIVE INTELLIGENCE · DIRECT ACCESS</p>
      </div>
    </div>
  );
}
