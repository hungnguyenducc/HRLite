'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Link2,
  Unlink,
  Clock,
  CalendarDays,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';

// ─── Types ───────────────────────────────────────────────

interface EmployeeDetail {
  id: string;
  emplNo: string;
  emplNm: string;
  email: string;
  phoneNo: string | null;
  deptId: string | null;
  department: { id: string; deptCd: string; deptNm: string } | null;
  posiNm: string | null;
  joinDt: string;
  resignDt: string | null;
  emplSttsCd: string;
  userId: string | null;
  user: { id: string; email: string; roleCd: string } | null;
  creatDt: string;
  creatBy: string;
  updtDt: string | null;
  updtBy: string | null;
}

interface UserOption {
  id: string;
  email: string;
  displayName: string | null;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  WORKING: { label: 'Đang làm việc', variant: 'success' },
  ON_LEAVE: { label: 'Tạm nghỉ', variant: 'warning' },
  RESIGNED: { label: 'Đã nghỉ việc', variant: 'error' },
};

// ─── Attendance Tab ──────────────────────────────────────

const atndStatusConfig: Record<string, { label: string; variant: string }> = {
  PRESENT: { label: 'Có mặt', variant: 'success' },
  LATE: { label: 'Đi trễ', variant: 'warning' },
  HALF_DAY: { label: 'Nửa ngày', variant: 'default' },
  ABSENT: { label: 'Vắng', variant: 'error' },
  HOLIDAY: { label: 'Nghỉ lễ', variant: 'secondary' },
};

interface AtndRecord {
  id: string;
  atndDt: string;
  chkInTm: string | null;
  chkOutTm: string | null;
  workHour: number | null;
  atndSttsCd: string;
  rmk: string | null;
}

