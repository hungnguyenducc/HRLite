'use client';

import * as React from 'react';
import { Users, UserCheck, CalendarDays, Building2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function StatCard({ label, value, icon, color, bgColor }: StatCardProps) {
  return (
    <Card variant="default">
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
              {label}
            </span>
            <span className="text-[var(--font-size-2xl)] font-[var(--font-weight-bold)] text-[var(--color-text-primary)]">
              {value}
            </span>
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)]"
            style={{ background: bgColor, color }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
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
}

const quickActions: QuickAction[] = [
  { label: 'Thêm nhân viên', href: '/employees', description: 'Thêm nhân viên mới vào hệ thống' },
  { label: 'Chấm công', href: '/attendance', description: 'Xem và quản lý chấm công' },
  { label: 'Duyệt nghỉ phép', href: '/leave', description: 'Xem yêu cầu nghỉ phép chờ duyệt' },
  { label: 'Xem báo cáo', href: '/reports', description: 'Xem báo cáo tổng hợp' },
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[var(--font-size-2xl)] font-[var(--font-weight-bold)] text-[var(--color-text-primary)]">
          Xin chào, {displayName}
        </h1>
        <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] mt-1">
          Tổng quan hệ thống quản lý nhân sự
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng nhân viên"
          value={statsLoading ? '—' : String(stats.totalEmployees)}
          icon={<Users className="h-6 w-6" />}
          color="var(--color-brand-600)"
          bgColor="var(--color-brand-50)"
        />
        <StatCard
          label="Đang làm việc"
          value={statsLoading ? '—' : String(stats.activeEmployees)}
          icon={<UserCheck className="h-6 w-6" />}
          color="var(--color-success-700)"
          bgColor="var(--color-success-50)"
        />
        <StatCard
          label="Nghỉ phép hôm nay"
          value={statsLoading ? '—' : String(stats.onLeaveToday)}
          icon={<CalendarDays className="h-6 w-6" />}
          color="var(--color-warning-700)"
          bgColor="var(--color-warning-50)"
        />
        <StatCard
          label="Phòng ban"
          value={statsLoading ? '—' : String(stats.departments)}
          icon={<Building2 className="h-6 w-6" />}
          color="var(--color-info-700)"
          bgColor="var(--color-info-50)"
        />
      </div>

      <div>
        <h2 className="text-[var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] mb-4">
          Thao tác nhanh
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Card key={action.href} variant="interactive" onClick={() => router.push(action.href)}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={cn(
                        'text-[var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]',
                      )}
                    >
                      {action.label}
                    </p>
                    <p className="text-[var(--font-size-xs)] text-[var(--color-text-secondary)] mt-0.5">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-tertiary)] shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
