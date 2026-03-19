import Link from 'next/link';
import { Button } from '@/components/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">HRLite</h1>
      <p className="mt-4 text-lg text-[var(--color-text-secondary)]">
        Công cụ quản lý nhân sự nội bộ
      </p>
      <Button asChild variant="primary" size="lg" className="mt-8">
        <Link href="/login">Đăng nhập</Link>
      </Button>
    </main>
  );
}
