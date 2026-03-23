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
          style={{ background: 'color-mix(in srgb, var(--color-bg-inverse) 50%, transparent)', backdropFilter: 'blur(8px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col relative overflow-hidden',
          'transition-all duration-[var(--duration-slow)]',
          'hidden lg:flex',
          collapsed ? 'w-[72px]' : 'w-[260px]',
          mobileOpen && 'fixed inset-y-0 left-0 z-[var(--z-modal)] flex w-[260px] lg:relative',
          className,
        )}
        style={{
          background: 'linear-gradient(180deg, var(--color-bg-inverse) 0%, var(--color-brand-950) 60%, var(--color-brand-900) 100%)',
        }}
      >
        {/* Ambient glow — top */}
        <div
          className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-brand-500) 12%, transparent) 0%, transparent 70%)',
          }}
        />
        {/* Ambient glow — bottom */}
        <div
          className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent-500) 8%, transparent) 0%, transparent 70%)',
          }}
        />

        {/* ── Header ── */}
        <div className="relative z-10 flex flex-col px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            {!collapsed ? (
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-accent-500))',
                    boxShadow: '0 4px 12px color-mix(in srgb, var(--color-brand-500) 30%, transparent)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-text-inverse)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    HR
                  </span>
                </div>
                <div>
                  <span
                    className="block leading-none"
                    style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-text-inverse)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    HRLite
                  </span>
                  <span
                    className="block mt-0.5"
                    style={{
                      fontSize: 'var(--font-size-2xs)',
                      color: 'var(--color-text-inverse-faint)',
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
                  background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-accent-500))',
                  boxShadow: '0 4px 12px color-mix(in srgb, var(--color-brand-500) 30%, transparent)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-family-heading)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text-inverse)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  HR
                </span>
              </div>
            )}

            {/* Desktop toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                'hidden lg:flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)]',
                'text-white/30 hover:text-white/70 hover:bg-white/[0.06]',
                'transition-all duration-[var(--duration-fast)]',
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
              className="lg:hidden h-7 w-7 flex items-center justify-center rounded-[var(--radius-md)] text-white/30 hover:text-white/70 hover:bg-white/[0.06]"
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
              background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-text-inverse) 6%, transparent), transparent)',
            }}
          />
        </div>

        {/* ── Navigation ── */}
        <nav className="relative z-10 flex-1 overflow-y-auto px-3 pb-4 scrollbar-none">
          {children}
        </nav>
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
            fontSize: 'var(--font-size-2xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-inverse-subtle)',
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
        'transition-all duration-[var(--duration-normal)]',
        active ? 'text-white' : 'text-white/45 hover:text-white/75 hover:bg-white/[0.04]',
        collapsed && 'justify-center px-0',
      )}
      style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
        ...(active
          ? {
              background: 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)',
              boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
            }
          : {}),
      }}
      title={collapsed ? label : undefined}
      aria-label={label}
    >
      {/* Active indicator — gradient accent bar */}
      {active && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
          style={{
            background: 'linear-gradient(180deg, var(--color-brand-400), var(--color-accent-400))',
            boxShadow: '0 0 8px color-mix(in srgb, var(--color-brand-500) 40%, transparent)',
          }}
        />
      )}
      {active && collapsed && (
        <span
          className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-1 h-1 rounded-full"
          style={{
            background: 'var(--color-accent-400)',
            boxShadow: '0 0 6px color-mix(in srgb, var(--color-accent-500) 50%, transparent)',
          }}
        />
      )}

      {/* Icon */}
      <span
        className={cn(
          'shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px] transition-transform duration-[var(--duration-fast)]',
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
