import type { Metadata } from 'next';
import React from 'react';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Navbar } from '@/components/Navbar';

// Modern Dark Cinema typography
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CineSense — Nền tảng Gợi ý Phim Thông minh',
  description:
    'Khám phá thế giới điện ảnh với hệ thống gợi ý phim lai ghép (Hybrid Recommendation) cá nhân hóa cho bạn.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={inter.variable}>
      <body>
        {/* Skip-to-content for keyboard / screen reader users (WCAG 2.1 AA) */}
        <a href="#main-content" className="skip-to-content">
          Chuyển đến nội dung chính
        </a>
        <QueryProvider>
          <Navbar />
          <div id="main-content">
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
