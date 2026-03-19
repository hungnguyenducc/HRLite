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
      <SidebarGroup label="Menu chính">
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
          <div className="mx-4 my-2 h-px bg-white/10" role="separator" />
          <SidebarGroup label="Quản trị">
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

  const initial = user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-8"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-primary)',
      }}
    >
      <div className="flex items-center gap-3">
        <SidebarMobileTrigger />
      </div>

      <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            'flex items-center gap-3 rounded-[var(--radius-xl)] px-3 py-2',
            'hover:bg-[var(--color-bg-secondary)] transition-all duration-[var(--transition-fast)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
          )}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          {/* Serif initial avatar */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              background: 'var(--color-brand-100)',
              color: 'var(--color-brand-700)',
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-bold)',
              fontStyle: 'italic',
            }}
          >
            {initial}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span
              className="text-[var(--color-text-primary)] leading-tight truncate max-w-[140px]"
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {user?.displayName || user?.email || ''}
            </span>
            <span
              className="text-[var(--color-text-tertiary)] leading-tight"
              style={{ fontSize: 'var(--font-size-xs)' }}
            >
              {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-[var(--color-text-tertiary)] transition-transform duration-[var(--transition-fast)]',
              dropdownOpen && 'rotate-180',
            )}
          />
        </button>

        {dropdownOpen && (
          <div
            className={cn(
              'absolute right-0 top-full mt-2 z-[var(--z-dropdown)]',
              'min-w-[220px] rounded-[var(--radius-xl)] border',
              'py-1 animate-in slide-in-from-top-2',
            )}
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-bg-card)',
              boxShadow: 'var(--shadow-xl)',
            }}
            role="menu"
            aria-label="Menu người dùng"
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <p
                className="text-[var(--color-text-primary)] truncate"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                {user?.displayName || 'Người dùng'}
              </p>
              <p
                className="text-[var(--color-text-tertiary)] truncate mt-0.5"
                style={{ fontSize: 'var(--font-size-xs)' }}
              >
                {user?.email || ''}
              </p>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push('/profile');
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5',
                  'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]',
                  'transition-colors duration-[var(--transition-fast)]',
                )}
                style={{ fontSize: 'var(--font-size-sm)' }}
                role="menuitem"
              >
                <User className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                Hồ sơ cá nhân
              </button>
            </div>

            <div
              className="mx-3 h-px"
              style={{ background: 'var(--color-border)' }}
              role="separator"
            />

            <div className="py-1">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5',
                  'text-[var(--color-error-500)] hover:bg-[var(--color-error-50)]',
                  'transition-colors duration-[var(--transition-fast)]',
                )}
                style={{ fontSize: 'var(--font-size-sm)' }}
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: 'var(--color-bg-primary)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-[3px] border-t-transparent"
            style={{ borderColor: 'var(--color-brand-300)', borderTopColor: 'transparent' }}
          />
          <p
            className="text-[var(--color-text-secondary)]"
            style={{
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family-serif)',
              fontStyle: 'italic',
            }}
          >
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
        <div
          className="flex-1 overflow-y-auto p-4 lg:p-8 bg-noise"
          style={{ background: 'var(--color-bg-primary)' }}
        >
          <div className="relative z-[1]">{children}</div>
        </div>
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
