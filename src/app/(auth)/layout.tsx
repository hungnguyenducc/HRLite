import { ToastProvider } from '@/components/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* ── Branding Panel (desktop only) ── */}
        <div
          className="hidden lg:flex lg:w-[480px] xl:w-[560px] relative flex-col justify-between overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #4338ca 100%)',
          }}
        >
          {/* Gradient mesh orbs */}
          <div
            className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.6) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <div
            className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-15"
            style={{
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />
          <div
            className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center flex-1 px-[var(--spacing-12)] py-[var(--spacing-16)]">
            <div className="animate-slide-in-left">
              {/* Brand logo mark */}
              <div
                className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-2xl)] mb-[var(--spacing-10)]"
                style={{
                  background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-accent-500))',
                  boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
                }}
              >
                <span
                  className="text-[var(--font-size-lg)] tracking-tight"
                  style={{
                    color: '#ffffff',
                    fontFamily: 'var(--font-family-heading)',
                    fontWeight: 'var(--font-weight-bold)',
                  }}
                >
                  HR
                </span>
              </div>

              {/* App name */}
              <h1
                className="leading-[var(--line-height-tight)] mb-[var(--spacing-4)]"
                style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontSize: 'var(--font-size-5xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                HRLite
              </h1>

              {/* Accent line */}
              <div
                className="w-16 h-[3px] rounded-full mb-[var(--spacing-6)]"
                style={{
                  background: 'linear-gradient(90deg, var(--color-brand-400), var(--color-accent-400))',
                }}
              />

              {/* Tagline */}
              <p
                className="text-[var(--font-size-xl)] leading-[var(--line-height-relaxed)] max-w-[320px]"
                style={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 'var(--font-weight-normal)',
                }}
              >
                Quản lý nhân sự thông minh
              </p>

              <p
                className="text-[var(--font-size-sm)] leading-[var(--line-height-relaxed)] max-w-[300px] mt-[var(--spacing-4)]"
                style={{ color: 'rgba(255, 255, 255, 0.45)' }}
              >
                Nền tảng quản lý nhân sự toàn diện, giúp tổ chức vận hành hiệu quả hơn mỗi ngày.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 px-[var(--spacing-12)] pb-[var(--spacing-8)]">
            <p className="text-[var(--font-size-xs)]" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
              &copy; {new Date().getFullYear()} HRLite. All rights reserved.
            </p>
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="flex flex-1 flex-col bg-mesh">
          {/* Mobile branding header */}
          <div
            className="lg:hidden flex items-center gap-[var(--spacing-3)] px-[var(--spacing-6)] py-[var(--spacing-4)]"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)]"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-accent-500))',
              }}
            >
              <span
                className="text-[var(--font-size-xs)]"
                style={{
                  color: '#ffffff',
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 'var(--font-weight-bold)',
                }}
              >
                HR
              </span>
            </div>
            <span
              className="text-[var(--font-size-xl)]"
              style={{
                fontFamily: 'var(--font-family-heading)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
              }}
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
