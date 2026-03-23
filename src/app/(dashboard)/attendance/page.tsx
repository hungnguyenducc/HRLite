'use client';

import * as React from 'react';
import { Clock, Users, UserX, AlertTriangle, LogOut, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  DataTable,
  Badge,
  Button,
  Card,
  CardContent,
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
  useToast,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  atndDt: string;
  chkInTm: string | null;
  chkOutTm: string | null;
  workHour: number | null;
  atndSttsCd: string;
  note: string | null;
  employee: {
    id: string;
    emplNo: string;
    emplNm: string;
    deptNm: string | null;
  };
  creatDt: string;
}

interface DepartmentOption {
  id: string;
  deptNm: string;
  deptCd: string;
}

interface EmployeeOption {
  id: string;
  emplNo: string;
  emplNm: string;
}

interface AttendanceStats {
  presentToday: number;
  notCheckedIn: number;
  lateToday: number;
  checkedOut: number;
}

interface AttendanceFormData {
  employeeId: string;
  atndDt: string;
  chkInTm: string;
  chkOutTm: string;
  atndSttsCd: string;
  note: string;
}

const defaultFormData: AttendanceFormData = {
  employeeId: '',
  atndDt: new Date().toISOString().split('T')[0],
  chkInTm: '',
  chkOutTm: '',
  atndSttsCd: 'PRESENT',
  note: '',
};

const statusConfig: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'default' | 'error' | 'info' }
> = {
  PRESENT: { label: 'Có mặt', variant: 'success' },
  LATE: { label: 'Đi trễ', variant: 'warning' },
  HALF_DAY: { label: 'Nửa ngày', variant: 'default' },
  ABSENT: { label: 'Vắng', variant: 'error' },
  HOLIDAY: { label: 'Nghỉ lễ', variant: 'info' },
};

// ─── Component ────────────────────────────────────────────

