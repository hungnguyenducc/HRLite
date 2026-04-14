'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
} from '@/components/ui';

interface TermItem {
  id: string;
  title: string;
  typeCd: string;
}

interface TermsAgreementDialogProps {
  open: boolean;
  terms: TermItem[];
  loading: boolean;
  onConfirm: (agreedTermsIds: string[]) => void;
  onCancel: () => void;
}

export function TermsAgreementDialog({
  open,
  terms,
  loading,
  onConfirm,
  onCancel,
}: TermsAgreementDialogProps) {
  const [checkedIds, setCheckedIds] = React.useState<Set<string>>(new Set());

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setCheckedIds(new Set());
    }
  }, [open]);

  const allChecked = terms.length > 0 && terms.every((t) => checkedIds.has(t.id));

  const handleToggle = (termId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(termId)) {
        next.delete(termId);
      } else {
        next.add(termId);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(terms.map((t) => t.id)));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(checkedIds));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !loading && onCancel()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Điều khoản sử dụng</DialogTitle>
          <DialogDescription>
            Vui lòng đọc và đồng ý với các điều khoản sau để hoàn tất đăng nhập
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-col gap-[var(--spacing-3)]">
            {/* Toggle all */}
            <label className="flex items-center gap-[var(--spacing-3)] cursor-pointer pb-[var(--spacing-2)] border-b border-[var(--color-border)]">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={handleToggleAll}
                disabled={loading}
                className="h-4 w-4 rounded-[var(--radius-sm)] border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-border-focus)] cursor-pointer"
              />
              <span
                className="text-[var(--font-size-sm)] font-[var(--font-weight-semibold)]"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Đồng ý tất cả
              </span>
            </label>

            {/* Individual terms */}
            {terms.map((term) => (
              <label
                key={term.id}
                className="flex items-start gap-[var(--spacing-3)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checkedIds.has(term.id)}
                  onChange={() => handleToggle(term.id)}
                  disabled={loading}
                  className="mt-0.5 h-4 w-4 rounded-[var(--radius-sm)] border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-border-focus)] cursor-pointer"
                />
                <span
                  className="flex-1 text-[var(--font-size-sm)]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {term.title}{' '}
                  <Badge variant="error" size="sm">
                    Bắt buộc
                  </Badge>
                </span>
              </label>
            ))}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="md" onClick={onCancel} disabled={loading}>
            Hủy
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={!allChecked}
            loading={loading}
          >
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
