'use client';

import * as React from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle,
  CalendarCheck,
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Ban,
  ChevronLeft,
  ChevronRight,
  TreePalm,
  Sparkles,
  Filter,
} from 'lucide-react';
import {
  DataTable,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToast,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────

interface LeaveRecord {
  id: string;
  employee: {
    id: string;
    emplNo: string;
    emplNm: string;
  };
  leaveType: {
    lvTypeCd: string;
    lvTypeNm: string;
  };
  startDt: string;
  endDt: string;
  lvDays: number;
  rsn: string;
  status: string;
  creatDt: string;
}

interface LeaveTypeRecord {
  lvTypeCd: string;
  lvTypeNm: string;
  maxDays: number | null;
  useYn: string;
  creatDt: string;
}

interface LeaveTypeOption {
  lvTypeCd: string;
  lvTypeNm: string;
}

interface EmployeeOption {
  id: string;
  emplNo: string;
  emplNm: string;
}

interface LeaveStats {
  pending: number;
  approvedThisMonth: number;
  onLeaveToday: number;
  upcoming: number;
}

interface LeaveFormData {
  employeeId: string;
  lvTypeCd: string;
  startDt: string;
  endDt: string;
  rsn: string;
}

interface LeaveTypeFormData {
  lvTypeCd: string;
  lvTypeNm: string;
  maxDays: number | null;
  useYn: string;
}

const defaultLeaveForm: LeaveFormData = {
  employeeId: '',
  lvTypeCd: '',
  startDt: '',
  endDt: '',
  rsn: '',
};

const defaultLeaveTypeForm: LeaveTypeFormData = {
  lvTypeCd: '',
  lvTypeNm: '',
  maxDays: null,
  useYn: 'Y',
};

const leaveStatusConfig: Record<
  string,
  { label: string; variant: 'warning' | 'success' | 'error' | 'default' }
> = {
  PENDING: { label: 'Chờ duyệt', variant: 'warning' },
  APPROVED: { label: 'Đã duyệt', variant: 'success' },
  REJECTED: { label: 'Từ chối', variant: 'error' },
  CANCELLED: { label: 'Đã hủy', variant: 'default' },
};

// ─── Helpers ─────────────────────────────────────────────

function calcLeaveDays(start: string, end: string): number {
  if (!start || !end) return 0;
  let days = 0;
  const cur = new Date(start);
  const endDt = new Date(end);
  while (cur <= endDt) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function formatDateShort(dateStr: string): { day: string; month: string } {
  const d = new Date(dateStr);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('vi-VN', { month: 'short' }),
  };
}

// ─── Sub-components ──────────────────────────────────────

function DateChip({ date }: { date: string }) {
  const { day, month } = formatDateShort(date);
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] min-w-[44px] py-1 px-2"
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--font-size-base)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          lineHeight: 1.2,
        }}
      >
        {day}
      </span>
      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {month}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  gradient,
  iconBg,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  delay: number;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-[var(--radius-2xl)] p-[1px] hover-lift"
      style={{
        background: gradient,
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className="relative h-full rounded-[calc(var(--radius-2xl)-1px)] px-5 py-4"
        style={{ background: 'var(--color-bg-card)' }}
      >
        {/* Decorative corner accent */}
        <div
          className="absolute top-0 right-0 w-20 h-20 opacity-[0.04] rounded-bl-[40px]"
          style={{ background: gradient }}
        />

        <div className="relative flex items-center gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-xl)]"
            style={{ background: iconBg }}
          >
            {icon}
          </div>
          <div className="flex flex-col">
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.2,
                fontStyle: 'italic',
              }}
            >
              {value}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.01em',
        }}
      >
        {label}
        {required && (
          <span className="ml-0.5" style={{ color: 'var(--color-error-500)' }}>
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-2xl)]"
        style={{
          background: 'linear-gradient(135deg, var(--color-brand-50), var(--color-accent-50))',
        }}
      >
        <TreePalm className="h-7 w-7" style={{ color: 'var(--color-brand-400)' }} />
      </div>
      <div className="text-center">
        <p
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-bold)',
            fontStyle: 'italic',
            color: 'var(--color-text-primary)',
          }}
        >
          Chưa có yêu cầu nghỉ phép
        </p>
        <p
          className="mt-1"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}
        >
          Các yêu cầu nghỉ phép sẽ hiển thị tại đây
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

