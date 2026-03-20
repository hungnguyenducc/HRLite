'use client';

import * as React from 'react';
import { PanelLeftClose, PanelLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">{children}</div>
    </SidebarProvider>
  );
}

export function Sidebar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal-backdrop)] lg:hidden"
          style={{ background: 'rgba(12, 10, 29, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col relative overflow-hidden',
          'transition-all duration-[var(--transition-slow)]',
          'hidden lg:flex',
          collapsed ? 'w-[72px]' : 'w-[260px]',
          mobileOpen && 'fixed inset-y-0 left-0 z-[var(--z-modal)] flex w-[260px] lg:relative',
          className,
        )}
        style={{
          background: 'linear-gradient(180deg, #1e1b4b 0%, #0f0d2e 100%)',
        }}
      >
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Glow orb — top right */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          }}
        />

        {/* ── Header ── */}
        <div className="relative z-10 flex flex-col px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            {!collapsed ? (
              <div className="flex items-center gap-2.5">
                {/* Logo mark */}
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] shrink-0"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-family-serif)',
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontStyle: 'italic',
                      color: '#fff',
                      lineHeight: 1,
                    }}
                  >
                    H
                  </span>
                </div>
                <div>
                  <span
                    className="block leading-none"
                    style={{
                      fontFamily: 'var(--font-family-serif)',
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontStyle: 'italic',
                      color: 'var(--color-text-inverse)',
                    }}
                  >
                    HRLite
                  </span>
                  <span
                    className="block mt-0.5"
                    style={{
                      fontSize: '0.625rem',
                      color: 'rgba(250, 247, 242, 0.35)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    HR Platform
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] mx-auto"
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 'var(--font-weight-bold)',
                    fontStyle: 'italic',
                    color: '#fff',
                    lineHeight: 1,
                  }}
                >
                  H
                </span>
              </div>
            )}

            {/* Desktop toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                'hidden lg:flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)]',
                'text-white/40 hover:text-white/80 hover:bg-white/[0.06]',
                'transition-all duration-[var(--transition-fast)]',
                collapsed && 'mx-auto mt-3',
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeft className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Mobile close */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden h-7 w-7 flex items-center justify-center rounded-[var(--radius-md)] text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
              aria-label="Close sidebar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="relative z-10 mx-4 mb-2">
          <div
            className="h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(250, 247, 242, 0.08), transparent)',
            }}
          />
        </div>

        {/* ── Navigation ── */}
        <nav className="relative z-10 flex-1 overflow-y-auto px-3 pb-4 scrollbar-none">
          {children}
        </nav>

        {/* ── Bottom glow ── */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: 'linear-gradient(0deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%)',
          }}
        />
      </aside>
    </>
  );
}

export function SidebarGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="mb-3">
      {label && !collapsed && (
        <p
          className="px-3 pt-3 pb-1.5"
          style={{
            fontSize: '0.65rem',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'rgba(250, 247, 242, 0.3)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </p>
      )}
      {collapsed && label && <div className="mx-auto my-2 w-5 h-px bg-white/10" />}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  const { collapsed } = useSidebar();

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 w-full rounded-[var(--radius-lg)] px-3 py-2.5 relative',
        'transition-all duration-[var(--transition-normal)]',
        active ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
        collapsed && 'justify-center px-0',
      )}
      style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
        ...(active
          ? {
              background:
                'linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))',
              boxShadow: 'inset 0 0 0 1px rgba(99, 102, 241, 0.1)',
            }
          : {}),
      }}
      title={collapsed ? label : undefined}
    >
      {/* Active indicator — amber accent dot/bar */}
      {active && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
          style={{
            background: 'var(--color-accent-400)',
            boxShadow: '0 0 8px rgba(251, 191, 36, 0.4)',
          }}
        />
      )}
      {active && collapsed && (
        <span
          className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-1 h-1 rounded-full"
          style={{
            background: 'var(--color-accent-400)',
            boxShadow: '0 0 6px rgba(251, 191, 36, 0.5)',
          }}
        />
      )}

      {/* Icon */}
      <span
        className={cn(
          'shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px] transition-transform duration-[var(--transition-fast)]',
          !active && 'group-hover:scale-110',
        )}
      >
        {icon}
      </span>

      {/* Label */}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export function SidebarMobileTrigger() {
  const { setMobileOpen } = useSidebar();

  return (
    <button
      onClick={() => setMobileOpen(true)}
      className="lg:hidden h-10 w-10 flex items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
      aria-label="Open menu"
    >
      <PanelLeft className="h-5 w-5" />
    </button>
  );
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 flex flex-col overflow-hidden">{children}</main>;
}
