import { ToastProvider } from '@/components/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* ── Branding Panel (desktop only) ── */}
        <div
          className="hidden lg:flex lg:w-[480px] xl:w-[560px] relative flex-col justify-between overflow-hidden"
          style={{ background: 'var(--color-bg-inverse)' }}
        >
          {/* Dot grid background */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle, var(--color-brand-300) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Geometric decorations */}
          <div className="absolute top-0 right-0 w-[280px] h-[280px] opacity-[0.06]">
            <div
              className="absolute top-12 right-12 w-48 h-48 rounded-full border-2"
              style={{ borderColor: 'var(--color-accent-400)' }}
            />
            <div
              className="absolute top-24 right-0 w-32 h-32 rounded-full border"
              style={{ borderColor: 'var(--color-brand-400)' }}
            />
          </div>

          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] opacity-[0.06]">
            <div
              className="absolute bottom-8 left-8 w-40 h-40 rounded-full border-2"
              style={{ borderColor: 'var(--color-brand-400)' }}
            />
            <div
              className="absolute bottom-20 left-20 w-24 h-[1px]"
              style={{ background: 'var(--color-accent-400)' }}
            />
            <div
              className="absolute bottom-12 left-32 w-[1px] h-24"
              style={{ background: 'var(--color-accent-400)' }}
            />
          </div>

          {/* Accent line top-left */}
          <div
            className="absolute top-0 left-0 w-1 h-24"
            style={{ background: 'var(--color-accent-500)' }}
          />
          <div
            className="absolute top-0 left-0 h-1 w-24"
            style={{ background: 'var(--color-accent-500)' }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center flex-1 px-[var(--spacing-12)] py-[var(--spacing-16)]">
            <div className="animate-slide-in-left">
              {/* Brand logo mark */}
              <div
                className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)] mb-[var(--spacing-10)]"
                style={{ background: 'var(--color-accent-500)' }}
              >
                <span
                  className="text-[var(--font-size-xl)] font-[var(--font-weight-bold)]"
                  style={{ color: 'var(--color-bg-inverse)' }}
                >
                  HR
                </span>
              </div>

              {/* App name — serif italic */}
              <h1
                className="font-serif italic leading-[var(--line-height-tight)] mb-[var(--spacing-4)]"
                style={{
                  fontSize: 'var(--font-size-5xl)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                HRLite
              </h1>

              {/* Accent underline */}
              <div
                className="w-16 h-[3px] rounded-full mb-[var(--spacing-6)]"
                style={{ background: 'var(--color-accent-400)' }}
              />

              {/* Tagline */}
              <p
                className="text-[var(--font-size-xl)] leading-[var(--line-height-relaxed)] max-w-[320px]"
                style={{ color: 'var(--color-brand-200)' }}
              >
                Quản lý nhân sự thông minh
              </p>

              <p
                className="text-[var(--font-size-sm)] leading-[var(--line-height-relaxed)] max-w-[300px] mt-[var(--spacing-4)]"
                style={{ color: 'var(--color-brand-300)' }}
              >
                Nền tảng quản lý nhân sự toàn diện, giúp tổ chức vận hành hiệu quả hơn mỗi ngày.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 px-[var(--spacing-12)] pb-[var(--spacing-8)]">
            <p className="text-[var(--font-size-xs)]" style={{ color: 'var(--color-brand-400)' }}>
              &copy; {new Date().getFullYear()} HRLite. All rights reserved.
            </p>
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="flex flex-1 flex-col" style={{ background: 'var(--color-bg-primary)' }}>
          {/* Mobile branding header */}
          <div
            className="lg:hidden flex items-center gap-[var(--spacing-3)] px-[var(--spacing-6)] py-[var(--spacing-4)]"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)]"
              style={{ background: 'var(--color-brand-600)' }}
            >
              <span
                className="text-[var(--font-size-xs)] font-[var(--font-weight-bold)]"
                style={{ color: 'var(--color-text-inverse)' }}
              >
                HR
              </span>
            </div>
            <span
              className="font-serif italic text-[var(--font-size-xl)]"
              style={{ color: 'var(--color-text-primary)' }}
            >
              HRLite
            </span>
          </div>

          {/* Centered form area */}
          <div className="flex flex-1 items-center justify-center px-[var(--spacing-6)] py-[var(--spacing-10)]">
            <div className="w-full max-w-[440px]">{children}</div>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
