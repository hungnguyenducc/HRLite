'use client';

import * as React from 'react';
import { Search, Users as UsersIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface UserRecord {
  id: string;
  displayName: string | null;
  email: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

interface UsersResponse {
  success: boolean;
  data: UserRecord[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const roleBadgeVariant: Record<string, 'brand' | 'default'> = {
  ADMIN: 'brand',
  USER: 'default',
};

const roleLabel: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  USER: 'Người dùng',
};

const statusBadgeVariant: Record<string, 'success' | 'error'> = {
  ACTIVE: 'success',
  SUSPENDED: 'error',
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  SUSPENDED: 'Bị tạm khóa',
};

export default function AdminUsersPage() {
  const { addToast } = useToast();

  const [users, setUsers] = React.useState<UserRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [selectedUser, setSelectedUser] = React.useState<UserRecord | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data: UsersResponse = await res.json();
        if (data.success) {
          setUsers(data.data);
          if (data.meta) {
            setTotalPages(data.meta.totalPages);
          }
        }
      }
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi',
        description: 'Không thể tải danh sách người dùng.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter, addToast]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: 'Cập nhật thất bại',
          description: data.error || 'Không thể thay đổi vai trò.',
        });
        return;
      }

      addToast({ variant: 'success', title: 'Đã cập nhật vai trò' });
      await fetchUsers();

      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, role: newRole as UserRecord['role'] } : null));
      }
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: 'Cập nhật thất bại',
          description: data.error || 'Không thể thay đổi trạng thái.',
        });
        return;
      }

      addToast({
        variant: 'success',
        title: newStatus === 'ACTIVE' ? 'Đã kích hoạt tài khoản' : 'Đã tạm khóa tài khoản',
      });
      await fetchUsers();

      if (selectedUser?.id === userId) {
        setSelectedUser((prev) =>
          prev ? { ...prev, status: newStatus as UserRecord['status'] } : null,
        );
      }
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<UserRecord>[] = [
    {
      key: 'displayName',
      header: 'Tên',
      sortable: true,
      render: (row) => (
        <button
          onClick={() => {
            setSelectedUser(row);
            setDetailOpen(true);
          }}
          className="text-left text-[var(--color-text-brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
          style={{ fontWeight: 'var(--font-weight-medium)' }}
        >
          {row.displayName || row.email.split('@')[0]}
        </button>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      header: 'Vai trò',
      render: (row) => (
        <Badge variant={roleBadgeVariant[row.role]} size="sm">
          {roleLabel[row.role]}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <Badge variant={statusBadgeVariant[row.status]} size="sm" dot>
          {statusLabel[row.status]}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {new Date(row.createdAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      {/* Page heading */}
      <div className="animate-fade-up flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-xl)]"
          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-600)' }}
        >
          <UsersIcon className="h-6 w-6" />
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
            Quản lý người dùng
          </h1>
          <p
            className="text-[var(--color-text-secondary)] mt-1"
            style={{ fontSize: 'var(--font-size-sm)' }}
          >
            Xem và quản lý tài khoản người dùng trong hệ thống
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="animate-fade-up-delay-1">
        <Card variant="default">
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <form onSubmit={handleSearchSubmit} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                  <input
                    type="search"
                    placeholder="Tìm kiếm theo tên hoặc email..."
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
                    aria-label="Tìm kiếm người dùng"
                  />
                </div>
              </form>

              <div className="flex gap-2">
                <Select
                  value={roleFilter}
                  onValueChange={(v) => {
                    setRoleFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[150px]" aria-label="Lọc theo vai trò">
                    <SelectValue placeholder="Vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả vai trò</SelectItem>
                    <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                    <SelectItem value="USER">Người dùng</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[150px]" aria-label="Lọc theo trạng thái">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                    <SelectItem value="SUSPENDED">Tạm khóa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <p
                className="text-[var(--color-text-secondary)]"
                style={{ fontSize: 'var(--font-size-sm)' }}
              >
                Đang tải dữ liệu...
              </p>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={users} keyExtractor={(row) => row.id} />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="animate-fade-up-delay-3 flex items-center justify-center gap-3">
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

      {/* User detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Chi tiết người dùng</DialogTitle>
            <DialogDescription>Xem và quản lý thông tin tài khoản</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <DialogBody>
              <div className="flex flex-col gap-5">
                {/* User avatar header in dialog */}
                <div
                  className="flex items-center gap-4 pb-4 border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: 'var(--color-brand-100)',
                      color: 'var(--color-brand-700)',
                      fontFamily: 'var(--font-family-serif)',
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontStyle: 'italic',
                    }}
                  >
                    {selectedUser.displayName?.[0]?.toUpperCase() ||
                      selectedUser.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p
                      className="text-[var(--color-text-primary)]"
                      style={{
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 'var(--font-weight-semibold)',
                      }}
                    >
                      {selectedUser.displayName || selectedUser.email.split('@')[0]}
                    </p>
                    <p
                      className="text-[var(--color-text-secondary)]"
                      style={{ fontSize: 'var(--font-size-sm)' }}
                    >
                      {selectedUser.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p
                      className="text-[var(--color-text-tertiary)] mb-1"
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      Ngày tạo
                    </p>
                    <p
                      className="text-[var(--color-text-primary)]"
                      style={{ fontSize: 'var(--font-size-sm)' }}
                    >
                      {new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-[var(--color-text-tertiary)] mb-1"
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      Trạng thái
                    </p>
                    <Badge variant={statusBadgeVariant[selectedUser.status]} size="sm" dot>
                      {statusLabel[selectedUser.status]}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p
                    className="text-[var(--color-text-tertiary)] mb-2"
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Vai trò
                  </p>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(v) => handleRoleChange(selectedUser.id, v)}
                    disabled={actionLoading}
                  >
                    <SelectTrigger className="w-[200px]" aria-label="Thay đổi vai trò">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                      <SelectItem value="USER">Người dùng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            {selectedUser && (
              <Button
                variant={selectedUser.status === 'ACTIVE' ? 'danger' : 'primary'}
                size="sm"
                loading={actionLoading}
                onClick={() => handleToggleStatus(selectedUser.id, selectedUser.status)}
              >
                {selectedUser.status === 'ACTIVE' ? 'Tạm khóa tài khoản' : 'Kích hoạt tài khoản'}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setDetailOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