export default function AttendancePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  // List state
  const [records, setRecords] = React.useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [monthFilter, setMonthFilter] = React.useState<string>(
    new Date().toISOString().slice(0, 7),
  );
  const [deptFilter, setDeptFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Stats
  const [stats, setStats] = React.useState<AttendanceStats | null>(null);

  // Dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<AttendanceFormData>(defaultFormData);
  const [formLoading, setFormLoading] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingRecord, setDeletingRecord] = React.useState<AttendanceRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Options
  const [deptOptions, setDeptOptions] = React.useState<DepartmentOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = React.useState<EmployeeOption[]>([]);

  // ─── Fetch functions ─────────────────────────

  const fetchRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (monthFilter) params.set('month', monthFilter);
      if (deptFilter !== 'all') params.set('deptId', deptFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/attendance?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setRecords(json.data);
          if (json.meta) setTotalPages(json.meta.totalPages);
        }
      }
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi',
        description: 'Không thể tải danh sách chấm công.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, monthFilter, deptFilter, statusFilter, addToast]);

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/stats', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setStats(json.data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchOptions = React.useCallback(async () => {
    try {
      const [deptRes, emplRes] = await Promise.all([
        fetch('/api/departments?limit=100&useYn=Y', { credentials: 'include' }),
        fetch('/api/employees?limit=100&status=WORKING', { credentials: 'include' }),
      ]);

      if (deptRes.ok) {
        const deptJson = await deptRes.json();
        if (deptJson.success) {
          setDeptOptions(
            deptJson.data.map((d: { id: string; deptNm: string; deptCd: string }) => ({
              id: d.id,
              deptNm: d.deptNm,
              deptCd: d.deptCd,
            })),
          );
        }
      }
      if (emplRes.ok) {
        const emplJson = await emplRes.json();
        if (emplJson.success) {
          setEmployeeOptions(
            emplJson.data.map((e: { id: string; emplNo: string; emplNm: string }) => ({
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

  React.useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  React.useEffect(() => {
    fetchStats();
    fetchOptions();
  }, [fetchStats, fetchOptions]);

  // ─── Form handlers ───────────────────────────

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setFormOpen(true);
  };

  const openEditDialog = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setFormData({
      employeeId: record.employee.id,
      atndDt: record.atndDt,
      chkInTm: record.chkInTm ?? '',
      chkOutTm: record.chkOutTm ?? '',
      atndSttsCd: record.atndSttsCd,
      note: record.note ?? '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    setFormLoading(true);
    try {
      const url = editingId ? `/api/attendance/${editingId}` : '/api/attendance';
      const method = editingId ? 'PATCH' : 'POST';

      const body: Record<string, unknown> = {
        employeeId: formData.employeeId,
        atndDt: formData.atndDt,
        chkInTm: formData.chkInTm || null,
        chkOutTm: formData.chkOutTm || null,
        atndSttsCd: formData.atndSttsCd,
        note: formData.note || null,
      };

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
          description: json.error || 'Không thể lưu bản ghi chấm công.',
        });
        return;
      }

      addToast({
        variant: 'success',
        title: editingId ? 'Đã cập nhật chấm công' : 'Đã tạo chấm công',
      });
      setFormOpen(false);
      fetchRecords();
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

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/attendance/${deletingRecord.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({
          variant: 'error',
          title: 'Không thể xóa',
          description: json.error || 'Lỗi khi xóa bản ghi chấm công.',
        });
        return;
      }

      addToast({ variant: 'success', title: 'Đã xóa bản ghi chấm công' });
      setDeleteOpen(false);
      setDeletingRecord(null);
      fetchRecords();
      fetchStats();
    } catch {
      addToast({ variant: 'error', title: 'Lỗi kết nối' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Helper ────────────────────────────────────

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return '\u2014';
    return new Date(isoString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ─── Table columns ───────────────────────────

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'atndDt',
      header: 'Ngày',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
          {row.atndDt}
        </span>
      ),
    },
    {
      key: 'emplId' as keyof AttendanceRecord,
      header: 'Mã NV',
      render: (row) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
          {row.employee.emplNo}
        </span>
      ),
    },
    {
      key: 'rmk' as keyof AttendanceRecord,
      header: 'Họ tên',
      render: (row) => (
        <span
          className="text-[var(--color-text-primary)]"
          style={{ fontWeight: 'var(--font-weight-medium)' }}
        >
          {row.employee.emplNm}
        </span>
      ),
    },
    {
      key: 'employee' as keyof AttendanceRecord,
      header: 'Phòng ban',
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {row.employee.deptNm || '\u2014'}
        </span>
      ),
    },
    {
      key: 'chkInTm',
      header: 'Giờ vào',
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {formatTime(row.chkInTm)}
        </span>
      ),
    },
    {
      key: 'chkOutTm',
      header: 'Giờ ra',
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {formatTime(row.chkOutTm)}
        </span>
      ),
    },
    {
      key: 'workHour',
      header: 'Số giờ',
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {row.workHour != null ? `${row.workHour}h` : '\u2014'}
        </span>
      ),
    },
    {
      key: 'atndSttsCd',
      header: 'Trạng thái',
      render: (row) => {
        const cfg = statusConfig[row.atndSttsCd] ?? {
          label: row.atndSttsCd,
          variant: 'default' as const,
        };
        return (
          <Badge variant={cfg.variant} size="sm" dot>
            {cfg.label}
          </Badge>
        );
      },
    },
    ...(isAdmin
      ? [
          {
            key: 'actions' as keyof AttendanceRecord,
            header: '',
            render: (row: AttendanceRecord) => (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(row)}
                  aria-label="Sửa"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDeletingRecord(row);
                    setDeleteOpen(true);
                  }}
                  aria-label="Xóa"
                >
                  <Trash2 className="h-4 w-4 text-[var(--color-error-600)]" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  // ─── Stat cards ──────────────────────────────

  const statCards = [
    {
      label: 'Có mặt hôm nay',
      value: stats?.presentToday ?? 0,
      icon: <Users className="h-5 w-5" />,
      color: 'var(--color-success-500)',
    },
    {
      label: 'Chưa check-in',
      value: stats?.notCheckedIn ?? 0,
      icon: <UserX className="h-5 w-5" />,
      color: 'var(--color-warning-500)',
    },
    {
      label: 'Đi trễ',
      value: stats?.lateToday ?? 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'var(--color-accent-500)',
    },
    {
      label: 'Đã check-out',
      value: stats?.checkedOut ?? 0,
      icon: <LogOut className="h-5 w-5" />,
      color: 'var(--color-brand-500)',
    },
  ];

  // ─── Render ──────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      {/* Page heading */}
      <div className="animate-fade-up flex items-center justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-xl)]"
            style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-600)' }}
          >
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h1
              className="text-[var(--color-text-primary)]"
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 'var(--font-weight-bold)',
                fontStyle: 'italic',
              }}
            >
              Chấm công
            </h1>
            <p
              className="text-[var(--color-text-secondary)] mt-1"
              style={{ fontSize: 'var(--font-size-sm)' }}
            >
              Quản lý chấm công nhân viên
            </p>
          </div>
        </div>

        {isAdmin && (
          <Button variant="primary" size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Tạo chấm công
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="animate-fade-up-delay-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Card key={card.label} variant="default">
            <CardContent className="!py-3 !px-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0" style={{ color: card.color }}>
                  {card.icon}
                </div>
                <div>
                  <p
                    className="text-[var(--color-text-tertiary)]"
                    style={{ fontSize: 'var(--font-size-xs)' }}
                  >
                    {card.label}
                  </p>
                  <p
                    className="text-[var(--color-text-primary)]"
                    style={{
                      fontSize: 'var(--font-size-xl)',
                      fontWeight: 'var(--font-weight-bold)',
                    }}
                  >
                    {card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="animate-fade-up-delay-2">
        <Card variant="default">
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label
                  className="block mb-1.5 text-[var(--color-text-secondary)]"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  Tháng
                </label>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => {
                    setMonthFilter(e.target.value);
                    setPage(1);
                  }}
                  className={cn(
                    'flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:border-transparent',
                    'transition-all duration-[var(--transition-fast)]',
                  )}
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-primary)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                  aria-label="Chọn tháng"
                />
              </div>

              <div className="flex gap-2">
                <Select
                  value={deptFilter}
                  onValueChange={(v) => {
                    setDeptFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[170px]" aria-label="Lọc phòng ban">
                    <SelectValue placeholder="Phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả PB</SelectItem>
                    {deptOptions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.deptNm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[150px]" aria-label="Lọc trạng thái">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="PRESENT">Có mặt</SelectItem>
                    <SelectItem value="LATE">Đi trễ</SelectItem>
                    <SelectItem value="HALF_DAY">Nửa ngày</SelectItem>
                    <SelectItem value="ABSENT">Vắng</SelectItem>
                    <SelectItem value="HOLIDAY">Nghỉ lễ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data table */}
      <div className="animate-fade-up-delay-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
                style={{ borderColor: 'var(--color-brand-300)', borderTopColor: 'transparent' }}
              />
              <p
                className="text-[var(--color-text-secondary)]"
                style={{ fontSize: 'var(--font-size-sm)' }}
              >
                Đang tải dữ liệu...
              </p>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={records} keyExtractor={(row) => row.id} />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trang trước
          </Button>
          <span
            className="text-[var(--color-text-secondary)] px-2"
            style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
          >
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Sửa chấm công' : 'Tạo chấm công mới'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Cập nhật thông tin chấm công'
                : 'Nhập thông tin để tạo bản ghi chấm công'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Nhan vien */}
                <div>
                  <label
                    className="block mb-1.5 text-[var(--color-text-secondary)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Nhân viên <span className="text-[var(--color-error-500)]">*</span>
                  </label>
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
                </div>

                {/* Ngay */}
                <div>
                  <label
                    className="block mb-1.5 text-[var(--color-text-secondary)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Ngày <span className="text-[var(--color-error-500)]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.atndDt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, atndDt: e.target.value }))}
                    className={cn(
                      'flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                    )}
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-bg-primary)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Gio vao */}
                <div>
                  <label
                    className="block mb-1.5 text-[var(--color-text-secondary)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Giờ vào
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.chkInTm}
                    onChange={(e) => setFormData((prev) => ({ ...prev, chkInTm: e.target.value }))}
                    className={cn(
                      'flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                    )}
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-bg-primary)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                {/* Gio ra */}
                <div>
                  <label
                    className="block mb-1.5 text-[var(--color-text-secondary)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Giờ ra
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.chkOutTm}
                    onChange={(e) => setFormData((prev) => ({ ...prev, chkOutTm: e.target.value }))}
                    className={cn(
                      'flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                    )}
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-bg-primary)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Trang thai */}
                <div>
                  <label
                    className="block mb-1.5 text-[var(--color-text-secondary)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Trạng thái <span className="text-[var(--color-error-500)]">*</span>
                  </label>
                  <Select
                    value={formData.atndSttsCd}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, atndSttsCd: v }))}
                  >
                    <SelectTrigger className="w-full" aria-label="Trạng thái">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESENT">Có mặt</SelectItem>
                      <SelectItem value="LATE">Đi trễ</SelectItem>
                      <SelectItem value="HALF_DAY">Nửa ngày</SelectItem>
                      <SelectItem value="ABSENT">Vắng</SelectItem>
                      <SelectItem value="HOLIDAY">Nghỉ lễ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Ghi chu */}
              <div>
                <label
                  className="block mb-1.5 text-[var(--color-text-secondary)]"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  Ghi chú
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Ghi chú thêm (không bắt buộc)"
                  rows={3}
                  className={cn(
                    'flex w-full rounded-[var(--radius-lg)] border px-3 py-2',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                    'resize-none',
                  )}
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-primary)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" loading={formLoading} onClick={handleSubmit}>
              {editingId ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa bản ghi chấm công của{' '}
              <strong>{deletingRecord?.employee.emplNm}</strong> ngày {deletingRecord?.atndDt}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" size="sm" loading={deleteLoading} onClick={handleDelete}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
