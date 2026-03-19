'use client';

import * as React from 'react';
import {
  Users,
  UserCheck,
  CalendarDays,
  Building2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  delay: number;
}

function StatCard({ label, value, icon, accentColor, iconBg, iconColor, delay }: StatCardProps) {
  return (
    <div
      className="animate-fade-up hover-lift"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Card variant="default">
        <CardContent>
          <div className="flex items-stretch gap-4">
            {/* Left accent border */}
            <div
              className="w-1 rounded-full shrink-0 -my-1"
              style={{ background: accentColor }}
            />
            <div className="flex flex-1 items-center justify-between">
              <div className="flex flex-col gap-1">
                <span
                  className="text-[var(--color-text-secondary)]"
                  style={{ fontSize: 'var(--font-size-sm)' }}
                >
                  {label}
                </span>
                <span
                  className="text-[var(--color-text-primary)]"
                  style={{
                    fontSize: 'var(--font-size-3xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    fontFamily: 'var(--font-family-serif)',
                    lineHeight: 'var(--line-height-tight)',
                  }}
                >
                  {value}
                </span>
              </div>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)] shrink-0"
                style={{ background: iconBg, color: iconColor }}
              >
                {icon}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  departments: number;
}

interface QuickAction {
  label: string;
  href: string;
  description: string;
  icon: React.ReactNode;
}

const quickActions: QuickAction[] = [
  {
    label: 'Thêm nhân viên',
    href: '/employees',
    description: 'Thêm nhân viên mới vào hệ thống',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'Chấm công',
    href: '/attendance',
    description: 'Xem và quản lý chấm công',
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    label: 'Duyệt nghỉ phép',
    href: '/leave',
    description: 'Xem yêu cầu nghỉ phép chờ duyệt',
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    label: 'Xem báo cáo',
    href: '/reports',
    description: 'Xem báo cáo tổng hợp',
    icon: <Building2 className="h-5 w-5" />,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = React.useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeaveToday: 0,
    departments: 0,
  });
  const [statsLoading, setStatsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
        if (res.ok) {
          const data: { success: boolean; data: DashboardStats } = await res.json();
          if (data.success) {
            setStats(data.data);
          }
        }
      } catch {
        // Stats remain at default zero values
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'bạn';

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="flex flex-col gap-8 max-w-[1200px]">
      {/* Greeting section */}
      <div className="animate-fade-up">
        <h1
          className="text-[var(--color-text-primary)]"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'var(--font-size-4xl)',
            fontWeight: 'var(--font-weight-bold)',
            fontStyle: 'italic',
            lineHeight: 'var(--line-height-tight)',
          }}
        >
          {greeting},{' '}
          <span className="text-[var(--color-text-accent)]">{displayName}</span>
        </h1>
        <p
          className="text-[var(--color-text-secondary)] mt-2"
          style={{ fontSize: 'var(--font-size-base)' }}
        >
          Tổng quan hệ thống quản lý nhân sự
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng nhân viên"
          value={statsLoading ? '—' : String(stats.totalEmployees)}
          icon={<Users className="h-6 w-6" />}
          accentColor="var(--color-brand-500)"
          iconColor="var(--color-brand-600)"
          iconBg="var(--color-brand-50)"
          delay={0}
        />
        <StatCard
          label="Đang làm việc"
          value={statsLoading ? '—' : String(stats.activeEmployees)}
          icon={<UserCheck className="h-6 w-6" />}
          accentColor="var(--color-success-500)"
          iconColor="var(--color-success-700)"
          iconBg="var(--color-success-50)"
          delay={80}
        />
        <StatCard
          label="Nghỉ phép hôm nay"
          value={statsLoading ? '—' : String(stats.onLeaveToday)}
          icon={<CalendarDays className="h-6 w-6" />}
          accentColor="var(--color-accent-500)"
          iconColor="var(--color-warning-700)"
          iconBg="var(--color-warning-50)"
          delay={160}
        />
        <StatCard
          label="Phòng ban"
          value={statsLoading ? '—' : String(stats.departments)}
          icon={<Building2 className="h-6 w-6" />}
          accentColor="var(--color-info-500)"
          iconColor="var(--color-info-700)"
          iconBg="var(--color-info-50)"
          delay={240}
        />
      </div>

      {/* Quick actions */}
      <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
        <h2
          className="text-[var(--color-text-primary)] mb-4"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          Thao tác nhanh
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickActions.map((action, index) => (
            <button
              key={action.href}
              onClick={() => router.push(action.href)}
              className={cn(
                'group text-left rounded-[var(--radius-xl)] border p-4',
                'hover-lift cursor-pointer',
                'transition-all duration-[var(--transition-normal)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                'animate-fade-up',
              )}
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-card)',
                animationDelay: `${350 + index * 60}ms`,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] transition-colors duration-[var(--transition-fast)]"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[var(--color-text-primary)] truncate"
                    style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}
                  >
                    {action.label}
                  </p>
                  <p
                    className="text-[var(--color-text-secondary)] mt-0.5 truncate"
                    style={{ fontSize: 'var(--font-size-xs)' }}
                  >
                    {action.description}
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-[var(--transition-fast)] group-hover:translate-x-1"
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
