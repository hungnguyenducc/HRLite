import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">HRLite</h1>
      <p className="mt-4 text-lg text-[var(--color-text-secondary)]">
        Công cụ quản lý nhân sự nội bộ
      </p>
      <Link
        href="/login"
        className="mt-8 inline-flex items-center rounded-lg px-6 py-3 text-base font-medium text-white transition-colors"
        style={{
          backgroundColor: 'var(--color-primary)',
        }}
      >
        Đăng nhập
      </Link>
    </main>
  );
}
