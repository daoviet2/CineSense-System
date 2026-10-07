import type { Metadata } from 'next';
import React from 'react';
import '@/styles/globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Navbar } from '@/components/Navbar';

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
    <html lang="vi">
      <body>
        <QueryProvider>
          <Navbar />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
