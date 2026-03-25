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
  Bell,
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

interface NotificationItem {
  id: string;
  type: 'leave_pending';
  title: string;
  description: string;
  href: string;
  time: string;
  read: boolean;
}

function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch pending leave requests as notifications
  React.useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/leave?status=PENDING&limit=20', { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success) return;

        const items: NotificationItem[] = (json.data || []).map((leave: { id: string; employee: { emplNm: string; emplNo: string }; leaveType: { lvTypeNm: string }; startDt: string; endDt: string; lvDays: number; creatDt: string }) => ({
          id: leave.id,
          type: 'leave_pending' as const,
          title: `${leave.employee.emplNm} xin nghỉ phép`,
          description: `${leave.leaveType.lvTypeNm} — ${leave.lvDays} ngày (${leave.startDt} → ${leave.endDt})`,
          href: `/leave?status=PENDING`,
          time: leave.creatDt,
          read: readIds.has(leave.id),
        }));
        setNotifications(items);
      } catch {
        // Ignore
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.role, readIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = (notification: NotificationItem) => {
    setReadIds((prev) => new Set(prev).add(notification.id));
    setOpen(false);
    router.push(notification.href);
  };

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  if (user?.role !== 'ADMIN') return null;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} ngày trước`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)]',
          'hover:bg-[var(--color-bg-secondary)] transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
          'cursor-pointer',
        )}
        aria-label={`${unreadCount} thông báo chưa đọc`}
      >
        <Bell className="h-5 w-5 text-[var(--color-text-tertiary)]" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-white animate-in zoom-in"
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-bold)',
              background: 'var(--color-error-500)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 z-[var(--z-dropdown)]',
            'w-[380px] max-h-[480px] rounded-[var(--radius-xl)] border overflow-hidden',
            'animate-in slide-in-from-top-2',
          )}
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg-card)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                Thông báo
              </span>
              {unreadCount > 0 && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-white"
                  style={{ fontSize: 'var(--font-size-xs)', background: 'var(--color-brand-500)' }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="cursor-pointer hover:underline"
                style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-brand)' }}
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center" style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Không có thông báo mới
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'flex items-start gap-3 w-full px-4 py-3 text-left cursor-pointer',
                    'hover:bg-[var(--color-bg-secondary)] transition-colors duration-[var(--duration-fast)]',
                    'border-b',
                    !n.read && 'bg-[var(--color-brand-50)]',
                  )}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5"
                    style={{
                      background: 'var(--color-warning-50)',
                      color: 'var(--color-warning-500)',
                    }}
                  >
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: n.read ? 'var(--font-weight-normal)' : 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {n.title}
                    </p>
                    <p
                      className="truncate mt-0.5"
                      style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}
                    >
                      {n.description}
                    </p>
                    <p
                      className="mt-1"
                      style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}
                    >
                      {formatTime(n.time)}
                    </p>
                  </div>
                  {!n.read && (
                    <div
                      className="h-2 w-2 rounded-full shrink-0 mt-2"
                      style={{ background: 'var(--color-brand-500)' }}
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
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
      className="relative z-[var(--z-dropdown)] flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-8"
      style={{
        borderColor: 'var(--color-border)',
        background: 'color-mix(in srgb, var(--color-bg-primary) 80%, transparent)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-3">
        <SidebarMobileTrigger />
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
      <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            'flex items-center gap-3 rounded-[var(--radius-xl)] px-3 py-2',
            'hover:bg-[var(--color-bg-secondary)] transition-all duration-[var(--duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
          )}
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
          aria-controls="user-dropdown-menu"
        >
          {/* Avatar */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-accent-500))',
              color: 'var(--color-text-inverse)',
              fontFamily: 'var(--font-family-heading)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-bold)',
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
              'h-4 w-4 text-[var(--color-text-tertiary)] transition-transform duration-[var(--duration-fast)]',
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
            id="user-dropdown-menu"
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
                  'transition-colors duration-[var(--duration-fast)]',
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
                  'transition-colors duration-[var(--duration-fast)]',
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
              fontFamily: 'var(--font-family-heading)',
              fontWeight: 'var(--font-weight-medium)',
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
          className="flex-1 overflow-y-auto p-4 lg:p-8 bg-mesh"
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
