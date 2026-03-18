import { ToastProvider } from '@/components/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div
        className="flex min-h-screen items-center justify-center px-4 py-8"
        style={{
          background:
            'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-primary) 50%, var(--color-brand-50) 100%)',
        }}
      >
        <div className="w-full max-w-md">{children}</div>
      </div>
    </ToastProvider>
  );
}
