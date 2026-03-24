'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button, Input, Badge, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { firebaseSignUp } from '@/lib/firebase/auth';
import { mapFirebaseError } from '@/lib/firebase/errors';

const signupSchema = z
  .object({
    fullName: z.string().optional(),
    email: z.string().min(1, 'Email không được để trống').email('Email không hợp lệ'),
    password: z
      .string()
      .min(1, 'Mật khẩu không được để trống')
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type SignupForm = z.infer<typeof signupSchema>;
type FieldErrors = Partial<Record<keyof SignupForm, string>>;

interface TermItemApi {
  id: string;
  typeCd: string;
  verNo: string;
  title: string;
  content: string;
  reqYn: string;
}

interface TermItem {
  id: string;
  type: string;
  version: string;
  title: string;
  content: string;
  required: boolean;
}

function getPasswordStrength(password: string): {
  level: 'weak' | 'medium' | 'strong';
  label: string;
} {
  if (password.length === 0) return { level: 'weak', label: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 'weak', label: 'Yếu' };
  if (score <= 3) return { level: 'medium', label: 'Trung bình' };
  return { level: 'strong', label: 'Mạnh' };
}

const strengthColors: Record<string, string> = {
  weak: 'bg-[var(--color-error-500)]',
  medium: 'bg-[var(--color-warning-500)]',
  strong: 'bg-[var(--color-success-500)]',
};

const strengthWidths: Record<string, string> = {
  weak: 'w-1/3',
  medium: 'w-2/3',
  strong: 'w-full',
};

export default function SignupPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [form, setForm] = React.useState<SignupForm>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [loading, setLoading] = React.useState(false);
  const [terms, setTerms] = React.useState<TermItem[]>([]);
  const [agreedTerms, setAgreedTerms] = React.useState<Record<string, boolean>>({});
  const [termsError, setTermsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await fetch('/api/terms/active');
        if (res.ok) {
          const data: { success: boolean; data: TermItemApi[] } = await res.json();
          if (data.success) {
            setTerms(
              data.data.map((t) => ({
                id: t.id,
                type: t.typeCd,
                version: t.verNo,
                title: t.title,
                content: t.content,
                required: t.reqYn === 'Y',
              })),
            );
          }
        }
      } catch {
        // Terms will be empty; user can still sign up if no required terms
      }
    };
    fetchTerms();
  }, []);

  const passwordStrength = getPasswordStrength(form.password);

  const handleChange = (field: keyof SignupForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTermToggle = (termId: string) => {
    setAgreedTerms((prev) => ({ ...prev, [termId]: !prev[termId] }));
    if (termsError) setTermsError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = signupSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SignupForm;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    const requiredTerms = terms.filter((t) => t.required);
    const allRequiredAgreed = requiredTerms.every((t) => agreedTerms[t.id]);
    if (!allRequiredAgreed) {
      setTermsError('Vui lòng đồng ý với tất cả điều khoản bắt buộc');
      return;
    }

    setLoading(true);
    setErrors({});
    setTermsError(null);

    try {
      const agreedTermIds = Object.entries(agreedTerms)
        .filter(([, agreed]) => agreed)
        .map(([id]) => id);

      // Step 1: Create user in Firebase
      const { idToken, user: firebaseUser } = await firebaseSignUp(result.data.email, result.data.password);

      // Step 2: Register in server DB + create session
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          idToken,
          displayName: result.data.fullName || undefined,
          agreedTermsIds: agreedTermIds,
        }),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        // Rollback: delete Firebase user if server registration failed
        try {
          await firebaseUser.delete();
        } catch {
          // Firebase user may remain orphaned if delete fails
        }
        addToast({
          variant: 'error',
          title: 'Đăng ký thất bại',
          description: data.error || 'Không thể tạo tài khoản. Vui lòng thử lại.',
        });
        return;
      }

      addToast({
        variant: 'success',
        title: 'Đăng ký thành công',
        description: 'Chào mừng bạn đến với HRLite!',
      });
      router.push('/dashboard');
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Đăng ký thất bại',
        description: mapFirebaseError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-[var(--spacing-6)] animate-fade-up">
        <h1
          className="font-serif italic leading-[var(--line-height-tight)]"
          style={{
            fontSize: 'var(--font-size-4xl)',
            color: 'var(--color-text-primary)',
          }}
        >
          Tạo tài khoản
        </h1>
        <p
          className="mt-[var(--spacing-2)] text-[var(--font-size-base)]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Đăng ký tài khoản HRLite mới
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
              label="Họ và tên"
              type="text"
              placeholder="Nguyễn Văn A"
              value={form.fullName ?? ''}
              onChange={handleChange('fullName')}
              error={errors.fullName}
              autoComplete="name"
            />
          </div>

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

          <div className="flex flex-col gap-[var(--spacing-2)] animate-fade-up-delay-2">
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="Tối thiểu 8 ký tự"
              value={form.password}
              onChange={handleChange('password')}
              error={errors.password}
              autoComplete="new-password"
              required
              aria-required="true"
            />
            {form.password.length > 0 && (
              <div className="flex items-center gap-[var(--spacing-2)]">
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--color-bg-tertiary)' }}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      strengthWidths[passwordStrength.level],
                      strengthColors[passwordStrength.level],
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-[var(--font-size-xs)] font-[var(--font-weight-medium)]',
                    passwordStrength.level === 'weak' && 'text-[var(--color-error-500)]',
                    passwordStrength.level === 'medium' && 'text-[var(--color-warning-500)]',
                    passwordStrength.level === 'strong' && 'text-[var(--color-success-500)]',
                  )}
                >
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className="animate-fade-up-delay-2">
            <Input
              label="Xác nhận mật khẩu"
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
              aria-required="true"
            />
          </div>

          {terms.length > 0 && (
            <fieldset
              className={cn(
                'flex flex-col gap-[var(--spacing-3)] mt-[var(--spacing-1)] animate-fade-up-delay-3',
                'rounded-[var(--radius-lg)] p-4 transition-all duration-200',
                termsError
                  ? 'border-2 border-[var(--color-error-500)] bg-[var(--color-error-50)]'
                  : 'border border-[var(--color-border)]',
              )}
            >
              <legend
                className={cn(
                  'text-[var(--font-size-sm)] font-[var(--font-weight-medium)] px-1',
                  termsError ? 'text-[var(--color-error-700)]' : 'text-[var(--color-text-primary)]',
                )}
              >
                Điều khoản sử dụng
              </legend>
              {terms.map((term) => (
                <label
                  key={term.id}
                  className="flex items-start gap-[var(--spacing-3)] cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={agreedTerms[term.id] ?? false}
                    onChange={() => handleTermToggle(term.id)}
                    className={cn(
                      'mt-0.5 h-4 w-4 rounded-[var(--radius-sm)] cursor-pointer focus:ring-[var(--color-border-focus)]',
                      termsError && !(agreedTerms[term.id])
                        ? 'border-[var(--color-error-500)] text-[var(--color-error-500)]'
                        : 'border-[var(--color-border)] text-[var(--color-brand-600)]',
                    )}
                    aria-required={term.required ? 'true' : undefined}
                  />
                  <span
                    className="flex-1 text-[var(--font-size-sm)] transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {term.title}{' '}
                    <Badge variant={term.required ? 'error' : 'default'} size="sm">
                      {term.required ? 'Bắt buộc' : 'Tùy chọn'}
                    </Badge>
                  </span>
                </label>
              ))}
              {termsError && (
                <p
                  className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-error-600)]"
                  role="alert"
                >
                  {termsError}
                </p>
              )}
            </fieldset>
          )}

          <div className="animate-fade-up-delay-3 pt-[var(--spacing-1)]">
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
              Đăng ký
            </Button>
          </div>
        </form>
      </div>

      {/* Footer link */}
      <p
        className="mt-[var(--spacing-6)] text-center text-[var(--font-size-sm)] animate-fade-up-delay-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Đã có tài khoản?{' '}
        <Link
          href="/login"
          className="font-[var(--font-weight-semibold)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
          style={{ color: 'var(--color-text-brand)' }}
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
