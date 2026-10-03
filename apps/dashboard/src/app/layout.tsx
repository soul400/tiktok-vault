import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AEP LIVE COMMAND CENTER | مركز قيادة عمليات TikTok LIVE',
  description: 'مركز قيادة العمليات اللحظية واستخبارات المعارك والداعمين لبثوث TikTok LIVE.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth dark">
      <body className="min-h-screen bg-[#070A12] text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
