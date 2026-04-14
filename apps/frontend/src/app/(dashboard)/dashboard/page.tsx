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
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const dateStr = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
            'linear-gradient(135deg, var(--color-bg-inverse) 0%, var(--color-brand-950) 40%, var(--color-brand-900) 70%, var(--color-brand-700) 100%)',
        }}
      >
        {/* Gradient mesh orbs */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-brand-500) 50%, transparent) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent-500) 50%, transparent) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-brand-400) 50%, transparent) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--color-accent-400)' }} />
              <span
                className="uppercase tracking-[0.15em]"
                style={{
                  color: 'color-mix(in srgb, var(--color-accent-400) 90%, transparent)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                {dateStr}
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-family-heading)',
                fontSize: 'var(--font-size-fluid-hero)',
                fontWeight: 'var(--font-weight-bold)',
                lineHeight: 'var(--line-height-tight)',
                color: 'var(--color-text-inverse)',
                letterSpacing: '-0.02em',
              }}
            >
              {greeting},
              <br />
              <span
                style={{
                  background: 'linear-gradient(90deg, var(--color-brand-400), var(--color-accent-400))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {displayName}
              </span>
            </h1>
            <p
              className="mt-3 max-w-md"
              style={{
                color: 'var(--color-text-inverse-muted)',
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
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
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
            gradient: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
            href: '/employees',
          },
          {
            label: 'Đang làm việc',
            value: stats.activeEmployees,
            icon: <UserCheck className="h-5 w-5" />,
            gradient: 'linear-gradient(135deg, var(--color-success-500), var(--color-success-600))',
            href: '/employees?status=WORKING',
          },
          {
            label: 'Nghỉ phép hôm nay',
            value: stats.onLeaveToday,
            icon: <CalendarDays className="h-5 w-5" />,
            gradient: 'linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600))',
            href: '/leave',
          },
          {
            label: 'Phòng ban',
            value: stats.departments,
            icon: <Building2 className="h-5 w-5" />,
            gradient: 'linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600))',
            href: '/departments',
          },
        ].map((card, i) => (
          <button
            key={card.label}
            onClick={() => router.push(card.href)}
            className={cn(
              'group relative text-left rounded-[var(--radius-2xl)] p-5',
              'transition-all duration-[var(--duration-normal)]',
              'hover:shadow-[var(--shadow-xl)] hover:-translate-y-1',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
              'animate-fade-up',
            )}
            style={{
              background: 'var(--color-bg-card)',
              boxShadow: 'var(--shadow-card)',
              animationDelay: `${i * 80}ms`,
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-xl)] text-white"
                style={{
                  background: card.gradient,
                  boxShadow: '0 4px 12px color-mix(in srgb, var(--color-bg-inverse) 10%, transparent)',
                }}
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
                fontFamily: 'var(--font-family-heading)',
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 'var(--font-weight-bold)',
                lineHeight: '1',
                letterSpacing: '-0.02em',
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
          className="lg:col-span-2 rounded-[var(--radius-2xl)] p-6 animate-fade-up"
          style={{
            background: 'var(--color-bg-card)',
            boxShadow: 'var(--shadow-card)',
            animationDelay: '350ms',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                className="text-[var(--color-text-primary)]"
                style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  letterSpacing: '-0.01em',
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
                    'linear-gradient(90deg, var(--color-brand-500), var(--color-accent-500))',
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
                className="flex items-center gap-3 p-3 rounded-[var(--radius-xl)]"
                style={{ background: item.bg }}
              >
                <div style={{ color: item.color }}>{item.icon}</div>
                <div>
                  <p
                    className="text-[var(--color-text-primary)]"
                    style={{
                      fontSize: 'var(--font-size-xl)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontFamily: 'var(--font-family-heading)',
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
          className="rounded-[var(--radius-2xl)] p-6 animate-fade-up"
          style={{
            background: 'var(--color-bg-card)',
            boxShadow: 'var(--shadow-card)',
            animationDelay: '430ms',
          }}
        >
          <h2
            className="text-[var(--color-text-primary)] mb-1"
            style={{
              fontFamily: 'var(--font-family-heading)',
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              letterSpacing: '-0.01em',
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
              {(() => {
                const maxCount = Math.max(...emplStats.byDepartment.map((d) => d.count), 0);
                const colors = [
                  'var(--color-brand-500)',
                  'var(--color-accent-500)',
                  'var(--color-success-500)',
                  'var(--color-info-500)',
                  'var(--color-warning-500)',
                ];
                return emplStats.byDepartment
                .filter((d) => d.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((dept, i) => {
                  const barPercent = maxCount > 0 ? (dept.count / maxCount) * 100 : 0;
                  return (
                    <div key={dept.deptNm}>
                      <div className="flex items-center justify-between mb-1.5">
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
                            fontWeight: 'var(--font-weight-semibold)',
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
                });
              })()}
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
              gradient: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
            },
            {
              label: 'Phòng ban',
              desc: 'Quản lý cơ cấu',
              icon: <Building2 className="h-5 w-5" />,
              href: '/departments',
              gradient: 'linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600))',
            },
            {
              label: 'Chấm công',
              desc: 'Theo dõi giờ làm',
              icon: <Clock className="h-5 w-5" />,
              href: '/attendance',
              gradient: 'linear-gradient(135deg, var(--color-success-500), var(--color-success-600))',
            },
            {
              label: 'Nghỉ phép',
              desc: 'Duyệt yêu cầu',
              icon: <CalendarDays className="h-5 w-5" />,
              href: '/leave',
              gradient: 'linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600))',
            },
          ].map((action, i) => (
            <button
              key={action.href}
              onClick={() => router.push(action.href)}
              className={cn(
                'group text-left rounded-[var(--radius-2xl)] p-4',
                'transition-all duration-[var(--duration-normal)]',
                'hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                'animate-fade-up',
              )}
              style={{
                background: 'var(--color-bg-card)',
                boxShadow: 'var(--shadow-card)',
                animationDelay: `${550 + i * 60}ms`,
              }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-xl)] mb-3 text-white transition-transform duration-200 group-hover:scale-110"
                style={{
                  background: action.gradient,
                  boxShadow: '0 4px 12px color-mix(in srgb, var(--color-bg-inverse) 10%, transparent)',
                }}
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
