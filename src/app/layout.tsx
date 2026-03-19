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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
