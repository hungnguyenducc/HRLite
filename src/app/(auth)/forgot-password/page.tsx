'use client';

import * as React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button, Input, useToast } from '@/components/ui';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email không được để trống').email('Email không hợp lệ'),
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
    <div>
      {/* Back link */}
      <div className="mb-[var(--spacing-6)] animate-fade-up">
        <Link
          href="/login"
          className="inline-flex items-center gap-[var(--spacing-2)] text-[var(--font-size-sm)] font-[var(--font-weight-medium)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
          style={{ color: 'var(--color-text-brand)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại đăng nhập
        </Link>
      </div>

      {/* Header */}
      <div className="mb-[var(--spacing-8)] animate-fade-up">
        <h1
          className="font-serif italic leading-[var(--line-height-tight)]"
          style={{
            fontSize: 'var(--font-size-4xl)',
            color: 'var(--color-text-primary)',
          }}
        >
          Quên mật khẩu
        </h1>
        <p
          className="mt-[var(--spacing-2)] text-[var(--font-size-base)]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Nhập email để nhận liên kết đặt lại mật khẩu
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-[var(--radius-2xl)] p-[var(--spacing-8)] animate-fade-up-delay-1"
        style={{
          background: 'var(--color-bg-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {sent ? (
          <div className="flex flex-col items-center gap-[var(--spacing-4)] text-center animate-fade-up">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: 'var(--color-success-50)' }}
            >
              <Mail className="h-8 w-8" style={{ color: 'var(--color-success-500)' }} />
            </div>
            <div>
              <p
                className="text-[var(--font-size-lg)] font-[var(--font-weight-semibold)]"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Đã gửi email
              </p>
              <p
                className="text-[var(--font-size-sm)] mt-[var(--spacing-2)] max-w-[320px]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu đến{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>. Vui lòng
                kiểm tra hộp thư của bạn.
              </p>
            </div>

            {/* Accent divider */}
            <div
              className="w-12 h-[2px] rounded-full my-[var(--spacing-2)]"
              style={{ background: 'var(--color-accent-400)' }}
            />

            <Link
              href="/login"
              className="inline-flex items-center gap-[var(--spacing-2)] text-[var(--font-size-sm)] font-[var(--font-weight-medium)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
              style={{ color: 'var(--color-text-brand)' }}
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-5)]" noValidate>
            <div className="animate-fade-up-delay-1">
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
            </div>

            <div className="animate-fade-up-delay-2 pt-[var(--spacing-1)]">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={loading}
              >
                Gửi link đặt lại mật khẩu
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
