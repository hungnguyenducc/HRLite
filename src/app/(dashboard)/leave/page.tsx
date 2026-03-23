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
  PENDING: { label: 'Ch\u1EDD duy\u1EC7t', variant: 'warning' },
  APPROVED: { label: '\u0110\u00E3 duy\u1EC7t', variant: 'success' },
  REJECTED: { label: 'T\u1EEB ch\u1ED1i', variant: 'error' },
  CANCELLED: { label: '\u0110\u00E3 h\u1EE7y', variant: 'default' },
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

// ─── Component ────────────────────────────────────────────

export default function LeavePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  // Tab state
  const [activeTab, setActiveTab] = React.useState('requests');

  // ═══ Tab 1: Leave Requests ═══

  // List state
  const [leaves, setLeaves] = React.useState<LeaveRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
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
        title: 'L\u1ED7i',
        description: 'Kh\u00F4ng th\u1EC3 t\u1EA3i danh s\u00E1ch ngh\u1EC9 ph\u00E9p.',
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
        title: 'L\u1ED7i',
        description: 'Kh\u00F4ng th\u1EC3 t\u1EA3i danh s\u00E1ch lo\u1EA1i ngh\u1EC9 ph\u00E9p.',
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
          title: 'Th\u1EA5t b\u1EA1i',
          description:
            json.error || 'Kh\u00F4ng th\u1EC3 t\u1EA1o y\u00EAu c\u1EA7u ngh\u1EC9 ph\u00E9p.',
        });
        return;
      }

      addToast({
        variant: 'success',
        title: '\u0110\u00E3 t\u1EA1o y\u00EAu c\u1EA7u ngh\u1EC9 ph\u00E9p',
      });
      setFormOpen(false);
      fetchLeaves();
      fetchStats();
    } catch {
      addToast({
        variant: 'error',
        title: 'L\u1ED7i k\u1EBFt n\u1ED1i',
        description: 'Kh\u00F4ng th\u1EC3 k\u1EBFt n\u1ED1i \u0111\u1EBFn m\u00E1y ch\u1EE7.',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleLeaveAction = async (id: string, action: 'approve' | 'reject' | 'cancel') => {
    setActionLoading(`${id}-${action}`);
    try {
      const res = await fetch(`/api/leave/${id}/${action}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        addToast({
          variant: 'error',
          title: 'Th\u1EA5t b\u1EA1i',
          description: json.error || 'Kh\u00F4ng th\u1EC3 th\u1EF1c hi\u1EC7n thao t\u00E1c.',
        });
        return;
      }

      const actionLabels = {
        approve: '\u0110\u00E3 duy\u1EC7t',
        reject: '\u0110\u00E3 t\u1EEB ch\u1ED1i',
        cancel: '\u0110\u00E3 h\u1EE7y',
      };
      addToast({ variant: 'success', title: actionLabels[action] });
      fetchLeaves();
      fetchStats();
    } catch {
      addToast({ variant: 'error', title: 'L\u1ED7i k\u1EBFt n\u1ED1i' });
    } finally {
      setActionLoading(null);
    }
  };

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
          title: 'Th\u1EA5t b\u1EA1i',
          description: json.error || 'Kh\u00F4ng th\u1EC3 l\u01B0u lo\u1EA1i ngh\u1EC9 ph\u00E9p.',
        });
        return;
      }

      addToast({
        variant: 'success',
        title: ltEditingCd
          ? '\u0110\u00E3 c\u1EADp nh\u1EADt lo\u1EA1i ngh\u1EC9 ph\u00E9p'
          : '\u0110\u00E3 t\u1EA1o lo\u1EA1i ngh\u1EC9 ph\u00E9p',
      });
      setLtFormOpen(false);
      fetchLeaveTypes();
      fetchLeaveTypeOptions();
    } catch {
      addToast({
        variant: 'error',
        title: 'L\u1ED7i k\u1EBFt n\u1ED1i',
        description: 'Kh\u00F4ng th\u1EC3 k\u1EBFt n\u1ED1i \u0111\u1EBFn m\u00E1y ch\u1EE7.',
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
          title: 'Kh\u00F4ng th\u1EC3 x\u00F3a',
          description: json.error || 'L\u1ED7i khi x\u00F3a lo\u1EA1i ngh\u1EC9 ph\u00E9p.',
        });
        return;
      }

      addToast({
        variant: 'success',
        title: '\u0110\u00E3 x\u00F3a lo\u1EA1i ngh\u1EC9 ph\u00E9p',
      });
      setLtDeleteOpen(false);
      setLtDeleting(null);
      fetchLeaveTypes();
      fetchLeaveTypeOptions();
    } catch {
      addToast({ variant: 'error', title: 'L\u1ED7i k\u1EBFt n\u1ED1i' });
    } finally {
      setLtDeleteLoading(false);
    }
  };

  // ─── Leave request table columns ───────────────

  const leaveColumns: Column<LeaveRecord>[] = [
    {
      key: 'id' as keyof LeaveRecord,
      header: 'M\u00E3 NV',
      render: (row) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
          {row.employee.emplNo}
        </span>
      ),
    },
    {
      key: 'employee' as keyof LeaveRecord,
      header: 'H\u1ECD t\u00EAn',
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
      key: 'leaveType' as keyof LeaveRecord,
      header: 'Lo\u1EA1i',
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {row.leaveType.lvTypeNm}
        </span>
      ),
    },
    {
      key: 'startDt',
      header: 'T\u1EEB ng\u00E0y',
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {row.startDt}
        </span>
      ),
    },
    {
      key: 'endDt',
      header: '\u0110\u1EBFn ng\u00E0y',
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {row.endDt}
        </span>
      ),
    },
    {
      key: 'lvDays',
      header: 'S\u1ED1 ng\u00E0y',
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {row.lvDays}
        </span>
      ),
    },
    {
      key: 'rsn',
      header: 'L\u00FD do',
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
          title={row.rsn}
        >
          {row.rsn && row.rsn.length > 30 ? `${row.rsn.slice(0, 30)}...` : row.rsn || '\u2014'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Tr\u1EA1ng th\u00E1i',
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
      header: '',
      render: (row: LeaveRecord) => {
        if (row.status !== 'PENDING') return null;

        const isOwner = true; // Server validates ownership on cancel

        return (
          <div className="flex items-center gap-1">
            {isAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleLeaveAction(row.id, 'approve')}
                  loading={actionLoading === `${row.id}-approve`}
                  aria-label="Duy\u1EC7t"
                >
                  <Check className="h-4 w-4 text-[var(--color-success-600)]" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleLeaveAction(row.id, 'reject')}
                  loading={actionLoading === `${row.id}-reject`}
                  aria-label="T\u1EEB ch\u1ED1i"
                >
                  <X className="h-4 w-4 text-[var(--color-error-600)]" />
                </Button>
              </>
            )}
            {(isOwner || isAdmin) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleLeaveAction(row.id, 'cancel')}
                loading={actionLoading === `${row.id}-cancel`}
                aria-label="H\u1EE7y"
              >
                <Ban className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // ─── Leave type table columns ──────────────────

  const leaveTypeColumns: Column<LeaveTypeRecord>[] = [
    {
      key: 'lvTypeCd',
      header: 'M\u00E3',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
          {row.lvTypeCd}
        </span>
      ),
    },
    {
      key: 'lvTypeNm',
      header: 'T\u00EAn lo\u1EA1i',
      sortable: true,
      render: (row) => (
        <span
          className="text-[var(--color-text-primary)]"
          style={{ fontWeight: 'var(--font-weight-medium)' }}
        >
          {row.lvTypeNm}
        </span>
      ),
    },
    {
      key: 'maxDays',
      header: 'S\u1ED1 ng\u00E0y t\u1ED1i \u0111a',
      render: (row) => (
        <span
          className="text-[var(--color-text-secondary)]"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          {row.maxDays !== null ? row.maxDays : 'Kh\u00F4ng gi\u1EDBi h\u1EA1n'}
        </span>
      ),
    },
    {
      key: 'useYn',
      header: 'Tr\u1EA1ng th\u00E1i',
      render: (row) => (
        <Badge variant={row.useYn === 'Y' ? 'success' : 'default'} size="sm" dot>
          {row.useYn === 'Y' ? '\u0110ang d\u00F9ng' : 'Ng\u1EEBng d\u00F9ng'}
        </Badge>
      ),
    },
    {
      key: 'lvTypeCd' as keyof LeaveTypeRecord,
      header: '',
      render: (row: LeaveTypeRecord) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditLeaveTypeDialog(row)}
            aria-label="S\u1EEDa"
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
            aria-label="X\u00F3a"
          >
            <Trash2 className="h-4 w-4 text-[var(--color-error-600)]" />
          </Button>
        </div>
      ),
    },
  ];

  // ─── Stat cards ──────────────────────────────

  const statCards = [
    {
      label: 'Ch\u1EDD duy\u1EC7t',
      value: stats?.pending ?? 0,
      icon: <Clock className="h-5 w-5" />,
      color: 'var(--color-warning-500)',
    },
    {
      label: '\u0110\u00E3 duy\u1EC7t th\u00E1ng n\u00E0y',
      value: stats?.approvedThisMonth ?? 0,
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'var(--color-success-500)',
    },
    {
      label: 'Ngh\u1EC9 h\u00F4m nay',
      value: stats?.onLeaveToday ?? 0,
      icon: <CalendarCheck className="h-5 w-5" />,
      color: 'var(--color-brand-500)',
    },
    {
      label: 'S\u1EAFp ngh\u1EC9',
      value: stats?.upcoming ?? 0,
      icon: <CalendarClock className="h-5 w-5" />,
      color: 'var(--color-accent-500)',
    },
  ];

  // ─── Computed values ───────────────────────────

  const calculatedDays = calcLeaveDays(formData.startDt, formData.endDt);

  const currentYear = new Date().getFullYear();
  const yearOptions = [String(currentYear), String(currentYear - 1)];

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
            <CalendarDays className="h-6 w-6" />
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
              Ngh\u1EC9 ph\u00E9p
            </h1>
            <p
              className="text-[var(--color-text-secondary)] mt-1"
              style={{ fontSize: 'var(--font-size-sm)' }}
            >
              Qu\u1EA3n l\u00FD y\u00EAu c\u1EA7u ngh\u1EC9 ph\u00E9p
            </p>
          </div>
        </div>

        {activeTab === 'requests' && (
          <Button variant="primary" size="sm" onClick={openCreateLeaveDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            T\u1EA1o y\u00EAu c\u1EA7u
          </Button>
        )}
        {activeTab === 'types' && isAdmin && (
          <Button variant="primary" size="sm" onClick={openCreateLeaveTypeDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Th\u00EAm lo\u1EA1i ngh\u1EC9
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Y\u00EAu c\u1EA7u ngh\u1EC9 ph\u00E9p</TabsTrigger>
          {isAdmin && <TabsTrigger value="types">Lo\u1EA1i ngh\u1EC9 ph\u00E9p</TabsTrigger>}
        </TabsList>

        {/* ═══ Tab 1: Leave Requests ═══ */}
        <TabsContent value="requests">
          <div className="flex flex-col gap-6">
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
                    <div className="flex gap-2 flex-1 flex-wrap">
                      <Select
                        value={statusFilter}
                        onValueChange={(v) => {
                          setStatusFilter(v);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger
                          className="w-[150px]"
                          aria-label="L\u1ECDc tr\u1EA1ng th\u00E1i"
                        >
                          <SelectValue placeholder="Tr\u1EA1ng th\u00E1i" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">T\u1EA5t c\u1EA3</SelectItem>
                          <SelectItem value="PENDING">Ch\u1EDD duy\u1EC7t</SelectItem>
                          <SelectItem value="APPROVED">\u0110\u00E3 duy\u1EC7t</SelectItem>
                          <SelectItem value="REJECTED">T\u1EEB ch\u1ED1i</SelectItem>
                          <SelectItem value="CANCELLED">\u0110\u00E3 h\u1EE7y</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={typeFilter}
                        onValueChange={(v) => {
                          setTypeFilter(v);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger
                          className="w-[170px]"
                          aria-label="L\u1ECDc lo\u1EA1i ngh\u1EC9"
                        >
                          <SelectValue placeholder="Lo\u1EA1i ngh\u1EC9 ph\u00E9p" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">T\u1EA5t c\u1EA3 lo\u1EA1i</SelectItem>
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
                        <SelectTrigger className="w-[120px]" aria-label="L\u1ECDc n\u0103m">
                          <SelectValue placeholder="N\u0103m" />
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
                      style={{
                        borderColor: 'var(--color-brand-300)',
                        borderTopColor: 'transparent',
                      }}
                    />
                    <p
                      className="text-[var(--color-text-secondary)]"
                      style={{ fontSize: 'var(--font-size-sm)' }}
                    >
                      \u0110ang t\u1EA3i d\u1EEF li\u1EC7u...
                    </p>
                  </div>
                </div>
              ) : (
                <DataTable columns={leaveColumns} data={leaves} keyExtractor={(row) => row.id} />
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
                  Trang tr\u01B0\u1EDBc
                </Button>
                <span
                  className="text-[var(--color-text-secondary)] px-2"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
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
          </div>
        </TabsContent>

        {/* ═══ Tab 2: Leave Types ═══ */}
        {isAdmin && (
          <TabsContent value="types">
            <div className="flex flex-col gap-6">
              {/* Data table */}
              <div className="animate-fade-up-delay-1">
                {ltLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
                        style={{
                          borderColor: 'var(--color-brand-300)',
                          borderTopColor: 'transparent',
                        }}
                      />
                      <p
                        className="text-[var(--color-text-secondary)]"
                        style={{ fontSize: 'var(--font-size-sm)' }}
                      >
                        \u0110ang t\u1EA3i d\u1EEF li\u1EC7u...
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

      {/* ═══ Create leave request dialog ═══ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>T\u1EA1o y\u00EAu c\u1EA7u ngh\u1EC9 ph\u00E9p</DialogTitle>
            <DialogDescription>
              \u0110i\u1EC1n th\u00F4ng tin \u0111\u1EC3 t\u1EA1o y\u00EAu c\u1EA7u ngh\u1EC9
              ph\u00E9p m\u1EDBi
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              {/* Employee select (ADMIN only) */}
              {isAdmin && (
                <div>
                  <label
                    className="block mb-1.5 text-[var(--color-text-secondary)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Nh\u00E2n vi\u00EAn <span className="text-[var(--color-error-500)]">*</span>
                  </label>
                  <Select
                    value={formData.employeeId || 'none'}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, employeeId: v === 'none' ? '' : v }))
                    }
                  >
                    <SelectTrigger className="w-full" aria-label="Ch\u1ECDn nh\u00E2n vi\u00EAn">
                      <SelectValue placeholder="Ch\u1ECDn nh\u00E2n vi\u00EAn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ch\u1ECDn nh\u00E2n vi\u00EAn</SelectItem>
                      {employeeOptions.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.emplNm} ({e.emplNo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Leave type */}
              <div>
                <label
                  className="block mb-1.5 text-[var(--color-text-secondary)]"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  Lo\u1EA1i ngh\u1EC9 <span className="text-[var(--color-error-500)]">*</span>
                </label>
                <Select
                  value={formData.lvTypeCd || 'none'}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, lvTypeCd: v === 'none' ? '' : v }))
                  }
                >
                  <SelectTrigger className="w-full" aria-label="Ch\u1ECDn lo\u1EA1i ngh\u1EC9">
                    <SelectValue placeholder="Ch\u1ECDn lo\u1EA1i ngh\u1EC9" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ch\u1ECDn lo\u1EA1i ngh\u1EC9</SelectItem>
                    {leaveTypeOptions.map((t) => (
                      <SelectItem key={t.lvTypeCd} value={t.lvTypeCd}>
                        {t.lvTypeNm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block mb-1.5 text-[var(--color-text-secondary)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Ng\u00E0y b\u1EAFt \u0111\u1EA7u{' '}
                    <span className="text-[var(--color-error-500)]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDt: e.target.value }))}
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
                <div>
                  <label
                    className="block mb-1.5 text-[var(--color-text-secondary)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Ng\u00E0y k\u1EBFt th\u00FAc{' '}
                    <span className="text-[var(--color-error-500)]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDt: e.target.value }))}
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

              {/* Calculated days display */}
              {formData.startDt && formData.endDt && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)]"
                  style={{
                    background: 'var(--color-brand-50)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-brand-700)',
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    S\u1ED1 ng\u00E0y ngh\u1EC9 (kh\u00F4ng t\u00EDnh cu\u1ED1i tu\u1EA7n):{' '}
                    <strong>{calculatedDays}</strong> ng\u00E0y
                  </span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label
                  className="block mb-1.5 text-[var(--color-text-secondary)]"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  L\u00FD do <span className="text-[var(--color-error-500)]">*</span>
                </label>
                <textarea
                  value={formData.rsn}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rsn: e.target.value }))}
                  placeholder="Nh\u1EADp l\u00FD do ngh\u1EC9 ph\u00E9p..."
                  rows={3}
                  className={cn(
                    'flex w-full rounded-[var(--radius-lg)] border px-3 py-2 resize-none',
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
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>
              H\u1EE7y
            </Button>
            <Button variant="primary" size="sm" loading={formLoading} onClick={handleCreateLeave}>
              T\u1EA1o m\u1EDBi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Create/Edit leave type dialog ═══ */}
      <Dialog open={ltFormOpen} onOpenChange={setLtFormOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {ltEditingCd
                ? 'S\u1EEDa lo\u1EA1i ngh\u1EC9 ph\u00E9p'
                : 'Th\u00EAm lo\u1EA1i ngh\u1EC9 ph\u00E9p m\u1EDBi'}
            </DialogTitle>
            <DialogDescription>
              {ltEditingCd
                ? 'C\u1EADp nh\u1EADt th\u00F4ng tin lo\u1EA1i ngh\u1EC9 ph\u00E9p'
                : 'Nh\u1EADp th\u00F4ng tin \u0111\u1EC3 t\u1EA1o lo\u1EA1i ngh\u1EC9 ph\u00E9p m\u1EDBi'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              {/* Code */}
              <div>
                <label
                  className="block mb-1.5 text-[var(--color-text-secondary)]"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  M\u00E3 lo\u1EA1i{' '}
                  {!ltEditingCd && <span className="text-[var(--color-error-500)]">*</span>}
                </label>
                <input
                  type="text"
                  value={ltFormData.lvTypeCd}
                  onChange={(e) =>
                    setLtFormData((prev) => ({ ...prev, lvTypeCd: e.target.value.toUpperCase() }))
                  }
                  disabled={!!ltEditingCd}
                  placeholder="VD: ANNUAL"
                  className={cn(
                    'flex h-10 w-full rounded-[var(--radius-lg)] border px-3 py-2',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
                    ltEditingCd && 'opacity-50 cursor-not-allowed',
                  )}
                  style={{
                    borderColor: 'var(--color-border)',
                    background: ltEditingCd
                      ? 'var(--color-bg-secondary)'
                      : 'var(--color-bg-primary)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              {/* Name */}
              <div>
                <label
                  className="block mb-1.5 text-[var(--color-text-secondary)]"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  T\u00EAn lo\u1EA1i <span className="text-[var(--color-error-500)]">*</span>
                </label>
                <input
                  type="text"
                  value={ltFormData.lvTypeNm}
                  onChange={(e) => setLtFormData((prev) => ({ ...prev, lvTypeNm: e.target.value }))}
                  placeholder="VD: Ngh\u1EC9 ph\u00E9p n\u0103m"
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

              <div className="grid grid-cols-2 gap-4">
                {/* Max days */}
                <div>
                  <label
                    className="block mb-1.5 text-[var(--color-text-secondary)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    S\u1ED1 ng\u00E0y t\u1ED1i \u0111a
                  </label>
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
                    placeholder="Kh\u00F4ng gi\u1EDBi h\u1EA1n"
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

                {/* Status (only when editing) */}
                {ltEditingCd && (
                  <div>
                    <label
                      className="block mb-1.5 text-[var(--color-text-secondary)]"
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      Tr\u1EA1ng th\u00E1i
                    </label>
                    <Select
                      value={ltFormData.useYn}
                      onValueChange={(v) => setLtFormData((prev) => ({ ...prev, useYn: v }))}
                    >
                      <SelectTrigger className="w-full" aria-label="Tr\u1EA1ng th\u00E1i">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Y">\u0110ang d\u00F9ng</SelectItem>
                        <SelectItem value="N">Ng\u1EEBng d\u00F9ng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setLtFormOpen(false)}>
              H\u1EE7y
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={ltFormLoading}
              onClick={handleLeaveTypeSubmit}
            >
              {ltEditingCd ? 'C\u1EADp nh\u1EADt' : 'T\u1EA1o m\u1EDBi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete leave type confirmation ═══ */}
      <Dialog open={ltDeleteOpen} onOpenChange={setLtDeleteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>X\u00E1c nh\u1EADn x\u00F3a</DialogTitle>
            <DialogDescription>
              B\u1EA1n c\u00F3 ch\u1EAFc ch\u1EAFn mu\u1ED1n x\u00F3a lo\u1EA1i ngh\u1EC9 ph\u00E9p{' '}
              <strong>{ltDeleting?.lvTypeNm}</strong> ({ltDeleting?.lvTypeCd})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setLtDeleteOpen(false)}>
              H\u1EE7y
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={ltDeleteLoading}
              onClick={handleLeaveTypeDelete}
            >
              X\u00F3a
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