export default function LeavePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  // Read URL search params for initial filter (e.g., ?status=PENDING from notification bell)
  const initialStatus = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('status') || 'all'
    : 'all';

  // Tab state
  const [activeTab, setActiveTab] = React.useState('requests');

  // ═══ Tab 1: Leave Requests ═══

  // List state
  const [leaves, setLeaves] = React.useState<LeaveRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>(initialStatus);
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [yearFilter, setYearFilter] = React.useState<string>(String(new Date().getFullYear()));
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Stats
  const [stats, setStats] = React.useState<LeaveStats | null>(null);

  // Dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<LeaveFormData>(defaultLeaveForm);
  const [formLoading, setFormLoading] = React.useState(false);

  // Options
  const [leaveTypeOptions, setLeaveTypeOptions] = React.useState<LeaveTypeOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = React.useState<EmployeeOption[]>([]);

  // Action loading
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectTargetId, setRejectTargetId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');

  // ═══ Tab 2: Leave Types ═══

  const [leaveTypes, setLeaveTypes] = React.useState<LeaveTypeRecord[]>([]);
  const [ltLoading, setLtLoading] = React.useState(true);
  const [ltFormOpen, setLtFormOpen] = React.useState(false);
  const [ltEditingCd, setLtEditingCd] = React.useState<string | null>(null);
  const [ltFormData, setLtFormData] = React.useState<LeaveTypeFormData>(defaultLeaveTypeForm);
  const [ltFormLoading, setLtFormLoading] = React.useState(false);
  const [ltDeleteOpen, setLtDeleteOpen] = React.useState(false);
  const [ltDeleting, setLtDeleting] = React.useState<LeaveTypeRecord | null>(null);
  const [ltDeleteLoading, setLtDeleteLoading] = React.useState(false);

  // ─── Fetch functions ─────────────────────────

  const fetchLeaves = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('lvTypeCd', typeFilter);
      if (yearFilter) params.set('year', yearFilter);

      const res = await fetch(`/api/leave?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setLeaves(json.data);
          if (json.meta) setTotalPages(json.meta.totalPages);
        }
      }
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi',
        description: 'Không thể tải danh sách nghỉ phép.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, yearFilter, addToast]);

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await fetch('/api/leave/stats', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setStats(json.data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchLeaveTypeOptions = React.useCallback(async () => {
    try {
      const res = await fetch('/api/leave-types?useYn=Y', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setLeaveTypeOptions(
            json.data.map((t: { lvTypeCd: string; lvTypeNm: string }) => ({
              lvTypeCd: t.lvTypeCd,
              lvTypeNm: t.lvTypeNm,
            })),
          );
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchEmployeeOptions = React.useCallback(async () => {
    try {
      const res = await fetch('/api/employees?limit=100&status=WORKING', {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setEmployeeOptions(
            json.data.map((e: { id: string; emplNo: string; emplNm: string }) => ({
              id: e.id,
              emplNo: e.emplNo,
              emplNm: e.emplNm,
            })),
          );
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchLeaveTypes = React.useCallback(async () => {
    setLtLoading(true);
    try {
      const res = await fetch('/api/leave-types', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setLeaveTypes(json.data);
      }
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi',
        description: 'Không thể tải danh sách loại nghỉ phép.',
      });
    } finally {
      setLtLoading(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    if (activeTab === 'requests') {
      fetchLeaves();
    } else if (activeTab === 'types') {
      fetchLeaveTypes();
    }
  }, [activeTab, fetchLeaves, fetchLeaveTypes]);

  React.useEffect(() => {
    fetchStats();
    fetchLeaveTypeOptions();
  }, [fetchStats, fetchLeaveTypeOptions]);

  // ─── Leave request handlers ────────────────────

  const openCreateLeaveDialog = () => {
    setFormData(defaultLeaveForm);
    if (isAdmin) fetchEmployeeOptions();
    setFormOpen(true);
  };

  const handleCreateLeave = async () => {
    if (!formData.lvTypeCd || !formData.startDt || !formData.endDt || !formData.rsn.trim()) {
      addToast({ variant: 'error', title: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }
    if (formData.endDt < formData.startDt) {
      addToast({ variant: 'error', title: 'Ngày kết thúc phải sau ngày bắt đầu' });
      return;
    }
    if (calculatedDays === 0) {
      addToast({ variant: 'error', title: 'Khoảng thời gian không có ngày làm việc' });
      return;
    }
    if (isAdmin && !formData.employeeId) {
      addToast({ variant: 'error', title: 'Vui lòng chọn nhân viên' });
      return;
    }
    setFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        lvTypeCd: formData.lvTypeCd,
        startDt: formData.startDt,
        endDt: formData.endDt,
        rsn: formData.rsn,
      };
      if (isAdmin && formData.employeeId) {
        body.employeeId = formData.employeeId;
      }

      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({
          variant: 'error',
          title: 'Thất bại',
          description: json.error || 'Không thể tạo yêu cầu nghỉ phép.',
        });
        return;
      }

      addToast({
        variant: 'success',
        title: 'Đã tạo yêu cầu nghỉ phép',
      });
      setFormOpen(false);
      fetchLeaves();
      fetchStats();
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleLeaveAction = React.useCallback(
    async (id: string, action: 'approve' | 'reject' | 'cancel', body?: Record<string, unknown>) => {
      setActionLoading(`${id}-${action}`);
      try {
        const res = await fetch(`/api/leave/${id}/${action}`, {
          method: 'PATCH',
          credentials: 'include',
          ...(body && {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          addToast({
            variant: 'error',
            title: 'Thất bại',
            description: json.error || 'Không thể thực hiện thao tác.',
          });
          return;
        }

        const actionLabels = {
          approve: 'Đã duyệt yêu cầu nghỉ phép',
          reject: 'Đã từ chối yêu cầu nghỉ phép',
          cancel: 'Đã hủy yêu cầu nghỉ phép',
        };
        addToast({ variant: 'success', title: actionLabels[action] });
        fetchLeaves();
        fetchStats();
      } catch {
        addToast({ variant: 'error', title: 'Lỗi kết nối' });
      } finally {
        setActionLoading(null);
      }
    },
    [addToast, fetchLeaves, fetchStats],
  );

  const openRejectDialog = React.useCallback((id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  }, []);

  const handleRejectConfirm = React.useCallback(async () => {
    if (!rejectTargetId) return;
    await handleLeaveAction(rejectTargetId, 'reject', rejectReason.trim() ? { reason: rejectReason.trim() } : undefined);
    setRejectDialogOpen(false);
    setRejectTargetId(null);
    setRejectReason('');
  }, [rejectTargetId, rejectReason, handleLeaveAction]);

  // ─── Leave type handlers ───────────────────────

  const openCreateLeaveTypeDialog = () => {
    setLtEditingCd(null);
    setLtFormData(defaultLeaveTypeForm);
    setLtFormOpen(true);
  };

  const openEditLeaveTypeDialog = (lt: LeaveTypeRecord) => {
    setLtEditingCd(lt.lvTypeCd);
    setLtFormData({
      lvTypeCd: lt.lvTypeCd,
      lvTypeNm: lt.lvTypeNm,
      maxDays: lt.maxDays,
      useYn: lt.useYn,
    });
    setLtFormOpen(true);
  };

  const handleLeaveTypeSubmit = async () => {
    setLtFormLoading(true);
    try {
      const url = ltEditingCd ? `/api/leave-types/${ltEditingCd}` : '/api/leave-types';
      const method = ltEditingCd ? 'PATCH' : 'POST';

      const body: Record<string, unknown> = {
        lvTypeNm: ltFormData.lvTypeNm,
        maxDays: ltFormData.maxDays,
      };
      if (!ltEditingCd) {
        body.lvTypeCd = ltFormData.lvTypeCd;
      }
      if (ltEditingCd) {
        body.useYn = ltFormData.useYn;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({
          variant: 'error',
          title: 'Thất bại',
          description: json.error || 'Không thể lưu loại nghỉ phép.',
        });
        return;
      }

      addToast({
        variant: 'success',
        title: ltEditingCd ? 'Đã cập nhật loại nghỉ phép' : 'Đã tạo loại nghỉ phép',
      });
      setLtFormOpen(false);
      fetchLeaveTypes();
      fetchLeaveTypeOptions();
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setLtFormLoading(false);
    }
  };

  const handleLeaveTypeDelete = async () => {
    if (!ltDeleting) return;
    setLtDeleteLoading(true);
    try {
      const res = await fetch(`/api/leave-types/${ltDeleting.lvTypeCd}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({
          variant: 'error',
          title: 'Không thể xóa',
          description: json.error || 'Lỗi khi xóa loại nghỉ phép.',
        });
        return;
      }

      addToast({
        variant: 'success',
        title: 'Đã xóa loại nghỉ phép',
      });
      setLtDeleteOpen(false);
      setLtDeleting(null);
      fetchLeaveTypes();
      fetchLeaveTypeOptions();
    } catch {
      addToast({ variant: 'error', title: 'Lỗi kết nối' });
    } finally {
      setLtDeleteLoading(false);
    }
  };

  // ─── Leave request table columns ───────────────

  const leaveColumns: Column<LeaveRecord>[] = React.useMemo(
    () => [
      {
        key: 'employee' as keyof LeaveRecord,
        header: 'Nhân viên',
        render: (row) => (
          <div className="flex items-center gap-3 py-1">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)]"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-brand-100), var(--color-brand-50))',
                color: 'var(--color-brand-600)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-bold)',
              }}
            >
              {row.employee.emplNm.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span
                style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {row.employee.emplNm}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-family-mono)',
                }}
              >
                {row.employee.emplNo}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'leaveType' as keyof LeaveRecord,
        header: 'Loại nghỉ',
        render: (row) => (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-full)]"
            style={{
              background: 'var(--color-accent-50)',
              color: 'var(--color-accent-700)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              letterSpacing: '0.01em',
            }}
          >
            {row.leaveType.lvTypeNm}
          </span>
        ),
      },
      {
        key: 'startDt',
        header: 'Thời gian',
        render: (row) => (
          <div className="flex items-center gap-2">
            <DateChip date={row.startDt} />
            <div className="w-4 h-[1px]" style={{ background: 'var(--color-border)' }} />
            <DateChip date={row.endDt} />
            <span
              className="ml-1 inline-flex items-center justify-center min-w-[28px] h-6 rounded-[var(--radius-md)] px-1.5"
              style={{
                background: 'var(--color-brand-50)',
                color: 'var(--color-brand-700)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-bold)',
              }}
            >
              {row.lvDays}d
            </span>
          </div>
        ),
      },
      {
        key: 'rsn',
        header: 'Lý do',
        render: (row) => (
          <span
            className="block max-w-[200px] truncate"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
            title={row.rsn}
          >
            {row.rsn || '\u2014'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Trạng thái',
        render: (row) => {
          const cfg = leaveStatusConfig[row.status] ?? {
            label: row.status,
            variant: 'default' as const,
          };
          return (
            <Badge variant={cfg.variant} size="sm" dot>
              {cfg.label}
            </Badge>
          );
        },
      },
      {
        key: 'aprvlDt' as keyof LeaveRecord,
        header: 'Hành động',
        render: (row: LeaveRecord) => {
          if (row.status !== 'PENDING') return null;

          return (
            <div className="flex items-center gap-1">
              {isAdmin && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLeaveAction(row.id, 'approve')}
                    loading={actionLoading === `${row.id}-approve`}
                    aria-label="Duyệt"
                    className="text-[var(--color-success-600)] hover:bg-[var(--color-success-50)] cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    Duyệt
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openRejectDialog(row.id)}
                    loading={actionLoading === `${row.id}-reject`}
                    aria-label="Từ chối"
                    className="text-[var(--color-error-600)] hover:bg-[var(--color-error-50)] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    Từ chối
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLeaveAction(row.id, 'cancel')}
                loading={actionLoading === `${row.id}-cancel`}
                aria-label="Hủy"
                className="text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] cursor-pointer"
              >
                <Ban className="h-3.5 w-3.5" />
                Hủy
              </Button>
            </div>
          );
        },
      },
    ],
    [isAdmin, actionLoading, handleLeaveAction, openRejectDialog],
  );

  // ─── Leave type table columns ──────────────────

  const leaveTypeColumns: Column<LeaveTypeRecord>[] = React.useMemo(
    () => [
      {
        key: 'lvTypeCd',
        header: 'Mã',
        sortable: true,
        render: (row) => (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-md)]"
            style={{
              background: 'var(--color-bg-secondary)',
              fontFamily: 'var(--font-family-mono)',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-primary)',
              letterSpacing: '0.03em',
            }}
          >
            {row.lvTypeCd}
          </span>
        ),
      },
      {
        key: 'lvTypeNm',
        header: 'Tên loại',
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-primary)',
            }}
          >
            {row.lvTypeNm}
          </span>
        ),
      },
      {
        key: 'maxDays',
        header: 'Số ngày tối đa',
        render: (row) => (
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              color:
                row.maxDays !== null ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              fontWeight:
                row.maxDays !== null ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
            }}
          >
            {row.maxDays !== null ? `${row.maxDays} ngày` : 'Không giới hạn'}
          </span>
        ),
      },
      {
        key: 'useYn',
        header: 'Trạng thái',
        render: (row) => (
          <Badge variant={row.useYn === 'Y' ? 'success' : 'default'} size="sm" dot>
            {row.useYn === 'Y' ? 'Đang dùng' : 'Ngừng dùng'}
          </Badge>
        ),
      },
      {
        key: 'creatDt' as keyof LeaveTypeRecord,
        header: '',
        render: (row: LeaveTypeRecord) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditLeaveTypeDialog(row)}
              aria-label="Sửa"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setLtDeleting(row);
                setLtDeleteOpen(true);
              }}
              aria-label="Xóa"
            >
              <Trash2 className="h-4 w-4" style={{ color: 'var(--color-error-500)' }} />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  // ─── Stat cards config ─────────────────────────

  const statCards = [
    {
      label: 'Chờ duyệt',
      value: stats?.pending ?? 0,
      icon: <Clock className="h-5 w-5" style={{ color: 'var(--color-warning-500)' }} />,
      gradient: 'linear-gradient(135deg, var(--color-warning-500), var(--color-accent-400))',
      iconBg: 'var(--color-warning-50)',
      delay: 0,
    },
    {
      label: 'Đã duyệt tháng này',
      value: stats?.approvedThisMonth ?? 0,
      icon: <CheckCircle className="h-5 w-5" style={{ color: 'var(--color-success-500)' }} />,
      gradient: 'linear-gradient(135deg, var(--color-success-500), var(--color-success-50))',
      iconBg: 'var(--color-success-50)',
      delay: 60,
    },
    {
      label: 'Nghỉ hôm nay',
      value: stats?.onLeaveToday ?? 0,
      icon: <CalendarCheck className="h-5 w-5" style={{ color: 'var(--color-brand-500)' }} />,
      gradient: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-400))',
      iconBg: 'var(--color-brand-50)',
      delay: 120,
    },
    {
      label: 'Sắp nghỉ',
      value: stats?.upcoming ?? 0,
      icon: <CalendarClock className="h-5 w-5" style={{ color: 'var(--color-accent-600)' }} />,
      gradient: 'linear-gradient(135deg, var(--color-accent-500), var(--color-accent-300))',
      iconBg: 'var(--color-accent-50)',
      delay: 180,
    },
  ];

  // ─── Computed values ───────────────────────────

  const calculatedDays = calcLeaveDays(formData.startDt, formData.endDt);

  const currentYear = new Date().getFullYear();
  const yearOptions = [String(currentYear), String(currentYear - 1)];

  // ─── Input class helper ────────────────────────

  const inputClasses = cn(
    'flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
    'transition-all duration-[var(--transition-fast)]',
  );

  const inputStyle: React.CSSProperties = {
    borderColor: 'var(--color-border)',
    background: 'var(--color-bg-card)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-primary)',
  };

  // ─── Render ──────────────────────────────────

  return (
    <div className="flex flex-col gap-8 max-w-[1200px]">
      {/* ══════════════════════════════════════════════
          Page Header — Editorial style
          ══════════════════════════════════════════════ */}
      <div className="animate-fade-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Icon with gradient border */}
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-2xl)]"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-100), var(--color-accent-100))',
            }}
          >
            <CalendarDays className="h-7 w-7" style={{ color: 'var(--color-brand-600)' }} />
            <Sparkles
              className="absolute -top-1 -right-1 h-4 w-4"
              style={{ color: 'var(--color-accent-400)' }}
            />
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 'var(--font-weight-bold)',
                fontStyle: 'italic',
                color: 'var(--color-text-primary)',
                lineHeight: 'var(--line-height-tight)',
                letterSpacing: '-0.02em',
              }}
            >
              Nghỉ phép
            </h1>
            <p
              className="mt-1"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              Quản lý yêu cầu nghỉ phép và theo dõi số liệu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'requests' && (
            <Button variant="primary" size="sm" onClick={openCreateLeaveDialog}>
              <Plus className="h-4 w-4 mr-1.5" />
              Tạo yêu cầu
            </Button>
          )}
          {activeTab === 'types' && isAdmin && (
            <Button variant="primary" size="sm" onClick={openCreateLeaveTypeDialog}>
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm loại nghỉ
            </Button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          Tabs
          ══════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Yêu cầu nghỉ phép</TabsTrigger>
          {isAdmin && <TabsTrigger value="types">Loại nghỉ phép</TabsTrigger>}
        </TabsList>

        {/* ═══ Tab 1: Leave Requests ═══ */}
        <TabsContent value="requests">
          <div className="flex flex-col gap-6">
            {/* ── Stat Cards ── */}
            <div className="animate-fade-up-delay-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </div>

            {/* ── Filter Bar ── */}
            <div className="animate-fade-up-delay-2">
              <div
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[var(--radius-xl)] px-4 py-3"
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="flex items-center gap-1.5 mr-1"
                    style={{
                      color: 'var(--color-text-tertiary)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span>Lọc</span>
                  </div>

                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-8" aria-label="Lọc trạng thái">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                      <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                      <SelectItem value="REJECTED">Từ chối</SelectItem>
                      <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={typeFilter}
                    onValueChange={(v) => {
                      setTypeFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[160px] h-8" aria-label="Lọc loại nghỉ">
                      <SelectValue placeholder="Loại nghỉ phép" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả loại</SelectItem>
                      {leaveTypeOptions.map((t) => (
                        <SelectItem key={t.lvTypeCd} value={t.lvTypeCd}>
                          {t.lvTypeNm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={yearFilter}
                    onValueChange={(v) => {
                      setYearFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px] h-8" aria-label="Lọc năm">
                      <SelectValue placeholder="Năm" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Data Table ── */}
            <div className="animate-fade-up-delay-3">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
                      style={{
                        borderColor: 'var(--color-brand-200)',
                        borderTopColor: 'transparent',
                      }}
                    />
                    <p
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      Đang tải dữ liệu...
                    </p>
                  </div>
                </div>
              ) : leaves.length === 0 ? (
                <EmptyState />
              ) : (
                <DataTable columns={leaveColumns} data={leaves} keyExtractor={(row) => row.id} />
              )}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="animate-fade-up-delay-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div
                  className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-lg)]"
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {page}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    / {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ Tab 2: Leave Types ═══ */}
        {isAdmin && (
          <TabsContent value="types">
            <div className="flex flex-col gap-6">
              <div className="animate-fade-up-delay-1">
                {ltLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
                        style={{
                          borderColor: 'var(--color-brand-200)',
                          borderTopColor: 'transparent',
                        }}
                      />
                      <p
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-tertiary)',
                        }}
                      >
                        Đang tải dữ liệu...
                      </p>
                    </div>
                  </div>
                ) : (
                  <DataTable
                    columns={leaveTypeColumns}
                    data={leaveTypes}
                    keyExtractor={(row) => row.lvTypeCd}
                  />
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* ══════════════════════════════════════════════
          Create Leave Request Dialog
          ══════════════════════════════════════════════ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)]"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-brand-100), var(--color-brand-50))',
                    color: 'var(--color-brand-600)',
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                </div>
                Tạo yêu cầu nghỉ phép
              </span>
            </DialogTitle>
            <DialogDescription>Điền thông tin để tạo yêu cầu nghỉ phép mới</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-5">
              {/* Employee select (ADMIN only) */}
              {isAdmin && (
                <FormField label="Nhân viên" required>
                  <Select
                    value={formData.employeeId || 'none'}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, employeeId: v === 'none' ? '' : v }))
                    }
                  >
                    <SelectTrigger className="w-full" aria-label="Chọn nhân viên">
                      <SelectValue placeholder="Chọn nhân viên" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chọn nhân viên</SelectItem>
                      {employeeOptions.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.emplNm} ({e.emplNo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}

              {/* Leave type */}
              <FormField label="Loại nghỉ" required>
                <Select
                  value={formData.lvTypeCd || 'none'}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, lvTypeCd: v === 'none' ? '' : v }))
                  }
                >
                  <SelectTrigger className="w-full" aria-label="Chọn loại nghỉ">
                    <SelectValue placeholder="Chọn loại nghỉ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chọn loại nghỉ</SelectItem>
                    {leaveTypeOptions.map((t) => (
                      <SelectItem key={t.lvTypeCd} value={t.lvTypeCd}>
                        {t.lvTypeNm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Ngày bắt đầu" required>
                  <input
                    type="date"
                    value={formData.startDt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDt: e.target.value }))}
                    className={inputClasses}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Ngày kết thúc" required>
                  <input
                    type="date"
                    value={formData.endDt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDt: e.target.value }))}
                    className={inputClasses}
                    style={inputStyle}
                  />
                </FormField>
              </div>

              {/* Calculated days display */}
              {formData.startDt && formData.endDt && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)]"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-brand-50), var(--color-accent-50))',
                    border: '1px solid var(--color-brand-100)',
                  }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)]"
                    style={{
                      background: 'var(--color-bg-card)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <CalendarDays className="h-4 w-4" style={{ color: 'var(--color-brand-600)' }} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 'var(--font-weight-medium)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Số ngày nghỉ (không tính cuối tuần)
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-brand-700)',
                        fontFamily: 'var(--font-family-serif)',
                        fontStyle: 'italic',
                      }}
                    >
                      {calculatedDays} ngày
                    </p>
                  </div>
                </div>
              )}

              {/* Reason */}
              <FormField label="Lý do" required>
                <textarea
                  value={formData.rsn}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rsn: e.target.value }))}
                  placeholder="Nhập lý do nghỉ phép..."
                  rows={3}
                  className={cn(
                    'flex w-full rounded-[var(--radius-lg)] border px-3 py-2.5 resize-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                    'transition-all duration-[var(--transition-fast)]',
                  )}
                  style={inputStyle}
                />
              </FormField>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" loading={formLoading} onClick={handleCreateLeave}>
              Tạo mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Create/Edit Leave Type Dialog
          ══════════════════════════════════════════════ */}
      <Dialog open={ltFormOpen} onOpenChange={setLtFormOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)]"
                  style={{
                    background: ltEditingCd
                      ? 'linear-gradient(135deg, var(--color-accent-100), var(--color-accent-50))'
                      : 'linear-gradient(135deg, var(--color-success-50), var(--color-brand-50))',
                    color: ltEditingCd ? 'var(--color-accent-600)' : 'var(--color-success-500)',
                  }}
                >
                  {ltEditingCd ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
                {ltEditingCd ? 'Sửa loại nghỉ phép' : 'Thêm loại nghỉ phép mới'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {ltEditingCd
                ? 'Cập nhật thông tin loại nghỉ phép'
                : 'Nhập thông tin để tạo loại nghỉ phép mới'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-5">
              {/* Code */}
              <FormField label="Mã loại" required={!ltEditingCd}>
                <input
                  type="text"
                  value={ltFormData.lvTypeCd}
                  onChange={(e) =>
                    setLtFormData((prev) => ({ ...prev, lvTypeCd: e.target.value.toUpperCase() }))
                  }
                  disabled={!!ltEditingCd}
                  placeholder="VD: ANNUAL"
                  className={cn(inputClasses, ltEditingCd && 'opacity-50 cursor-not-allowed')}
                  style={{
                    ...inputStyle,
                    fontFamily: 'var(--font-family-mono)',
                    letterSpacing: '0.05em',
                    background: ltEditingCd ? 'var(--color-bg-secondary)' : 'var(--color-bg-card)',
                  }}
                />
              </FormField>

              {/* Name */}
              <FormField label="Tên loại" required>
                <input
                  type="text"
                  value={ltFormData.lvTypeNm}
                  onChange={(e) => setLtFormData((prev) => ({ ...prev, lvTypeNm: e.target.value }))}
                  placeholder="VD: Nghỉ phép năm"
                  className={inputClasses}
                  style={inputStyle}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                {/* Max days */}
                <FormField label="Số ngày tối đa">
                  <input
                    type="number"
                    min={0}
                    value={ltFormData.maxDays ?? ''}
                    onChange={(e) =>
                      setLtFormData((prev) => ({
                        ...prev,
                        maxDays: e.target.value ? parseInt(e.target.value, 10) : null,
                      }))
                    }
                    placeholder="Không giới hạn"
                    className={inputClasses}
                    style={inputStyle}
                  />
                </FormField>

                {/* Status (only when editing) */}
                {ltEditingCd && (
                  <FormField label="Trạng thái">
                    <Select
                      value={ltFormData.useYn}
                      onValueChange={(v) => setLtFormData((prev) => ({ ...prev, useYn: v }))}
                    >
                      <SelectTrigger className="w-full" aria-label="Trạng thái">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Y">Đang dùng</SelectItem>
                        <SelectItem value="N">Ngừng dùng</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setLtFormOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={ltFormLoading}
              onClick={handleLeaveTypeSubmit}
            >
              {ltEditingCd ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Delete Leave Type Confirmation
          ══════════════════════════════════════════════ */}
      <Dialog open={ltDeleteOpen} onOpenChange={setLtDeleteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)]"
                  style={{
                    background: 'var(--color-error-50)',
                    color: 'var(--color-error-500)',
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </div>
                Xác nhận xóa
              </span>
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa loại nghỉ phép <strong>{ltDeleting?.lvTypeNm}</strong> (
              {ltDeleting?.lvTypeCd})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setLtDeleteOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={ltDeleteLoading}
              onClick={handleLeaveTypeDelete}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reject Reason Dialog ──────────────────── */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)]"
                  style={{
                    background: 'var(--color-error-50)',
                    color: 'var(--color-error-500)',
                  }}
                >
                  <X className="h-4 w-4" />
                </div>
                Từ chối yêu cầu nghỉ phép
              </span>
            </DialogTitle>
            <DialogDescription>
              Nhập lý do từ chối (không bắt buộc). Lý do sẽ được gửi qua email thông báo cho nhân viên.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              maxLength={500}
              rows={3}
              className={cn(
                'w-full rounded-[var(--radius-lg)] border px-3 py-2 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]',
              )}
              style={{
                borderColor: 'var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--color-bg-secondary)',
              }}
            />
            <p
              className="text-right mt-1"
              style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}
            >
              {rejectReason.length}/500
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading?.endsWith('-reject') ?? false}
              onClick={handleRejectConfirm}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
