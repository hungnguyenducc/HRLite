'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, useToast } from '@/components/ui';
import { firebaseSignIn, firebaseGoogleSignIn, firebaseSignOut } from '@/lib/firebase/auth';
import { firebaseAuth } from '@/lib/firebase/config';
import { mapFirebaseError } from '@/lib/firebase/errors';
import { loginSchema, type LoginInput } from '@/lib/auth/validation';
import { TermsAgreementDialog } from '@/components/auth/terms-agreement-dialog';

type LoginForm = LoginInput;

type FieldErrors = Partial<Record<keyof LoginForm, string>>;

interface PendingTerm {
  id: string;
  title: string;
  typeCd: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [form, setForm] = React.useState<LoginForm>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [loading, setLoading] = React.useState(false);

  // Google sign-in state
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = React.useState(false);
  const [pendingGoogleData, setPendingGoogleData] = React.useState<{
    idToken: string;
    pendingTerms: PendingTerm[];
  } | null>(null);

  const isAnyLoading = loading || googleLoading;

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
      // Step 1: Firebase sign in
      const { idToken } = await firebaseSignIn(result.data.email, result.data.password);

      // Step 2: Create server session
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: 'Đăng nhập thất bại',
          description: data.error || 'Không thể tạo phiên đăng nhập',
        });
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Đăng nhập thất bại',
        description: mapFirebaseError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);

    try {
      const { idToken } = await firebaseGoogleSignIn();

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: 'Đăng nhập thất bại',
          description: data.error || 'Không thể đăng nhập bằng Google',
        });
        return;
      }

      // New user needs to agree to terms first
      if (data.data?.requiresRegistration) {
        setPendingGoogleData({
          idToken,
          pendingTerms: data.data.pendingTerms,
        });
        setTermsDialogOpen(true);
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      const firebaseError = error as { code?: string };
      const code = firebaseError?.code ?? '';

      // Don't show toast for user-cancelled popup
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;

      addToast({
        variant: 'error',
        title: 'Đăng nhập thất bại',
        description: mapFirebaseError(error),
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleTermsConfirm = async (agreedTermsIds: string[]) => {
    if (!pendingGoogleData) return;

    setGoogleLoading(true);

    try {
      // Refresh idToken in case the original one has expired while user was reading terms
      const freshIdToken =
        (await firebaseAuth.currentUser?.getIdToken()) ?? pendingGoogleData.idToken;

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          idToken: freshIdToken,
          agreedTermsIds,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: 'Đăng ký thất bại',
          description: data.error || 'Không thể hoàn tất đăng ký',
        });
        return;
      }

      setTermsDialogOpen(false);
      setPendingGoogleData(null);
      router.push('/dashboard');
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi hệ thống',
        description: 'Vui lòng thử lại sau',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleTermsCancel = async () => {
    setTermsDialogOpen(false);
    setPendingGoogleData(null);
    // Clean up Firebase session to prevent stale auth state
    await firebaseSignOut();
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
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
              disabled={isAnyLoading}
            >
              Đăng nhập
            </Button>
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-[var(--spacing-3)] my-[var(--spacing-5)] animate-fade-up-delay-3">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          <span
            className="text-[var(--font-size-sm)]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            hoặc
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Google Sign-In Button */}
        <div className="animate-fade-up-delay-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            loading={googleLoading}
            disabled={isAnyLoading}
            onClick={handleGoogleSignIn}
          >
            <svg className="mr-[var(--spacing-2)] h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Đăng nhập với Google
          </Button>
        </div>
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

      {/* Terms Agreement Dialog for Google Sign-In */}
      <TermsAgreementDialog
        open={termsDialogOpen}
        terms={pendingGoogleData?.pendingTerms ?? []}
        loading={googleLoading}
        onConfirm={handleTermsConfirm}
        onCancel={handleTermsCancel}
      />
    </div>
  );
}
