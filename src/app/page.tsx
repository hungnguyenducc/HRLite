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
        className="login-glow mt-8 inline-flex h-12 items-center justify-center rounded-[var(--radius-xl)] px-8 text-[var(--font-size-base)] font-semibold text-white transition-all duration-300 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-300)] focus-visible:ring-offset-2"
      >
        Đăng nhập
      </Link>
    </main>
  );
}
