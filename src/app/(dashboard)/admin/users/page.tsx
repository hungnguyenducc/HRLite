'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
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
      render: (row) => new Date(row.createdAt).toLocaleDateString('vi-VN'),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[var(--font-size-2xl)] font-[var(--font-weight-bold)] text-[var(--color-text-primary)]">
          Quản lý người dùng
        </h1>
        <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] mt-1">
          Xem và quản lý tài khoản người dùng trong hệ thống
        </p>
      </div>

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
                    'flex h-10 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] pl-9 pr-3 py-2',
                    'text-[var(--font-size-sm)] text-[var(--color-text-primary)]',
                    'placeholder:text-[var(--color-text-tertiary)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:border-transparent',
                  )}
                  aria-label="Tìm kiếm người dùng"
                />
              </div>
            </form>

            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]" aria-label="Lọc theo vai trò">
                  <SelectValue placeholder="Vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả vai trò</SelectItem>
                  <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                  <SelectItem value="USER">Người dùng</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--color-brand-600)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          keyExtractor={(row) => row.id}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trang trước
          </Button>
          <span className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
            Trang {page} / {totalPages}
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Chi tiết người dùng</DialogTitle>
            <DialogDescription>
              Xem và quản lý thông tin tài khoản
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <DialogBody>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[var(--font-size-xs)] text-[var(--color-text-secondary)] mb-1">Tên</p>
                    <p className="text-[var(--font-size-sm)] text-[var(--color-text-primary)] font-[var(--font-weight-medium)]">
                      {selectedUser.displayName || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--font-size-xs)] text-[var(--color-text-secondary)] mb-1">Email</p>
                    <p className="text-[var(--font-size-sm)] text-[var(--color-text-primary)]">
                      {selectedUser.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--font-size-xs)] text-[var(--color-text-secondary)] mb-1">Ngày tạo</p>
                    <p className="text-[var(--font-size-sm)] text-[var(--color-text-primary)]">
                      {new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--font-size-xs)] text-[var(--color-text-secondary)] mb-1">Trạng thái</p>
                    <Badge variant={statusBadgeVariant[selectedUser.status]} size="sm" dot>
                      {statusLabel[selectedUser.status]}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-[var(--font-size-xs)] text-[var(--color-text-secondary)] mb-2">Vai trò</p>
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
