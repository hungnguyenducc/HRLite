import type { Metadata } from 'next';
import '@/styles/design-tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'HRLite - Quản lý nhân sự nội bộ',
  description: 'Công cụ quản lý nhân sự nội bộ cho một tổ chức',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
