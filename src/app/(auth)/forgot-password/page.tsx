'use client';

import * as React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button, Input, Card, CardContent, useToast } from '@/components/ui';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
});

export default function ForgotPasswordPage() {
  const { addToast } = useToast();

  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message);
      return;
    }

    setLoading(true);
    setEmailError(undefined);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: result.data.email }),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: 'Gửi yêu cầu thất bại',
          description: data.error || 'Không thể gửi email. Vui lòng thử lại.',
        });
        return;
      }

      setSent(true);
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="elevated">
      <CardContent>
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)] mb-4"
            style={{ background: 'var(--color-brand-600)' }}
          >
            <span className="text-[var(--font-size-xl)] font-[var(--font-weight-bold)] text-[var(--color-text-inverse)]">
              HR
            </span>
          </div>
          <h1 className="text-[var(--font-size-2xl)] font-[var(--font-weight-bold)] text-[var(--color-text-primary)]">
            Quên mật khẩu
          </h1>
          <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] mt-1 text-center">
            Nhập email để nhận liên kết đặt lại mật khẩu
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: 'var(--color-success-50)' }}
            >
              <Mail className="h-8 w-8" style={{ color: 'var(--color-success-500)' }} />
            </div>
            <div>
              <p className="text-[var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
                Đã gửi email
              </p>
              <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] mt-2">
                Chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu đến{' '}
                <strong className="text-[var(--color-text-primary)]">{email}</strong>.
                Vui lòng kiểm tra hộp thư của bạn.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[var(--font-size-sm)] text-[var(--color-text-brand)] font-[var(--font-weight-medium)] hover:underline mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <Input
                label="Email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(undefined);
                }}
                error={emailError}
                autoComplete="email"
                required
                aria-required="true"
              />

              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Gửi link đặt lại mật khẩu
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-[var(--font-size-sm)] text-[var(--color-text-brand)] font-[var(--font-weight-medium)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại đăng nhập
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
