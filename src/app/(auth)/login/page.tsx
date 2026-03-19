'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button, Input, useToast } from '@/components/ui';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

type FieldErrors = Partial<Record<keyof LoginForm, string>>;

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [form, setForm] = React.useState<LoginForm>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [loading, setLoading] = React.useState(false);

  const handleChange = (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginForm;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(result.data),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: 'Đăng nhập thất bại',
          description: data.error || 'Email hoặc mật khẩu không chính xác',
        });
        return;
      }

      router.push('/dashboard');
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
      {/* Header */}
      <div className="mb-[var(--spacing-8)] animate-fade-up">
        <h1
          className="font-serif italic leading-[var(--line-height-tight)]"
          style={{
            fontSize: 'var(--font-size-4xl)',
            color: 'var(--color-text-primary)',
          }}
        >
          Đăng nhập
        </h1>
        <p
          className="mt-[var(--spacing-2)] text-[var(--font-size-base)]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Chào mừng bạn quay lại HRLite
        </p>
      </div>

      {/* Form card */}
      <div
        className="rounded-[var(--radius-2xl)] p-[var(--spacing-8)] animate-fade-up-delay-1"
        style={{
          background: 'var(--color-bg-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-5)]" noValidate>
          <div className="animate-fade-up-delay-1">
            <Input
              label="Email"
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={handleChange('email')}
              error={errors.email}
              autoComplete="email"
              required
              aria-required="true"
            />
          </div>

          <div className="animate-fade-up-delay-2">
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={handleChange('password')}
              error={errors.password}
              autoComplete="current-password"
              required
              aria-required="true"
            />
          </div>

          <div className="flex justify-end animate-fade-up-delay-2">
            <Link
              href="/forgot-password"
              className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
              style={{ color: 'var(--color-text-brand)' }}
            >
              Quên mật khẩu?
            </Link>
          </div>

          <div className="animate-fade-up-delay-3 pt-[var(--spacing-1)]">
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
              Đăng nhập
            </Button>
          </div>
        </form>
      </div>

      {/* Footer link */}
      <p
        className="mt-[var(--spacing-6)] text-center text-[var(--font-size-sm)] animate-fade-up-delay-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Chưa có tài khoản?{' '}
        <Link
          href="/signup"
          className="font-[var(--font-weight-semibold)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
          style={{ color: 'var(--color-text-brand)' }}
        >
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
}
