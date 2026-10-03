import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {children}
    </div>
  );
}
