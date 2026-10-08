'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex items-center justify-center p-4 font-sans select-none" dir="rtl">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold animate-pulse shadow-xl shadow-cyan-500/20">
          ♛
        </div>
        <h1 className="text-xl font-black text-slate-100">جاري تحميل مركز عمليات TikTok LIVE...</h1>
        <p className="text-xs text-cyan-400 font-mono">AEP COMMAND CENTER · LOADING DIRECTLY</p>
      </div>
    </div>
  );
}
