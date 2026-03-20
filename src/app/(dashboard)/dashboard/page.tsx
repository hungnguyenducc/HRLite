'use client';

import * as React from 'react';
import {
  Users,
  UserCheck,
  UserMinus,
  CalendarDays,
  Building2,
  ArrowUpRight,
  Clock,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  departments: number;
}

interface EmployeeStats {
  total: number;
  working: number;
  onLeave: number;
  resigned: number;
  newThisMonth: number;
  byDepartment: { deptNm: string; count: number }[];
}

// ─── Component ────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = React.useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeaveToday: 0,
    departments: 0,
  });
  const [emplStats, setEmplStats] = React.useState<EmployeeStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, emplRes] = await Promise.all([
          fetch('/api/dashboard/stats', { credentials: 'include' }),
          fetch('/api/employees/stats', { credentials: 'include' }),
        ]);

        if (dashRes.ok) {
          const d = await dashRes.json();
          if (d.success) setStats(d.data);
        }
        if (emplRes.ok) {
          const e = await emplRes.json();
          if (e.success) setEmplStats(e.data);
        }
      } catch {
        // Defaults
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'bạn';
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const dateStr = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Workforce ratio for visual bar
  const workingPercent =
    stats.totalEmployees > 0 ? Math.round((stats.activeEmployees / stats.totalEmployees) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
          style={{ borderColor: 'var(--color-brand-300)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 max-w-[1200px]">
      {/* ─── Hero Section ─── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] p-8 md:p-10 mb-8"
        style={{
          background:
            'linear-gradient(135deg, var(--color-bg-inverse) 0%, var(--color-brand-900) 50%, var(--color-brand-700) 100%)',
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'var(--color-accent-400)' }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-[0.07]"
          style={{ background: 'var(--color-brand-300)' }}
        />
        <div
          className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full opacity-[0.05]"
          style={{ background: 'var(--color-bg-card)' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--color-accent-400)' }} />
              <span
                className="uppercase tracking-[0.15em]"
                style={{
                  color: 'var(--color-accent-400)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                {dateStr}
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontSize: 'clamp(1.875rem, 4vw, 2.75rem)',
                fontWeight: 'var(--font-weight-bold)',
                fontStyle: 'italic',
                lineHeight: 'var(--line-height-tight)',
                color: 'var(--color-text-inverse)',
              }}
            >
              {greeting},
              <br />
              <span style={{ color: 'var(--color-accent-400)' }}>{displayName}</span>
            </h1>
            <p
              className="mt-3 max-w-md"
              style={{
                color: 'rgba(250, 247, 242, 0.6)',
                fontSize: 'var(--font-size-sm)',
                lineHeight: 'var(--line-height-relaxed)',
              }}
            >
              Tổng quan hệ thống quản lý nhân sự HRLite
            </p>
          </div>

          {/* Time widget */}
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-[var(--radius-xl)]"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
          >
            <Clock className="h-4 w-4" style={{ color: 'var(--color-accent-400)' }} />
            <span
              style={{
                color: 'var(--color-text-inverse)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                fontFamily: 'var(--font-family-mono)',
              }}
            >
              {now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Stat Cards Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Tổng nhân viên',
            value: stats.totalEmployees,
            icon: <Users className="h-5 w-5" />,
            color: 'var(--color-brand-500)',
            bg: 'var(--color-brand-50)',
            href: '/employees',
          },
          {
            label: 'Đang làm việc',
            value: stats.activeEmployees,
            icon: <UserCheck className="h-5 w-5" />,
            color: 'var(--color-success-500)',
            bg: 'var(--color-success-50)',
            href: '/employees?status=WORKING',
          },
          {
            label: 'Nghỉ phép hôm nay',
            value: stats.onLeaveToday,
            icon: <CalendarDays className="h-5 w-5" />,
            color: 'var(--color-warning-500)',
            bg: 'var(--color-warning-50)',
            href: '/leave',
          },
          {
            label: 'Phòng ban',
            value: stats.departments,
            icon: <Building2 className="h-5 w-5" />,
            color: 'var(--color-info-500)',
            bg: 'var(--color-info-50)',
            href: '/departments',
          },
        ].map((card, i) => (
          <button
            key={card.label}
            onClick={() => router.push(card.href)}
            className={cn(
              'group relative text-left rounded-[var(--radius-xl)] border p-5',
              'transition-all duration-[var(--transition-normal)]',
              'hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
              'animate-fade-up',
            )}
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-bg-card)',
              animationDelay: `${i * 80}ms`,
            }}
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ background: card.color }}
            />

            <div className="flex items-start justify-between mb-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)]"
                style={{ background: card.bg, color: card.color }}
              >
                {card.icon}
              </div>
              <ArrowUpRight
                className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0"
                style={{ color: 'var(--color-text-tertiary)' }}
              />
            </div>

            <p
              className="text-[var(--color-text-secondary)] mb-1"
              style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {card.label}
            </p>
            <p
              className="text-[var(--color-text-primary)]"
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 'var(--font-weight-bold)',
                lineHeight: '1',
              }}
            >
              {card.value}
            </p>
          </button>
        ))}
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* ─── Workforce Overview (large card) ─── */}
        <div
          className="lg:col-span-2 rounded-[var(--radius-xl)] border p-6 animate-fade-up"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg-card)',
            animationDelay: '350ms',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                className="text-[var(--color-text-primary)]"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontStyle: 'italic',
                }}
              >
                Tình hình nhân sự
              </h2>
              <p
                className="text-[var(--color-text-tertiary)] mt-1"
                style={{ fontSize: 'var(--font-size-xs)' }}
              >
                Phân bổ nhân viên theo trạng thái
              </p>
            </div>
            {emplStats?.newThisMonth !== undefined && emplStats.newThisMonth > 0 && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)]"
                style={{ background: 'var(--color-success-50)', color: 'var(--color-success-700)' }}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  +{emplStats.newThisMonth} tháng này
                </span>
              </div>
            )}
          </div>

          {/* Workforce bar */}
          <div className="mb-6">
            <div className="flex items-end justify-between mb-2">
              <span
                className="text-[var(--color-text-secondary)]"
                style={{ fontSize: 'var(--font-size-xs)' }}
              >
                Tỷ lệ đang làm việc
              </span>
              <span
                className="text-[var(--color-text-primary)]"
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-bold)',
                }}
              >
                {workingPercent}%
              </span>
            </div>
            <div
              className="h-3 rounded-[var(--radius-full)] overflow-hidden"
              style={{ background: 'var(--color-bg-secondary)' }}
            >
              <div
                className="h-full rounded-[var(--radius-full)] transition-all duration-1000 ease-out"
                style={{
                  width: `${workingPercent}%`,
                  background:
                    'linear-gradient(90deg, var(--color-success-500), var(--color-brand-500))',
                }}
              />
            </div>
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: 'Đang làm',
                value: emplStats?.working ?? stats.activeEmployees,
                icon: <UserCheck className="h-4 w-4" />,
                color: 'var(--color-success-500)',
                bg: 'var(--color-success-50)',
              },
              {
                label: 'Tạm nghỉ',
                value: emplStats?.onLeave ?? 0,
                icon: <UserMinus className="h-4 w-4" />,
                color: 'var(--color-warning-500)',
                bg: 'var(--color-warning-50)',
              },
              {
                label: 'Đã nghỉ',
                value: emplStats?.resigned ?? 0,
                icon: <Users className="h-4 w-4" />,
                color: 'var(--color-error-500)',
                bg: 'var(--color-error-50)',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)]"
                style={{ background: item.bg }}
              >
                <div style={{ color: item.color }}>{item.icon}</div>
                <div>
                  <p
                    className="text-[var(--color-text-primary)]"
                    style={{
                      fontSize: 'var(--font-size-xl)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontFamily: 'var(--font-family-serif)',
                      lineHeight: '1',
                    }}
                  >
                    {item.value}
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: item.color,
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    {item.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Department Distribution ─── */}
        <div
          className="rounded-[var(--radius-xl)] border p-6 animate-fade-up"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg-card)',
            animationDelay: '430ms',
          }}
        >
          <h2
            className="text-[var(--color-text-primary)] mb-1"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              fontStyle: 'italic',
            }}
          >
            Theo phòng ban
          </h2>
          <p
            className="text-[var(--color-text-tertiary)] mb-5"
            style={{ fontSize: 'var(--font-size-xs)' }}
          >
            Phân bổ nhân viên
          </p>

          {emplStats?.byDepartment && emplStats.byDepartment.length > 0 ? (
            <div className="flex flex-col gap-3">
              {emplStats.byDepartment
                .filter((d) => d.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((dept, i) => {
                  const maxCount = Math.max(...emplStats.byDepartment.map((d) => d.count));
                  const barPercent = maxCount > 0 ? (dept.count / maxCount) * 100 : 0;
                  const colors = [
                    'var(--color-brand-500)',
                    'var(--color-accent-500)',
                    'var(--color-success-500)',
                    'var(--color-info-500)',
                    'var(--color-warning-500)',
                  ];
                  return (
                    <div key={dept.deptNm}>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[var(--color-text-primary)] truncate max-w-[160px]"
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-medium)',
                          }}
                        >
                          {dept.deptNm}
                        </span>
                        <span
                          className="text-[var(--color-text-secondary)] shrink-0"
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            fontFamily: 'var(--font-family-mono)',
                          }}
                        >
                          {dept.count}
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-[var(--radius-full)] overflow-hidden"
                        style={{ background: 'var(--color-bg-secondary)' }}
                      >
                        <div
                          className="h-full rounded-[var(--radius-full)] transition-all duration-700 ease-out"
                          style={{
                            width: `${barPercent}%`,
                            background: colors[i % colors.length],
                            transitionDelay: `${500 + i * 100}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p
              className="text-[var(--color-text-tertiary)] text-center py-8"
              style={{ fontSize: 'var(--font-size-sm)' }}
            >
              Chưa có dữ liệu
            </p>
          )}
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="animate-fade-up" style={{ animationDelay: '500ms' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
          <h2
            className="text-[var(--color-text-tertiary)] shrink-0 uppercase tracking-[0.15em]"
            style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            Thao tác nhanh
          </h2>
          <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Thêm nhân viên',
              desc: 'Tạo hồ sơ mới',
              icon: <Users className="h-5 w-5" />,
              href: '/employees',
              color: 'var(--color-brand-500)',
            },
            {
              label: 'Phòng ban',
              desc: 'Quản lý cơ cấu',
              icon: <Building2 className="h-5 w-5" />,
              href: '/departments',
              color: 'var(--color-info-500)',
            },
            {
              label: 'Chấm công',
              desc: 'Theo dõi giờ làm',
              icon: <Clock className="h-5 w-5" />,
              href: '/attendance',
              color: 'var(--color-success-500)',
            },
            {
              label: 'Nghỉ phép',
              desc: 'Duyệt yêu cầu',
              icon: <CalendarDays className="h-5 w-5" />,
              href: '/leave',
              color: 'var(--color-accent-500)',
            },
          ].map((action, i) => (
            <button
              key={action.href}
              onClick={() => router.push(action.href)}
              className={cn(
                'group text-left rounded-[var(--radius-xl)] border p-4',
                'transition-all duration-[var(--transition-normal)]',
                'hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                'animate-fade-up',
              )}
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-card)',
                animationDelay: `${550 + i * 60}ms`,
              }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] mb-3 transition-transform duration-200 group-hover:scale-110"
                style={{ background: 'var(--color-bg-secondary)', color: action.color }}
              >
                {action.icon}
              </div>
              <p
                className="text-[var(--color-text-primary)]"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                {action.label}
              </p>
              <p
                className="text-[var(--color-text-tertiary)] mt-0.5"
                style={{ fontSize: 'var(--font-size-xs)' }}
              >
                {action.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
