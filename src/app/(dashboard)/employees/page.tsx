'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  UserMinus,
  TrendingUp,
} from 'lucide-react';
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

interface EmployeeRecord {
  id: string;
  emplNo: string;
  emplNm: string;
  email: string;
  phoneNo: string | null;
  deptId: string | null;
  deptNm: string | null;
  posiNm: string | null;
  joinDt: string;
  emplSttsCd: string;
  hasUser: boolean;
  creatDt: string;
}

interface DepartmentOption {
  id: string;
  deptNm: string;
  deptCd: string;
}

interface UserOption {
  id: string;
  email: string;
  displayName: string | null;
}

interface EmployeeStats {
  total: number;
  working: number;
  onLeave: number;
  resigned: number;
  newThisMonth: number;
}

interface EmployeeFormData {
  emplNm: string;
  email: string;
  phoneNo: string;
  deptId: string | null;
  posiNm: string;
  joinDt: string;
  emplSttsCd: string;
  userId: string | null;
}

const defaultFormData: EmployeeFormData = {
  emplNm: '',
  email: '',
  phoneNo: '',
  deptId: null,
  posiNm: '',
  joinDt: new Date().toISOString().split('T')[0],
  emplSttsCd: 'WORKING',
  userId: null,
};

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  WORKING: { label: 'Đang làm', variant: 'success' },
  ON_LEAVE: { label: 'Tạm nghỉ', variant: 'warning' },
  RESIGNED: { label: 'Đã nghỉ', variant: 'error' },
};

