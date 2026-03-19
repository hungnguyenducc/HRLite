'use client';

import * as React from 'react';
import { Plus, FileText } from 'lucide-react';
import {
  DataTable,
  Badge,
  Button,
  Input,
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

interface TermRecord {
  id: string;
  type: string;
  version: string;
  title: string;
  content: string;
  required: boolean;
  active: boolean;
  effectiveDate: string;
}

interface TermsResponse {
  success: boolean;
  data: TermRecord[];
}

interface TermFormData {
  type: string;
  version: string;
  title: string;
  content: string;
  required: boolean;
  active: boolean;
  effectiveDate: string;
}

const emptyForm: TermFormData = {
  type: 'TERMS_OF_SERVICE',
  version: '',
  title: '',
  content: '',
  required: true,
  active: true,
  effectiveDate: '',
};

export default function AdminTermsPage() {
  const { addToast } = useToast();

  const [terms, setTerms] = React.useState<TermRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTerm, setEditingTerm] = React.useState<TermRecord | null>(null);
  const [form, setForm] = React.useState<TermFormData>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const fetchTerms = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/terms', { credentials: 'include' });
      if (res.ok) {
        const data: TermsResponse = await res.json();
        if (data.success) {
          setTerms(data.data);
        }
      }
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi',
        description: 'Không thể tải danh sách điều khoản.',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const openCreateDialog = () => {
    setEditingTerm(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (term: TermRecord) => {
    setEditingTerm(term);
    setForm({
      type: term.type,
      version: term.version,
      title: term.title,
      content: term.content,
      required: term.required,
      active: term.active,
      effectiveDate: term.effectiveDate ? term.effectiveDate.split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.version) {
      addToast({
        variant: 'warning',
        title: 'Thiếu thông tin',
        description: 'Vui lòng điền đầy đủ tiêu đề và phiên bản.',
      });
      return;
    }

    setSaving(true);
    try {
      const isEdit = editingTerm !== null;
      const url = isEdit ? `/api/terms/${editingTerm.id}` : '/api/terms';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        addToast({
          variant: 'error',
          title: isEdit ? 'Cập nhật thất bại' : 'Tạo mới thất bại',
          description: data.error || 'Đã xảy ra lỗi. Vui lòng thử lại.',
        });
        return;
      }

      addToast({
        variant: 'success',
        title: isEdit ? 'Đã cập nhật điều khoản' : 'Đã tạo điều khoản mới',
      });
      setDialogOpen(false);
      await fetchTerms();
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

  const handleToggleActive = async (term: TermRecord) => {
    try {
      const res = await fetch(`/api/terms/${term.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: !term.active }),
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
        title: term.active ? 'Đã vô hiệu hóa điều khoản' : 'Đã kích hoạt điều khoản',
      });
      await fetchTerms();
    } catch {
      addToast({
        variant: 'error',
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ.',
      });
    }
  };

  const typeLabel: Record<string, string> = {
    TERMS_OF_SERVICE: 'Điều khoản dịch vụ',
    PRIVACY_POLICY: 'Chính sách quyền riêng tư',
    OTHER: 'Khác',
  };

  const columns: Column<TermRecord>[] = [
    {
      key: 'type',
      header: 'Loại',
      render: (row) => (
        <span style={{ fontSize: 'var(--font-size-sm)' }}>
          {typeLabel[row.type] || row.type}
        </span>
      ),
    },
    {
      key: 'version',
      header: 'Phiên bản',
      sortable: true,
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family-mono)' }}
        >
          v{row.version}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Tiêu đề',
      sortable: true,
      render: (row) => (
        <button
          onClick={() => openEditDialog(row)}
          className="text-left text-[var(--color-text-brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
          style={{ fontWeight: 'var(--font-weight-medium)' }}
        >
          {row.title}
        </button>
      ),
    },
    {
      key: 'required',
      header: 'Bắt buộc',
      render: (row) => (
        <Badge variant={row.required ? 'error' : 'default'} size="sm">
          {row.required ? 'Bắt buộc' : 'Tùy chọn'}
        </Badge>
      ),
    },
    {
      key: 'active',
      header: 'Trạng thái',
      render: (row) => (
        <button
          onClick={() => handleToggleActive(row)}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)] transition-opacity hover:opacity-80"
          aria-label={row.active ? 'Vô hiệu hóa điều khoản' : 'Kích hoạt điều khoản'}
        >
          <Badge variant={row.active ? 'success' : 'default'} size="sm" dot>
            {row.active ? 'Đang hoạt động' : 'Vô hiệu'}
          </Badge>
        </button>
      ),
    },
    {
      key: 'effectiveDate',
      header: 'Ngày hiệu lực',
      sortable: true,
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {row.effectiveDate
            ? new Date(row.effectiveDate).toLocaleDateString('vi-VN')
            : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      {/* Page heading */}
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-xl)]"
            style={{ background: 'var(--color-accent-50)', color: 'var(--color-accent-600)' }}
          >
            <FileText className="h-6 w-6" />
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
              Quản lý điều khoản
            </h1>
            <p
              className="text-[var(--color-text-secondary)] mt-1"
              style={{ fontSize: 'var(--font-size-sm)' }}
            >
              Quản lý các điều khoản sử dụng và chính sách
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Thêm điều khoản
        </Button>
      </div>

      {/* Data table */}
      <div className="animate-fade-up-delay-1">
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
          <DataTable
            columns={columns}
            data={terms}
            keyExtractor={(row) => row.id}
          />
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {editingTerm ? 'Chỉnh sửa điều khoản' : 'Thêm điều khoản mới'}
            </DialogTitle>
            <DialogDescription>
              {editingTerm
                ? 'Cập nhật thông tin điều khoản'
                : 'Tạo điều khoản sử dụng hoặc chính sách mới'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[var(--color-text-primary)]"
                    style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
                  >
                    Loại
                  </label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger aria-label="Loại điều khoản">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TERMS_OF_SERVICE">Điều khoản dịch vụ</SelectItem>
                      <SelectItem value="PRIVACY_POLICY">Chính sách quyền riêng tư</SelectItem>
                      <SelectItem value="OTHER">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  label="Phiên bản"
                  type="text"
                  placeholder="1.0"
                  value={form.version}
                  onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
                  required
                  aria-required="true"
                />
              </div>

              <Input
                label="Tiêu đề"
                type="text"
                placeholder="Tiêu đề điều khoản"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
                aria-required="true"
              />

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="term-content"
                  className="text-[var(--color-text-primary)]"
                  style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
                >
                  Nội dung
                </label>
                <textarea
                  id="term-content"
                  rows={6}
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  className="flex w-full rounded-[var(--radius-lg)] border px-3 py-2 placeholder:text-[var(--color-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:border-transparent resize-y transition-all duration-[var(--transition-fast)]"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-primary)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Nội dung điều khoản..."
                />
              </div>

              <Input
                label="Ngày hiệu lực"
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
              />

              <div
                className="flex flex-col gap-3 sm:flex-row sm:gap-6 p-3 rounded-[var(--radius-lg)]"
                style={{ background: 'var(--color-bg-secondary)' }}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.required}
                    onChange={(e) => setForm((prev) => ({ ...prev, required: e.target.checked }))}
                    className="h-4 w-4 rounded-[var(--radius-sm)] border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-border-focus)] cursor-pointer"
                  />
                  <span
                    className="text-[var(--color-text-primary)]"
                    style={{ fontSize: 'var(--font-size-sm)' }}
                  >
                    Bắt buộc đồng ý
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                    className="h-4 w-4 rounded-[var(--radius-sm)] border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-border-focus)] cursor-pointer"
                  />
                  <span
                    className="text-[var(--color-text-primary)]"
                    style={{ fontSize: 'var(--font-size-sm)' }}
                  >
                    Kích hoạt
                  </span>
                </label>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editingTerm ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
