'use client';

import * as React from 'react';
import { z } from 'zod';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardContent,
  Input,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';

const profileSchema = z.object({
  displayName: z.string().optional(),
  phone: z.string().optional(),
  photoUrl: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),
});

type ProfileForm = z.infer<typeof profileSchema>;
type ProfileErrors = Partial<Record<keyof ProfileForm, string>>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
    confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmNewPassword'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;
type PasswordErrors = Partial<Record<keyof PasswordForm, string>>;

interface AgreedTerm {
  id: string;
  termTitle: string;
  termType: string;
  termVersion: string;
  agreedAt: string;
}

function PersonalInfoTab() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = React.useState<ProfileForm>({
    displayName: user?.displayName ?? '',
    phone: user?.phone ?? '',
    photoUrl: user?.photoUrl ?? '',
  });
  const [errors, setErrors] = React.useState<ProfileErrors>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName ?? '',
        phone: user.phone ?? '',
        photoUrl: user.photoUrl ?? '',
      });
    }
  }, [user]);

  const handleChange = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: ProfileErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProfileForm;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName: result.data.displayName || null,
          phone: result.data.phone || null,
          photoUrl: result.data.photoUrl || null,
        }),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: 'Cập nhật thất bại',
          description: data.error || 'Không thể cập nhật thông tin.',
        });
        return;
      }

      addToast({ variant: 'success', title: 'Đã cập nhật thông tin cá nhân' });
      await refreshUser();
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="default">
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
          <Input
            label="Tên hiển thị"
            type="text"
            placeholder="Nguyễn Văn A"
            value={form.displayName ?? ''}
            onChange={handleChange('displayName')}
            error={errors.displayName}
            autoComplete="name"
          />

          <Input
            label="Email"
            type="email"
            value={user?.email ?? ''}
            disabled
            helperText="Email không thể thay đổi"
          />

          <Input
            label="Số điện thoại"
            type="tel"
            placeholder="0912345678"
            value={form.phone ?? ''}
            onChange={handleChange('phone')}
            error={errors.phone}
            autoComplete="tel"
          />

          <Input
            label="URL ảnh đại diện"
            type="url"
            placeholder="https://example.com/photo.jpg"
            value={form.photoUrl ?? ''}
            onChange={handleChange('photoUrl')}
            error={errors.photoUrl}
          />

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={saving}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  const { addToast } = useToast();

  const [form, setForm] = React.useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [errors, setErrors] = React.useState<PasswordErrors>({});
  const [saving, setSaving] = React.useState(false);

  const handleChange = (field: keyof PasswordForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = passwordSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: PasswordErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof PasswordForm;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: result.data.currentPassword,
          newPassword: result.data.newPassword,
        }),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: 'Đổi mật khẩu thất bại',
          description: data.error || 'Mật khẩu hiện tại không chính xác.',
        });
        return;
      }

      addToast({ variant: 'success', title: 'Đã đổi mật khẩu thành công' });
      setForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="default">
      <CardContent>
        <h3 className="text-[var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] mb-4">
          Đổi mật khẩu
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            value={form.currentPassword}
            onChange={handleChange('currentPassword')}
            error={errors.currentPassword}
            autoComplete="current-password"
            required
            aria-required="true"
          />

          <Input
            label="Mật khẩu mới"
            type="password"
            placeholder="Tối thiểu 8 ký tự"
            value={form.newPassword}
            onChange={handleChange('newPassword')}
            error={errors.newPassword}
            autoComplete="new-password"
            required
            aria-required="true"
          />

          <Input
            label="Xác nhận mật khẩu mới"
            type="password"
            value={form.confirmNewPassword}
            onChange={handleChange('confirmNewPassword')}
            error={errors.confirmNewPassword}
            autoComplete="new-password"
            required
            aria-required="true"
          />

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={saving}>
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TermsTab() {
  const [agreedTerms, setAgreedTerms] = React.useState<AgreedTerm[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await fetch('/api/users/me/terms', { credentials: 'include' });
        if (res.ok) {
          const data: { success: boolean; data: AgreedTerm[] } = await res.json();
          if (data.success) {
            setAgreedTerms(data.data);
          }
        }
      } catch {
        // Remain empty
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  if (loading) {
    return (
      <Card variant="default">
        <CardContent>
          <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
            Đang tải...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (agreedTerms.length === 0) {
    return (
      <Card variant="default">
        <CardContent>
          <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] text-center py-8">
            Chưa có điều khoản nào được đồng ý.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {agreedTerms.map((term) => (
        <Card key={term.id} variant="default">
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
                  {term.termTitle}
                </p>
                <p className="text-[var(--font-size-xs)] text-[var(--color-text-secondary)] mt-1">
                  {term.termType} &middot; Phiên bản {term.termVersion}
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge variant="success" size="sm">Đã đồng ý</Badge>
                <p className="text-[var(--font-size-xs)] text-[var(--color-text-tertiary)] mt-1">
                  {new Date(term.agreedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DangerZone() {
  const { addToast } = useToast();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        credentials: 'include',
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: 'Xóa tài khoản thất bại',
          description: data.error || 'Không thể xóa tài khoản.',
        });
        return;
      }

      router.push('/login');
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <h3 className="text-[var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--color-error-500)] mb-2">
          Vùng nguy hiểm
        </h3>
        <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] mb-4">
          Sau khi xóa tài khoản, tất cả dữ liệu sẽ bị mất và không thể khôi phục.
        </p>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="danger" size="sm">
              Xóa tài khoản
            </Button>
          </DialogTrigger>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Xác nhận xóa tài khoản</DialogTitle>
              <DialogDescription>
                Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <p className="text-[var(--font-size-sm)] text-[var(--color-text-primary)]">
                Bạn có chắc chắn muốn xóa tài khoản?
              </p>
            </DialogBody>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                Hủy
              </Button>
              <Button variant="danger" loading={deleting} onClick={handleDelete}>
                Xóa tài khoản
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-[var(--font-size-2xl)] font-[var(--font-weight-bold)] text-[var(--color-text-primary)]">
          Hồ sơ cá nhân
        </h1>
        <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] mt-1">
          Quản lý thông tin tài khoản của bạn
        </p>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Thông tin cá nhân</TabsTrigger>
          <TabsTrigger value="security">Bảo mật</TabsTrigger>
          <TabsTrigger value="terms">Điều khoản</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <PersonalInfoTab />
        </TabsContent>

        <TabsContent value="security">
          <div className="flex flex-col gap-6">
            <SecurityTab />
            <DangerZone />
          </div>
        </TabsContent>

        <TabsContent value="terms">
          <TermsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
