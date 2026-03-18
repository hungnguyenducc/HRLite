'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Building2,
  Clock,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  User,
} from 'lucide-react';
import {
  SidebarLayout,
  Sidebar,
  SidebarGroup,
  SidebarItem,
  SidebarMobileTrigger,
  SidebarContent,
  ToastProvider,
} from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <Home /> },
  { label: 'Nhân viên', href: '/employees', icon: <Users /> },
  { label: 'Phòng ban', href: '/departments', icon: <Building2 /> },
  { label: 'Chấm công', href: '/attendance', icon: <Clock /> },
  { label: 'Nghỉ phép', href: '/leave', icon: <CalendarDays /> },
  { label: 'Báo cáo', href: '/reports', icon: <BarChart3 /> },
];

const adminNavItems: NavItem[] = [
  { label: 'Cài đặt', href: '/admin/users', icon: <Settings />, adminOnly: true },
];

function DashboardSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarGroup>
        {mainNavItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
            onClick={() => router.push(item.href)}
          />
        ))}
      </SidebarGroup>

      {user?.role === 'ADMIN' && (
        <>
          <div className="mx-3 my-2 h-px bg-[var(--color-border)]" role="separator" />
          <SidebarGroup>
            {adminNavItems.map((item) => (
              <SidebarItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                active={pathname.startsWith(item.href)}
                onClick={() => router.push(item.href)}
              />
            ))}
          </SidebarGroup>
        </>
      )}
    </Sidebar>
  );
}

function TopHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <SidebarMobileTrigger />
      </div>

      <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            'flex items-center gap-2 rounded-[var(--radius-lg)] px-3 py-2',
            'hover:bg-[var(--color-bg-secondary)] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
          )}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--font-size-sm)] font-[var(--font-weight-medium)]"
            style={{
              background: 'var(--color-brand-100)',
              color: 'var(--color-brand-700)',
            }}
          >
            {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="hidden text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)] sm:inline">
            {user?.displayName || user?.email || ''}
          </span>
          <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)]" />
        </button>

        {dropdownOpen && (
          <div
            className={cn(
              'absolute right-0 top-full mt-1 z-[var(--z-dropdown)]',
              'min-w-[200px] rounded-[var(--radius-xl)] border border-[var(--color-border)]',
              'bg-[var(--color-bg-primary)] shadow-[var(--shadow-lg)] py-1',
            )}
            role="menu"
            aria-label="Menu người dùng"
          >
            <div className="px-3 py-2 border-b border-[var(--color-border)]">
              <p className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)] truncate">
                {user?.displayName || 'Người dùng'}
              </p>
              <p className="text-[var(--font-size-xs)] text-[var(--color-text-tertiary)] truncate">
                {user?.email || ''}
              </p>
            </div>

            <button
              onClick={() => {
                setDropdownOpen(false);
                router.push('/profile');
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2',
                'text-[var(--font-size-sm)] text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-bg-secondary)] transition-colors',
              )}
              role="menuitem"
            >
              <User className="h-4 w-4" />
              Hồ sơ cá nhân
            </button>

            <div className="my-1 h-px bg-[var(--color-border)]" role="separator" />

            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2',
                'text-[var(--font-size-sm)] text-[var(--color-error-500)]',
                'hover:bg-[var(--color-error-50)] transition-colors',
              )}
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--color-brand-600)', borderTopColor: 'transparent' }}
          />
          <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
            Đang tải...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <DashboardSidebar />
      <SidebarContent>
        <TopHeader />
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</div>
      </SidebarContent>
    </SidebarLayout>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <DashboardShell>{children}</DashboardShell>
      </AuthProvider>
    </ToastProvider>
  );
}
