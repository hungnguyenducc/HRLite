'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button, Input, Card, CardContent, useToast } from '@/components/ui';

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
            HRLite
          </h1>
          <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] mt-1">
            Đăng nhập vào tài khoản của bạn
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[var(--font-size-sm)] text-[var(--color-text-brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            Đăng nhập
          </Button>
        </form>

        <p className="mt-6 text-center text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
          Chưa có tài khoản?{' '}
          <Link
            href="/signup"
            className="text-[var(--color-text-brand)] font-[var(--font-weight-medium)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
          >
            Đăng ký
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