function AttendanceTab({ emplId }: { emplId: string }) {
  const { addToast } = useToast();
  const [records, setRecords] = React.useState<AtndRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const now = new Date();
  const [month, setMonth] = React.useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const fetchRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', month, sortOrder: 'asc' });
      const res = await fetch(`/api/attendance?emplId=${emplId}&${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setRecords(json.data);
      }
    } catch {
      addToast({ variant: 'error', title: 'Lỗi tải dữ liệu chấm công' });
    } finally {
      setLoading(false);
    }
  }, [emplId, month, addToast]);

  React.useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const fmtTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const totalPresent = records.filter((r) => r.atndSttsCd === 'PRESENT').length;
  const totalLate = records.filter((r) => r.atndSttsCd === 'LATE').length;
  const totalAbsent = records.filter((r) => r.atndSttsCd === 'ABSENT').length;
  const totalHours = records.reduce((s, r) => s + (r.workHour ?? 0), 0);

  return (
    <Card variant="default">
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
            Chấm công tháng
          </h3>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-[var(--radius-lg)] border px-3 py-1.5"
            style={{ borderColor: 'var(--color-border)', fontSize: 'var(--font-size-sm)', background: 'var(--color-bg-primary)' }}
          />
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Có mặt', value: totalPresent, color: 'var(--color-success-600)' },
            { label: 'Đi trễ', value: totalLate, color: 'var(--color-warning-600)' },
            { label: 'Vắng', value: totalAbsent, color: 'var(--color-error-600)' },
            { label: 'Tổng giờ', value: Math.round(totalHours * 10) / 10, color: 'var(--color-brand-600)' },
          ].map((s) => (
            <div key={s.label} className="text-center p-2 rounded-[var(--radius-lg)]" style={{ background: 'var(--color-bg-secondary)' }}>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{s.label}</p>
              <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: s.color, fontFamily: 'var(--font-family-mono)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-t-transparent" style={{ borderColor: 'var(--color-brand-300)', borderTopColor: 'transparent' }} />
          </div>
        ) : records.length === 0 ? (
          <p className="text-center py-8" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>Không có dữ liệu chấm công</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Ngày', 'Giờ vào', 'Giờ ra', 'Số giờ', 'Trạng thái', 'Ghi chú'].map((h) => (
                    <th key={h} className="text-left py-2 px-2" style={{ color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const cfg = atndStatusConfig[r.atndSttsCd] ?? { label: r.atndSttsCd, variant: 'default' };
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <td className="py-2 px-2" style={{ fontFamily: 'var(--font-family-mono)' }}>{r.atndDt.slice(5)}</td>
                      <td className="py-2 px-2" style={{ fontFamily: 'var(--font-family-mono)' }}>{fmtTime(r.chkInTm)}</td>
                      <td className="py-2 px-2" style={{ fontFamily: 'var(--font-family-mono)' }}>{fmtTime(r.chkOutTm)}</td>
                      <td className="py-2 px-2" style={{ fontFamily: 'var(--font-family-mono)' }}>{r.workHour ?? '—'}</td>
                      <td className="py-2 px-2"><Badge variant={cfg.variant as 'success' | 'warning' | 'error' | 'default'}>{cfg.label}</Badge></td>
                      <td className="py-2 px-2" style={{ color: 'var(--color-text-tertiary)' }}>{r.rmk ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Leave Tab ───────────────────────────────────────────

const leaveStatusConfig: Record<string, { label: string; variant: string }> = {
  PENDING: { label: 'Chờ duyệt', variant: 'warning' },
  APPROVED: { label: 'Đã duyệt', variant: 'success' },
  REJECTED: { label: 'Từ chối', variant: 'error' },
  CANCELLED: { label: 'Đã hủy', variant: 'default' },
};

interface LeaveRecord {
  id: string;
  leaveType: { lvTypeCd: string; lvTypeNm: string };
  startDt: string;
  endDt: string;
  lvDays: number;
  rsn: string;
  aprvlSttsCd: string;
  creatDt: string;
}

interface LeaveBalance {
  lvTypeCd: string;
  lvTypeNm: string;
  maxDays: number | null;
  usedDays: number;
  pendingDays: number;
  remainingDays: number | null;
}

function LeaveTab({ emplId, emplNm }: { emplId: string; emplNm: string }) {
  const { addToast } = useToast();
  const [records, setRecords] = React.useState<LeaveRecord[]>([]);
  const [balances, setBalances] = React.useState<LeaveBalance[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, balRes] = await Promise.all([
        fetch(`/api/leave?emplId=${emplId}&limit=20`, { credentials: 'include' }),
        fetch(`/api/leave/balance?emplId=${emplId}`, { credentials: 'include' }),
      ]);
      if (reqRes.ok) {
        const json = await reqRes.json();
        if (json.success) setRecords(json.data);
      }
      if (balRes.ok) {
        const json = await balRes.json();
        if (json.success) setBalances(json.data.balances ?? []);
      }
    } catch {
      addToast({ variant: 'error', title: 'Lỗi tải dữ liệu nghỉ phép' });
    } finally {
      setLoading(false);
    }
  }, [emplId, addToast]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <Card variant="default">
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-t-transparent" style={{ borderColor: 'var(--color-brand-300)', borderTopColor: 'transparent' }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Balance cards */}
      {balances.length > 0 && (
        <Card variant="default">
          <CardContent>
            <h3 className="mb-3" style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
              Số phép còn lại — {emplNm}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {balances.map((b) => (
                <div key={b.lvTypeCd} className="p-3 rounded-[var(--radius-lg)]" style={{ background: 'var(--color-bg-secondary)' }}>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{b.lvTypeNm}</p>
                  <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-brand-600)', fontFamily: 'var(--font-family-mono)' }}>
                    {b.remainingDays !== null ? b.remainingDays : '∞'}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-quaternary)' }}>
                    Đã dùng: {b.usedDays} / {b.maxDays ?? '∞'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave history */}
      <Card variant="default">
        <CardContent>
          <h3 className="mb-3" style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
            Lịch sử yêu cầu nghỉ phép
          </h3>
          {records.length === 0 ? (
            <p className="text-center py-8" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>Chưa có yêu cầu nghỉ phép</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Loại', 'Từ ngày', 'Đến ngày', 'Số ngày', 'Trạng thái', 'Ngày tạo'].map((h) => (
                      <th key={h} className="text-left py-2 px-2" style={{ color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-medium)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const cfg = leaveStatusConfig[r.aprvlSttsCd] ?? { label: r.aprvlSttsCd, variant: 'default' };
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                        <td className="py-2 px-2">{r.leaveType.lvTypeNm}</td>
                        <td className="py-2 px-2" style={{ fontFamily: 'var(--font-family-mono)' }}>{r.startDt}</td>
                        <td className="py-2 px-2" style={{ fontFamily: 'var(--font-family-mono)' }}>{r.endDt}</td>
                        <td className="py-2 px-2" style={{ fontFamily: 'var(--font-family-mono)' }}>{r.lvDays}</td>
                        <td className="py-2 px-2"><Badge variant={cfg.variant as 'success' | 'warning' | 'error' | 'default'}>{cfg.label}</Badge></td>
                        <td className="py-2 px-2" style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-tertiary)' }}>{r.creatDt.split('T')[0]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user: authUser } = useAuth();
  const { addToast } = useToast();
  const isAdmin = authUser?.role === 'ADMIN';

  const [employee, setEmployee] = React.useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [linkLoading, setLinkLoading] = React.useState(false);
  const [userOptions, setUserOptions] = React.useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState<string>('none');

  const employeeId = params.id as string;

  const fetchEmployee = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setEmployee(json.data);
      } else {
        addToast({ variant: 'error', title: 'Không tìm thấy nhân viên' });
        router.push('/employees');
      }
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi',
        description: 'Không thể tải thông tin nhân viên.',
      });
    } finally {
      setLoading(false);
    }
  }, [employeeId, addToast, router]);

  const fetchUserOptions = React.useCallback(async () => {
    try {
      const res = await fetch('/api/users?limit=100', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setUserOptions(
            json.data.map((u: { id: string; email: string; displayName: string | null }) => ({
              id: u.id,
              email: u.email,
              displayName: u.displayName,
            })),
          );
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  React.useEffect(() => {
    fetchEmployee();
    if (isAdmin) fetchUserOptions();
  }, [fetchEmployee, fetchUserOptions, isAdmin]);

  const handleLinkUser = async () => {
    setLinkLoading(true);
    try {
      const userId = selectedUserId === 'none' ? null : selectedUserId;
      const res = await fetch(`/api/employees/${employeeId}/link-user`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({
          variant: 'error',
          title: 'Thất bại',
          description: json.error || 'Không thể liên kết.',
        });
        return;
      }

      addToast({ variant: 'success', title: json.data.message });
      fetchEmployee();
    } catch {
      addToast({ variant: 'error', title: 'Lỗi kết nối' });
    } finally {
      setLinkLoading(false);
    }
  };

  const handleUnlinkUser = async () => {
    setLinkLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/link-user`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: null }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({ variant: 'error', title: 'Thất bại', description: json.error });
        return;
      }

      addToast({ variant: 'success', title: 'Đã hủy liên kết tài khoản' });
      fetchEmployee();
    } catch {
      addToast({ variant: 'error', title: 'Lỗi kết nối' });
    } finally {
      setLinkLoading(false);
    }
  };

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

  if (!employee) return null;

  const stts = statusConfig[employee.emplSttsCd] ?? {
    label: employee.emplSttsCd,
    variant: 'default' as const,
  };

  // ─── Info row helper ─────────────────────────

  function InfoRow({
    icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
  }) {
    return (
      <div className="flex items-start gap-3 py-3">
        <div className="shrink-0 mt-0.5 text-[var(--color-text-tertiary)]">{icon}</div>
        <div className="flex-1">
          <p
            className="text-[var(--color-text-tertiary)]"
            style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}
          >
            {label}
          </p>
          <div
            className="text-[var(--color-text-primary)] mt-0.5"
            style={{ fontSize: 'var(--font-size-sm)' }}
          >
            {value || <span className="text-[var(--color-text-quaternary)]">—</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      {/* Back button + heading */}
      <div className="animate-fade-up">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/employees')}
          className="mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Quay lại
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
              style={{
                background: 'var(--color-brand-100)',
                color: 'var(--color-brand-700)',
                fontFamily: 'var(--font-family-serif)',
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-bold)',
                fontStyle: 'italic',
              }}
            >
              {employee.emplNm[0]}
            </div>
            <div>
              <h1
                className="text-[var(--color-text-primary)]"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontStyle: 'italic',
                }}
              >
                {employee.emplNm}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[var(--color-text-secondary)]"
                  style={{ fontSize: 'var(--font-size-sm)' }}
                >
                  {employee.emplNo}
                </span>
                <Badge variant={stts.variant} size="sm" dot>
                  {stts.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="animate-fade-up-delay-1">
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin chung</TabsTrigger>
            <TabsTrigger value="account">Tài khoản</TabsTrigger>
            <TabsTrigger value="attendance">Chấm công</TabsTrigger>
            <TabsTrigger value="leave">Nghỉ phép</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card variant="default">
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y md:divide-y-0 divide-[var(--color-border)]">
                  <div>
                    <InfoRow
                      icon={<Mail className="h-4 w-4" />}
                      label="Email"
                      value={employee.email}
                    />
                    <InfoRow
                      icon={<Phone className="h-4 w-4" />}
                      label="Số điện thoại"
                      value={employee.phoneNo}
                    />
                    <InfoRow
                      icon={<Building2 className="h-4 w-4" />}
                      label="Phòng ban"
                      value={employee.department?.deptNm}
                    />
                    <InfoRow
                      icon={<Briefcase className="h-4 w-4" />}
                      label="Chức vụ"
                      value={employee.posiNm}
                    />
                  </div>
                  <div>
                    <InfoRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="Ngày vào làm"
                      value={new Date(employee.joinDt).toLocaleDateString('vi-VN')}
                    />
                    <InfoRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="Ngày nghỉ việc"
                      value={
                        employee.resignDt
                          ? new Date(employee.resignDt).toLocaleDateString('vi-VN')
                          : null
                      }
                    />
                    <InfoRow
                      icon={<User className="h-4 w-4" />}
                      label="Người tạo"
                      value={`${employee.creatBy} — ${new Date(employee.creatDt).toLocaleDateString('vi-VN')}`}
                    />
                    {employee.updtDt && (
                      <InfoRow
                        icon={<User className="h-4 w-4" />}
                        label="Cập nhật lần cuối"
                        value={`${employee.updtBy} — ${new Date(employee.updtDt).toLocaleDateString('vi-VN')}`}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card variant="default">
              <CardContent>
                {employee.user ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)]">
                      <Link2 className="h-5 w-5 text-[var(--color-success-500)]" />
                      <div className="flex-1">
                        <p
                          className="text-[var(--color-text-primary)]"
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-medium)',
                          }}
                        >
                          Đã liên kết với tài khoản
                        </p>
                        <p
                          className="text-[var(--color-text-secondary)]"
                          style={{ fontSize: 'var(--font-size-sm)' }}
                        >
                          {employee.user.email} — Vai trò: {employee.user.roleCd}
                        </p>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={linkLoading}
                          onClick={handleUnlinkUser}
                        >
                          <Unlink className="h-4 w-4 mr-1" />
                          Hủy liên kết
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)]">
                      <Unlink className="h-5 w-5 text-[var(--color-text-tertiary)]" />
                      <p
                        className="text-[var(--color-text-secondary)]"
                        style={{ fontSize: 'var(--font-size-sm)' }}
                      >
                        Chưa liên kết tài khoản đăng nhập
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label
                            className="block mb-1.5 text-[var(--color-text-secondary)]"
                            style={{
                              fontSize: 'var(--font-size-sm)',
                              fontWeight: 'var(--font-weight-medium)',
                            }}
                          >
                            Chọn tài khoản
                          </label>
                          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger className="w-full" aria-label="Chọn tài khoản">
                              <SelectValue placeholder="Chọn tài khoản" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Chọn tài khoản...</SelectItem>
                              {userOptions.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.displayName || u.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={linkLoading}
                          disabled={selectedUserId === 'none'}
                          onClick={handleLinkUser}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Liên kết
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceTab emplId={employee.id} />
          </TabsContent>

          <TabsContent value="leave">
            <LeaveTab emplId={employee.id} emplNm={employee.emplNm} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
