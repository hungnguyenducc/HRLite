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
          className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — Nordic Slate deep indigo */}
      <aside
        className={cn(
          'flex flex-col bg-[var(--color-bg-inverse)] relative',
          'transition-all duration-[var(--transition-slow)]',
          'hidden lg:flex',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen && 'fixed inset-y-0 left-0 z-[var(--z-modal)] flex w-64 lg:relative',
          className,
        )}
      >
        {/* Header — Logo area */}
        <div className="flex flex-col">
          <div className="flex h-16 items-center justify-between px-4">
            {!collapsed && (
              <span
                className="text-[var(--font-size-xl)] text-[var(--color-text-inverse)] italic truncate"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontWeight: 'var(--font-weight-bold)',
                }}
              >
                HRLite
              </span>
            )}
            {/* Desktop toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-inverse)] opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
            {/* Mobile close */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden h-8 w-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-inverse)] opacity-60 hover:opacity-100 hover:bg-white/10"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Amber accent line below logo */}
          <div
            className="mx-4 h-[2px] rounded-full"
            style={{ background: 'var(--color-accent-400)' }}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 mt-2 scrollbar-none">{children}</nav>
      </aside>
    </>
  );
}

export function SidebarGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="mb-2">
      {label && !collapsed && (
        <p
          className="px-3 py-2 text-[var(--font-size-xs)] uppercase tracking-wider opacity-50"
          style={{
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-inverse)',
          }}
        >
          {label}
        </p>
      )}
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
        'flex items-center gap-3 w-full rounded-[var(--radius-lg)] px-3 py-2 relative',
        'text-[var(--font-size-sm)]',
        'transition-all duration-[var(--transition-fast)]',
        active
          ? 'bg-white/10 text-[var(--color-text-inverse)]'
          : 'text-[var(--color-text-inverse)] opacity-60 hover:opacity-100 hover:bg-white/5',
        collapsed && 'justify-center px-0',
      )}
      style={{ fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)' }}
      title={collapsed ? label : undefined}
    >
      {/* Amber left accent for active items */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
          style={{ background: 'var(--color-accent-400)' }}
        />
      )}
      <span className="shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export function SidebarMobileTrigger() {
  const { setMobileOpen } = useSidebar();

  return (
    <button
      onClick={() => setMobileOpen(true)}
      className="lg:hidden h-10 w-10 flex items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
      aria-label="Open menu"
    >
      <PanelLeft className="h-5 w-5" />
    </button>
  );
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 flex flex-col overflow-hidden">{children}</main>;
}