// ─── Component ────────────────────────────────────────────

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  // List state
  const [employees, setEmployees] = React.useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [deptFilter, setDeptFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Stats
  const [stats, setStats] = React.useState<EmployeeStats | null>(null);

  // Dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<EmployeeFormData>(defaultFormData);
  const [formLoading, setFormLoading] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingEmpl, setDeletingEmpl] = React.useState<EmployeeRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Options
  const [deptOptions, setDeptOptions] = React.useState<DepartmentOption[]>([]);
  const [userOptions, setUserOptions] = React.useState<UserOption[]>([]);

  // ─── Fetch functions ─────────────────────────

  const fetchEmployees = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (search) params.set('search', search);
      if (deptFilter !== 'all') params.set('deptId', deptFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/employees?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setEmployees(json.data);
          if (json.meta) setTotalPages(json.meta.totalPages);
        }
      }
    } catch {
      addToast({ variant: 'error', title: 'Lỗi', description: 'Không thể tải danh sách nhân viên.' });
    } finally {
      setLoading(false);
    }
  }, [page, search, deptFilter, statusFilter, addToast]);

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await fetch('/api/employees/stats', { credentials: 'include' });
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
      const [deptRes, userRes] = await Promise.all([
        fetch('/api/departments?limit=100&useYn=Y', { credentials: 'include' }),
        fetch('/api/users?limit=100', { credentials: 'include' }),
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
      if (userRes.ok) {
        const userJson = await userRes.json();
        if (userJson.success) {
          setUserOptions(
            userJson.data.map((u: { id: string; email: string; displayName: string | null }) => ({
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
    fetchEmployees();
  }, [fetchEmployees]);

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

  const openEditDialog = async (empl: EmployeeRecord) => {
    setEditingId(empl.id);
    setFormData({
      emplNm: empl.emplNm,
      email: empl.email,
      phoneNo: empl.phoneNo ?? '',
      deptId: empl.deptId,
      posiNm: empl.posiNm ?? '',
      joinDt: empl.joinDt,
      emplSttsCd: empl.emplSttsCd,
      userId: null,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    setFormLoading(true);
    try {
      const url = editingId ? `/api/employees/${editingId}` : '/api/employees';
      const method = editingId ? 'PATCH' : 'POST';

      const body: Record<string, unknown> = {
        emplNm: formData.emplNm,
        email: formData.email,
        phoneNo: formData.phoneNo || null,
        deptId: formData.deptId,
        posiNm: formData.posiNm || null,
        joinDt: formData.joinDt,
        emplSttsCd: formData.emplSttsCd,
      };

      if (!editingId && formData.userId) {
        body.userId = formData.userId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({ variant: 'error', title: 'Thất bại', description: json.error || 'Không thể lưu nhân viên.' });
        return;
      }

      addToast({ variant: 'success', title: editingId ? 'Đã cập nhật nhân viên' : 'Đã tạo nhân viên' });
      setFormOpen(false);
      fetchEmployees();
      fetchStats();
    } catch {
      addToast({ variant: 'error', title: 'Lỗi kết nối', description: 'Không thể kết nối đến máy chủ.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEmpl) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/employees/${deletingEmpl.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({ variant: 'error', title: 'Không thể xóa', description: json.error || 'Lỗi khi xóa nhân viên.' });
        return;
      }

      addToast({ variant: 'success', title: 'Đã xóa nhân viên' });
      setDeleteOpen(false);
      setDeletingEmpl(null);
      fetchEmployees();
      fetchStats();
    } catch {
      addToast({ variant: 'error', title: 'Lỗi kết nối' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Table columns ───────────────────────────

  const columns: Column<EmployeeRecord>[] = [
    {
      key: 'emplNo',
      header: 'Mã NV',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
          {row.emplNo}
        </span>
      ),
    },
    {
      key: 'emplNm',
      header: 'Họ tên',
      sortable: true,
      render: (row) => (
        <button
          onClick={() => router.push(`/employees/${row.id}`)}
          className="text-left text-[var(--color-text-brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
          style={{ fontWeight: 'var(--font-weight-medium)' }}
        >
          {row.emplNm}
        </button>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
          {row.email}
        </span>
      ),
    },
    {
      key: 'deptNm',
      header: 'Phòng ban',
      render: (row) => (
        <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
          {row.deptNm || '—'}
        </span>
      ),
    },
    {
      key: 'posiNm',
      header: 'Chức vụ',
      render: (row) => (
        <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
          {row.posiNm || '—'}
        </span>
      ),
    },
    {
      key: 'emplSttsCd',
      header: 'Trạng thái',
      render: (row) => {
        const cfg = statusConfig[row.emplSttsCd] ?? { label: row.emplSttsCd, variant: 'default' as const };
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
            key: 'actions' as keyof EmployeeRecord,
            header: '',
            render: (row: EmployeeRecord) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => router.push(`/employees/${row.id}`)} aria-label="Xem">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(row)} aria-label="Sửa">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setDeletingEmpl(row); setDeleteOpen(true); }}
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
    { label: 'Tổng nhân viên', value: stats?.total ?? 0, icon: <Users className="h-5 w-5" />, color: 'var(--color-brand-500)' },
    { label: 'Đang làm', value: stats?.working ?? 0, icon: <UserCheck className="h-5 w-5" />, color: 'var(--color-success-500)' },
    { label: 'Tạm nghỉ', value: stats?.onLeave ?? 0, icon: <UserMinus className="h-5 w-5" />, color: 'var(--color-warning-500)' },
    { label: 'Đã nghỉ', value: stats?.resigned ?? 0, icon: <UserX className="h-5 w-5" />, color: 'var(--color-error-500)' },
    { label: 'Mới tháng này', value: stats?.newThisMonth ?? 0, icon: <TrendingUp className="h-5 w-5" />, color: 'var(--color-accent-500)' },
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
            <Users className="h-6 w-6" />
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
              Nhân viên
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1" style={{ fontSize: 'var(--font-size-sm)' }}>
              Quản lý hồ sơ và thông tin nhân viên
            </p>
          </div>
        </div>

        {isAdmin && (
          <Button variant="primary" size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm nhân viên
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="animate-fade-up-delay-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card) => (
          <Card key={card.label} variant="default">
            <CardContent className="!py-3 !px-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0" style={{ color: card.color }}>{card.icon}</div>
                <div>
                  <p className="text-[var(--color-text-tertiary)]" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {card.label}
                  </p>
                  <p className="text-[var(--color-text-primary)]" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
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
              <form onSubmit={(e) => { e.preventDefault(); setPage(1); }} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                  <input
                    type="search"
                    placeholder="Tìm kiếm theo tên, mã NV hoặc email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn(
                      'flex h-10 w-full rounded-[var(--radius-lg)] border pl-9 pr-3 py-2',
                      'placeholder:text-[var(--color-text-tertiary)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:border-transparent',
                      'transition-all duration-[var(--transition-fast)]',
                    )}
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-bg-primary)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)',
                    }}
                    aria-label="Tìm kiếm nhân viên"
                  />
                </div>
              </form>

              <div className="flex gap-2">
                <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[170px]" aria-label="Lọc phòng ban">
                    <SelectValue placeholder="Phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả PB</SelectItem>
                    {deptOptions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.deptNm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[150px]" aria-label="Lọc trạng thái">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="WORKING">Đang làm</SelectItem>
                    <SelectItem value="ON_LEAVE">Tạm nghỉ</SelectItem>
                    <SelectItem value="RESIGNED">Đã nghỉ</SelectItem>
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
              <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
                Đang tải dữ liệu...
              </p>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={employees} keyExtractor={(row) => row.id} />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trang trước
          </Button>
          <span
            className="text-[var(--color-text-secondary)] px-2"
            style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
          >
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Trang sau
          </Button>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Cập nhật thông tin nhân viên' : 'Mã nhân viên sẽ được tự động sinh'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Họ tên <span className="text-[var(--color-error-500)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.emplNm}
                    onChange={(e) => setFormData((prev) => ({ ...prev, emplNm: e.target.value }))}
                    placeholder="Nguyễn Văn A"
                    className={cn('flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]')}
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Email <span className="text-[var(--color-error-500)]">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="a.nguyen@company.com"
                    className={cn('flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]')}
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phoneNo: e.target.value }))}
                    placeholder="0901234567"
                    className={cn('flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]')}
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Chức vụ
                  </label>
                  <input
                    type="text"
                    value={formData.posiNm}
                    onChange={(e) => setFormData((prev) => ({ ...prev, posiNm: e.target.value }))}
                    placeholder="Developer"
                    className={cn('flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]')}
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Phòng ban
                  </label>
                  <Select
                    value={formData.deptId ?? 'none'}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, deptId: v === 'none' ? null : v }))}
                  >
                    <SelectTrigger className="w-full" aria-label="Chọn phòng ban">
                      <SelectValue placeholder="Chưa phân bổ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chưa phân bổ</SelectItem>
                      {deptOptions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.deptNm}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Trạng thái
                  </label>
                  <Select value={formData.emplSttsCd} onValueChange={(v) => setFormData((prev) => ({ ...prev, emplSttsCd: v }))}>
                    <SelectTrigger className="w-full" aria-label="Trạng thái">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WORKING">Đang làm</SelectItem>
                      <SelectItem value="ON_LEAVE">Tạm nghỉ</SelectItem>
                      <SelectItem value="RESIGNED">Đã nghỉ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Ngày vào làm <span className="text-[var(--color-error-500)]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.joinDt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, joinDt: e.target.value }))}
                    className={cn('flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]')}
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                      Liên kết tài khoản
                    </label>
                    <Select
                      value={formData.userId ?? 'none'}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, userId: v === 'none' ? null : v }))}
                    >
                      <SelectTrigger className="w-full" aria-label="Liên kết tài khoản">
                        <SelectValue placeholder="Không liên kết" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Không liên kết</SelectItem>
                        {userOptions.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.displayName || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
              Bạn có chắc chắn muốn xóa nhân viên <strong>{deletingEmpl?.emplNm}</strong> ({deletingEmpl?.emplNo})?
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
