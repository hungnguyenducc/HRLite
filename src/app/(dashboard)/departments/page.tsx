'use client';

import * as React from 'react';
import {
  Building2,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  LayoutList,
  Network,
  Users,
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

interface DepartmentRecord {
  id: string;
  deptCd: string;
  deptNm: string;
  upperDeptId: string | null;
  upperDeptNm: string | null;
  deptHeadId: string | null;
  deptHeadNm: string | null;
  sortOrd: number | null;
  useYn: string;
  employeeCount: number;
  creatDt: string;
}

interface TreeNode {
  id: string;
  deptCd: string;
  deptNm: string;
  deptHeadNm: string | null;
  employeeCount: number;
  sortOrd: number | null;
  useYn: string;
  children: TreeNode[];
}

interface EmployeeOption {
  id: string;
  emplNo: string;
  emplNm: string;
}

interface DepartmentFormData {
  deptCd: string;
  deptNm: string;
  upperDeptId: string | null;
  deptHeadId: string | null;
  sortOrd: number | null;
  useYn: string;
}

const defaultFormData: DepartmentFormData = {
  deptCd: '',
  deptNm: '',
  upperDeptId: null,
  deptHeadId: null,
  sortOrd: null,
  useYn: 'Y',
};

// ─── Component ────────────────────────────────────────────

export default function DepartmentsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  // View state
  const [viewMode, setViewMode] = React.useState<'table' | 'tree'>('table');

  // Table state
  const [departments, setDepartments] = React.useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [useYnFilter, setUseYnFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Tree state
  const [tree, setTree] = React.useState<TreeNode[]>([]);
  const [treeLoading, setTreeLoading] = React.useState(false);

  // Dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<DepartmentFormData>(defaultFormData);
  const [formLoading, setFormLoading] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingDept, setDeletingDept] = React.useState<DepartmentRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Options for selects
  const [allDepts, setAllDepts] = React.useState<DepartmentRecord[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);

  // ─── Fetch functions ─────────────────────────

  const fetchDepartments = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (search) params.set('search', search);
      if (useYnFilter !== 'all') params.set('useYn', useYnFilter);

      const res = await fetch(`/api/departments?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDepartments(json.data);
          if (json.meta) setTotalPages(json.meta.totalPages);
        }
      }
    } catch {
      addToast({ variant: 'error', title: 'Lỗi', description: 'Không thể tải danh sách phòng ban.' });
    } finally {
      setLoading(false);
    }
  }, [page, search, useYnFilter, addToast]);

  const fetchTree = React.useCallback(async () => {
    setTreeLoading(true);
    try {
      const res = await fetch('/api/departments/tree', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setTree(json.data);
      }
    } catch {
      addToast({ variant: 'error', title: 'Lỗi', description: 'Không thể tải cây tổ chức.' });
    } finally {
      setTreeLoading(false);
    }
  }, [addToast]);

  const fetchOptions = React.useCallback(async () => {
    try {
      const [deptRes, emplRes] = await Promise.all([
        fetch('/api/departments?limit=100', { credentials: 'include' }),
        fetch('/api/employees?limit=100&status=WORKING', { credentials: 'include' }),
      ]);

      if (deptRes.ok) {
        const deptJson = await deptRes.json();
        if (deptJson.success) setAllDepts(deptJson.data);
      }
      if (emplRes.ok) {
        const emplJson = await emplRes.json();
        if (emplJson.success) {
          setEmployees(
            emplJson.data.map((e: { id: string; emplNo: string; emplNm: string }) => ({
              id: e.id,
              emplNo: e.emplNo,
              emplNm: e.emplNm,
            })),
          );
        }
      }
    } catch {
      // Silently fail options load
    }
  }, []);

  React.useEffect(() => {
    if (viewMode === 'table') {
      fetchDepartments();
    } else {
      fetchTree();
    }
  }, [viewMode, fetchDepartments, fetchTree]);

  // ─── Form handlers ───────────────────────────

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    fetchOptions();
    setFormOpen(true);
  };

  const openEditDialog = (dept: DepartmentRecord) => {
    setEditingId(dept.id);
    setFormData({
      deptCd: dept.deptCd,
      deptNm: dept.deptNm,
      upperDeptId: dept.upperDeptId,
      deptHeadId: dept.deptHeadId,
      sortOrd: dept.sortOrd,
      useYn: dept.useYn,
    });
    fetchOptions();
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    setFormLoading(true);
    try {
      const url = editingId ? `/api/departments/${editingId}` : '/api/departments';
      const method = editingId ? 'PATCH' : 'POST';

      const body = editingId
        ? { deptNm: formData.deptNm, upperDeptId: formData.upperDeptId, deptHeadId: formData.deptHeadId, sortOrd: formData.sortOrd, useYn: formData.useYn }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({ variant: 'error', title: 'Thất bại', description: json.error || 'Không thể lưu phòng ban.' });
        return;
      }

      addToast({ variant: 'success', title: editingId ? 'Đã cập nhật phòng ban' : 'Đã tạo phòng ban' });
      setFormOpen(false);
      fetchDepartments();
      if (viewMode === 'tree') fetchTree();
    } catch {
      addToast({ variant: 'error', title: 'Lỗi kết nối', description: 'Không thể kết nối đến máy chủ.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/departments/${deletingDept.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({ variant: 'error', title: 'Không thể xóa', description: json.error || 'Lỗi khi xóa phòng ban.' });
        return;
      }

      addToast({ variant: 'success', title: 'Đã xóa phòng ban' });
      setDeleteOpen(false);
      setDeletingDept(null);
      fetchDepartments();
      if (viewMode === 'tree') fetchTree();
    } catch {
      addToast({ variant: 'error', title: 'Lỗi kết nối' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Table columns ───────────────────────────

  const columns: Column<DepartmentRecord>[] = [
    {
      key: 'deptCd',
      header: 'Mã PB',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
          {row.deptCd}
        </span>
      ),
    },
    {
      key: 'deptNm',
      header: 'Tên phòng ban',
      sortable: true,
      render: (row) => (
        <span className="text-[var(--color-text-primary)]" style={{ fontWeight: 'var(--font-weight-medium)' }}>
          {row.deptNm}
        </span>
      ),
    },
    {
      key: 'upperDeptNm',
      header: 'Phòng ban cha',
      render: (row) => (
        <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
          {row.upperDeptNm || '—'}
        </span>
      ),
    },
    {
      key: 'deptHeadNm',
      header: 'Trưởng phòng',
      render: (row) => (
        <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
          {row.deptHeadNm || '—'}
        </span>
      ),
    },
    {
      key: 'employeeCount',
      header: 'Số NV',
      render: (row) => (
        <div className="flex items-center gap-1 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
          <Users className="h-3.5 w-3.5" />
          {row.employeeCount}
        </div>
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
    ...(isAdmin
      ? [
          {
            key: 'actions' as keyof DepartmentRecord,
            header: '',
            render: (row: DepartmentRecord) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(row)} aria-label="Sửa">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setDeletingDept(row); setDeleteOpen(true); }}
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

  // ─── Tree Node Component ─────────────────────

  function TreeNodeItem({ node, level = 0 }: { node: TreeNode; level?: number }) {
    const [expanded, setExpanded] = React.useState(level < 2);
    const hasChildren = node.children.length > 0;

    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-2 py-2.5 px-3 rounded-[var(--radius-lg)] cursor-pointer transition-colors',
            'hover:bg-[var(--color-bg-secondary)]',
          )}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          <span className="w-5 flex items-center justify-center">
            {hasChildren ? (
              expanded ? (
                <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              )
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-quaternary)]" />
            )}
          </span>

          <Building2 className="h-4 w-4 text-[var(--color-brand-500)] shrink-0" />

          <span
            className="flex-1 text-[var(--color-text-primary)]"
            style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
          >
            {node.deptNm}
          </span>

          {node.deptHeadNm && (
            <span className="text-[var(--color-text-tertiary)]" style={{ fontSize: 'var(--font-size-xs)' }}>
              {node.deptHeadNm}
            </span>
          )}

          <div className="flex items-center gap-1 text-[var(--color-text-tertiary)]" style={{ fontSize: 'var(--font-size-xs)' }}>
            <Users className="h-3 w-3" />
            {node.employeeCount}
          </div>

          {node.useYn === 'N' && (
            <Badge variant="default" size="sm">Ngừng</Badge>
          )}
        </div>

        {expanded && hasChildren && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

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
            <Building2 className="h-6 w-6" />
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
              Phòng ban
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1" style={{ fontSize: 'var(--font-size-sm)' }}>
              Quản lý cơ cấu tổ chức và phòng ban
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'table'
                  ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
                  : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]',
              )}
              aria-label="Xem dạng bảng"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'tree'
                  ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
                  : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]',
              )}
              aria-label="Xem dạng cây"
            >
              <Network className="h-4 w-4" />
            </button>
          </div>

          {isAdmin && (
            <Button variant="primary" size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm phòng ban
            </Button>
          )}
        </div>
      </div>

      {/* Table view */}
      {viewMode === 'table' && (
        <>
          {/* Filter bar */}
          <div className="animate-fade-up-delay-1">
            <Card variant="default">
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <form onSubmit={(e) => { e.preventDefault(); setPage(1); }} className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                      <input
                        type="search"
                        placeholder="Tìm kiếm theo tên hoặc mã phòng ban..."
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
                        aria-label="Tìm kiếm phòng ban"
                      />
                    </div>
                  </form>
                  <Select value={useYnFilter} onValueChange={(v) => { setUseYnFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[150px]" aria-label="Lọc trạng thái">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="Y">Đang dùng</SelectItem>
                      <SelectItem value="N">Ngừng dùng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data table */}
          <div className="animate-fade-up-delay-2">
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
              <DataTable columns={columns} data={departments} keyExtractor={(row) => row.id} />
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="animate-fade-up-delay-3 flex items-center justify-center gap-3">
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
        </>
      )}

      {/* Tree view */}
      {viewMode === 'tree' && (
        <div className="animate-fade-up-delay-1">
          <Card variant="default">
            <CardContent>
              {treeLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div
                    className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
                    style={{ borderColor: 'var(--color-brand-300)', borderTopColor: 'transparent' }}
                  />
                </div>
              ) : tree.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-tertiary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
                  Chưa có phòng ban nào. Hãy thêm phòng ban đầu tiên.
                </p>
              ) : (
                <div className="flex flex-col">
                  {tree.map((node) => (
                    <TreeNodeItem key={node.id} node={node} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Sửa phòng ban' : 'Thêm phòng ban mới'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Cập nhật thông tin phòng ban' : 'Nhập thông tin để tạo phòng ban mới'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              {/* Mã phòng ban — readonly when editing */}
              <div>
                <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                  Mã phòng ban {!editingId && <span className="text-[var(--color-error-500)]">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.deptCd}
                  onChange={(e) => setFormData((prev) => ({ ...prev, deptCd: e.target.value.toUpperCase() }))}
                  disabled={!!editingId}
                  placeholder="VD: DEPT-HR"
                  className={cn(
                    'flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                    editingId && 'opacity-50 cursor-not-allowed',
                  )}
                  style={{
                    borderColor: 'var(--color-border)',
                    background: editingId ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              {/* Tên phòng ban */}
              <div>
                <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                  Tên phòng ban <span className="text-[var(--color-error-500)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.deptNm}
                  onChange={(e) => setFormData((prev) => ({ ...prev, deptNm: e.target.value }))}
                  placeholder="VD: Phòng Nhân sự"
                  className={cn(
                    'flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                  )}
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
                />
              </div>

              {/* Phòng ban cấp trên */}
              <div>
                <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                  Phòng ban cấp trên
                </label>
                <Select
                  value={formData.upperDeptId ?? 'none'}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, upperDeptId: v === 'none' ? null : v }))}
                >
                  <SelectTrigger className="w-full" aria-label="Chọn phòng ban cấp trên">
                    <SelectValue placeholder="Không có" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không có (cấp cao nhất)</SelectItem>
                    {allDepts
                      .filter((d) => d.id !== editingId)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.deptNm} ({d.deptCd})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trưởng phòng */}
              <div>
                <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                  Trưởng phòng
                </label>
                <Select
                  value={formData.deptHeadId ?? 'none'}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, deptHeadId: v === 'none' ? null : v }))}
                >
                  <SelectTrigger className="w-full" aria-label="Chọn trưởng phòng">
                    <SelectValue placeholder="Chưa chỉ định" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa chỉ định</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.emplNm} ({e.emplNo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Thứ tự */}
                <div>
                  <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Thứ tự sắp xếp
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.sortOrd ?? ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sortOrd: e.target.value ? parseInt(e.target.value, 10) : null }))}
                    placeholder="0"
                    className={cn(
                      'flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                    )}
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>

                {/* Trạng thái */}
                <div>
                  <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Trạng thái
                  </label>
                  <Select value={formData.useYn} onValueChange={(v) => setFormData((prev) => ({ ...prev, useYn: v }))}>
                    <SelectTrigger className="w-full" aria-label="Trạng thái">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Y">Đang dùng</SelectItem>
                      <SelectItem value="N">Ngừng dùng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa phòng ban <strong>{deletingDept?.deptNm}</strong> ({deletingDept?.deptCd})?
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
