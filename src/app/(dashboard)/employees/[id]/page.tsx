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
      addToast({ variant: 'error', title: 'Lỗi', description: 'Không thể tải thông tin nhân viên.' });
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
        addToast({ variant: 'error', title: 'Thất bại', description: json.error || 'Không thể liên kết.' });
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

  const stts = statusConfig[employee.emplSttsCd] ?? { label: employee.emplSttsCd, variant: 'default' as const };

  // ─── Info row helper ─────────────────────────

  function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
      <div className="flex items-start gap-3 py-3">
        <div className="shrink-0 mt-0.5 text-[var(--color-text-tertiary)]">{icon}</div>
        <div className="flex-1">
          <p className="text-[var(--color-text-tertiary)]" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}>
            {label}
          </p>
          <div className="text-[var(--color-text-primary)] mt-0.5" style={{ fontSize: 'var(--font-size-sm)' }}>
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
        <Button variant="ghost" size="sm" onClick={() => router.push('/employees')} className="mb-3">
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
                <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
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
                    <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={employee.email} />
                    <InfoRow icon={<Phone className="h-4 w-4" />} label="Số điện thoại" value={employee.phoneNo} />
                    <InfoRow icon={<Building2 className="h-4 w-4" />} label="Phòng ban" value={employee.department?.deptNm} />
                    <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Chức vụ" value={employee.posiNm} />
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
                      value={employee.resignDt ? new Date(employee.resignDt).toLocaleDateString('vi-VN') : null}
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
                        <p className="text-[var(--color-text-primary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                          Đã liên kết với tài khoản
                        </p>
                        <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
                          {employee.user.email} — Vai trò: {employee.user.roleCd}
                        </p>
                      </div>
                      {isAdmin && (
                        <Button variant="danger" size="sm" loading={linkLoading} onClick={handleUnlinkUser}>
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
                      <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
                        Chưa liên kết tài khoản đăng nhập
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block mb-1.5 text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
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
            <Card variant="default">
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-10 w-10 text-[var(--color-text-quaternary)] mb-3" />
                  <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Chấm công
                  </p>
                  <p className="text-[var(--color-text-tertiary)] mt-1" style={{ fontSize: 'var(--font-size-sm)' }}>
                    Tính năng sẽ được triển khai ở sprint tiếp theo
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave">
            <Card variant="default">
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="h-10 w-10 text-[var(--color-text-quaternary)] mb-3" />
                  <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Nghỉ phép
                  </p>
                  <p className="text-[var(--color-text-tertiary)] mt-1" style={{ fontSize: 'var(--font-size-sm)' }}>
                    Tính năng sẽ được triển khai ở sprint tiếp theo
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
