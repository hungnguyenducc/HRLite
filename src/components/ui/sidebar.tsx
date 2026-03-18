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

export function Sidebar({ children, className }: { children: React.ReactNode; className?: string }) {
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

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]',
          'transition-all duration-[var(--transition-slow)]',
          // Desktop
          'hidden lg:flex',
          collapsed ? 'w-16' : 'w-64',
          // Mobile (drawer)
          mobileOpen && 'fixed inset-y-0 left-0 z-[var(--z-modal)] flex w-64 lg:relative',
          className,
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-[var(--color-border)]">
          {!collapsed && (
            <span className="text-[var(--font-size-base)] font-[var(--font-weight-bold)] text-[var(--color-text-primary)] truncate">
              HRLite
            </span>
          )}
          {/* Desktop toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">{children}</nav>
      </aside>
    </>
  );
}

export function SidebarGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="mb-2">
      {label && !collapsed && (
        <p className="px-3 py-2 text-[var(--font-size-xs)] font-[var(--font-weight-semibold)] text-[var(--color-text-tertiary)] uppercase tracking-wider">
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
        'flex items-center gap-3 w-full rounded-[var(--radius-lg)] px-3 py-2',
        'text-[var(--font-size-sm)] font-[var(--font-weight-medium)]',
        'transition-all duration-[var(--transition-fast)]',
        active
          ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]',
        collapsed && 'justify-center px-0',
      )}
      title={collapsed ? label : undefined}
    >
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
      className="lg:hidden h-10 w-10 flex items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
      aria-label="Open menu"
    >
      <PanelLeft className="h-5 w-5" />
    </button>
  );
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 overflow-y-auto">
      {children}
    </main>
  );
}
