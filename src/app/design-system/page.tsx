'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Toast, ToastProvider, useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/table';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  SidebarLayout, Sidebar, SidebarGroup, SidebarItem, SidebarMobileTrigger, SidebarContent,
} from '@/components/ui/sidebar';
import {
  Users, Building2, Clock, CalendarDays, BarChart3, Settings, Home,
  Download, Trash2, Plus, Edit3, Bell,
} from 'lucide-react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="text-[var(--font-size-2xl)] font-[var(--font-weight-bold)] text-[var(--color-text-primary)] mb-2">
        {title}
      </h2>
      <div className="h-px bg-[var(--color-border)] mb-8" />
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-[var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ToastDemo() {
  const { addToast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="primary" onClick={() => addToast({ variant: 'success', title: 'Thành công', description: 'Đã lưu thành công.' })}>
        Success Toast
      </Button>
      <Button size="sm" variant="outline" onClick={() => addToast({ variant: 'warning', title: 'Cảnh báo', description: 'Hãy kiểm tra lại thông tin.' })}>
        Warning Toast
      </Button>
      <Button size="sm" variant="danger" onClick={() => addToast({ variant: 'error', title: 'Lỗi', description: 'Đã xảy ra lỗi khi xử lý.' })}>
        Error Toast
      </Button>
      <Button size="sm" variant="ghost" onClick={() => addToast({ variant: 'info', title: 'Thông tin', description: 'Có bản cập nhật mới.' })}>
        Info Toast
      </Button>
    </div>
  );
}

interface Employee {
  name: string;
  department: string;
  position: string;
  status: string;
  joinDate: string;
}

const sampleEmployees: Employee[] = [
  { name: 'Nguyễn Văn An', department: 'Kỹ thuật', position: 'Senior Developer', status: 'active', joinDate: '2023-01-15' },
  { name: 'Trần Thị Bình', department: 'Nhân sự', position: 'HR Manager', status: 'active', joinDate: '2022-06-01' },
  { name: 'Lê Hoàng Cường', department: 'Marketing', position: 'Content Lead', status: 'leave', joinDate: '2023-09-20' },
  { name: 'Phạm Minh Đức', department: 'Kỹ thuật', position: 'Junior Developer', status: 'active', joinDate: '2024-03-10' },
];

const columns: Column<Employee>[] = [
  { key: 'name', header: 'Tên nhân viên', sortable: true },
  { key: 'department', header: 'Phòng ban', sortable: true },
  { key: 'position', header: 'Chức vụ' },
  {
    key: 'status',
    header: 'Trạng thái',
    render: (row) => (
      <Badge variant={row.status === 'active' ? 'success' : 'warning'} dot size="sm">
        {row.status === 'active' ? 'Đang làm' : 'Nghỉ phép'}
      </Badge>
    ),
  },
  { key: 'joinDate', header: 'Ngày vào', sortable: true },
];

export default function DesignSystemPage() {
  const [activeMenu, setActiveMenu] = React.useState('dashboard');

  return (
    <ToastProvider>
      <SidebarLayout>
        <Sidebar>
          <SidebarGroup label="Chính">
            <SidebarItem icon={<Home />} label="Dashboard" active={activeMenu === 'dashboard'} onClick={() => setActiveMenu('dashboard')} />
            <SidebarItem icon={<Users />} label="Nhân viên" active={activeMenu === 'employees'} onClick={() => setActiveMenu('employees')} />
            <SidebarItem icon={<Building2 />} label="Phòng ban" active={activeMenu === 'departments'} onClick={() => setActiveMenu('departments')} />
          </SidebarGroup>
          <SidebarGroup label="Quản lý">
            <SidebarItem icon={<Clock />} label="Chấm công" active={activeMenu === 'attendance'} onClick={() => setActiveMenu('attendance')} />
            <SidebarItem icon={<CalendarDays />} label="Nghỉ phép" active={activeMenu === 'leave'} onClick={() => setActiveMenu('leave')} />
            <SidebarItem icon={<BarChart3 />} label="Báo cáo" active={activeMenu === 'reports'} onClick={() => setActiveMenu('reports')} />
          </SidebarGroup>
          <SidebarGroup label="Hệ thống">
            <SidebarItem icon={<Settings />} label="Cài đặt" active={activeMenu === 'settings'} onClick={() => setActiveMenu('settings')} />
          </SidebarGroup>
        </Sidebar>

        <SidebarContent>
          {/* Top bar */}
          <header className="flex items-center justify-between h-16 px-6 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
            <div className="flex items-center gap-3">
              <SidebarMobileTrigger />
              <h1 className="text-[var(--font-size-xl)] font-[var(--font-weight-bold)] text-[var(--color-text-primary)]">
                Design System Preview
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
            </div>
          </header>

          <div className="p-6 md:p-10 max-w-5xl">

            {/* ── BUTTONS ── */}
            <Section title="1. Button">
              <SubSection title="Biến thể">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="outline">Outline</Button>
                </div>
              </SubSection>
              <SubSection title="Kích thước">
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
              </SubSection>
              <SubSection title="Trạng thái">
                <div className="flex flex-wrap items-center gap-3">
                  <Button loading>Loading...</Button>
                  <Button disabled>Disabled</Button>
                  <Button variant="danger" loading>Deleting...</Button>
                </div>
              </SubSection>
              <SubSection title="Với Icon">
                <div className="flex flex-wrap items-center gap-3">
                  <Button><Plus className="h-4 w-4" /> Thêm mới</Button>
                  <Button variant="outline"><Download className="h-4 w-4" /> Xuất Excel</Button>
                  <Button variant="danger"><Trash2 className="h-4 w-4" /> Xóa</Button>
                  <Button variant="ghost"><Edit3 className="h-4 w-4" /> Chỉnh sửa</Button>
                </div>
              </SubSection>
            </Section>

            {/* ── INPUT ── */}
            <Section title="2. Input">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Tên nhân viên" placeholder="Nhập tên nhân viên" />
                <Input label="Email" type="email" placeholder="example@company.com" helperText="Email dùng để đăng nhập hệ thống" />
                <Input label="Số điện thoại" placeholder="0901234567" error="Số điện thoại không hợp lệ" />
                <Input label="Ghi chú" placeholder="Không thể chỉnh sửa" disabled />
              </div>
            </Section>

            {/* ── CARD ── */}
            <Section title="3. Card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card variant="default">
                  <CardHeader>
                    <CardTitle>Default Card</CardTitle>
                    <CardDescription>Border mỏng, nền trắng</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
                      Tổng nhân viên: 128 người
                    </p>
                  </CardContent>
                </Card>
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Elevated Card</CardTitle>
                    <CardDescription>Shadow, không border</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
                      Nghỉ phép hôm nay: 5 người
                    </p>
                  </CardContent>
                </Card>
                <Card variant="outlined">
                  <CardHeader>
                    <CardTitle>Outlined Card</CardTitle>
                    <CardDescription>Border đậm hơn</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
                      Phòng ban: 8 phòng
                    </p>
                  </CardContent>
                </Card>
                <Card variant="interactive">
                  <CardHeader>
                    <CardTitle>Interactive Card</CardTitle>
                    <CardDescription>Hover để thấy hiệu ứng</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
                      Click để xem chi tiết
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" size="sm">Xem thêm</Button>
                  </CardFooter>
                </Card>
              </div>
            </Section>

            {/* ── DIALOG ── */}
            <Section title="4. Modal (Dialog)">
              <div className="flex flex-wrap gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Small Dialog</Button>
                  </DialogTrigger>
                  <DialogContent size="sm">
                    <DialogHeader>
                      <DialogTitle>Xác nhận xóa</DialogTitle>
                      <DialogDescription>Bạn có chắc chắn muốn xóa nhân viên này? Hành động này không thể hoàn tác.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="secondary">Hủy</Button>
                      <Button variant="danger">Xóa</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Medium Dialog</Button>
                  </DialogTrigger>
                  <DialogContent size="md">
                    <DialogHeader>
                      <DialogTitle>Thêm nhân viên mới</DialogTitle>
                      <DialogDescription>Điền thông tin nhân viên bên dưới.</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                      <div className="grid gap-4">
                        <Input label="Họ và tên" placeholder="Nguyễn Văn A" />
                        <Input label="Email" type="email" placeholder="email@company.com" />
                        <Input label="Số điện thoại" placeholder="0901234567" />
                      </div>
                    </DialogBody>
                    <DialogFooter>
                      <Button variant="secondary">Hủy</Button>
                      <Button>Lưu</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Large Dialog</Button>
                  </DialogTrigger>
                  <DialogContent size="lg">
                    <DialogHeader>
                      <DialogTitle>Chi tiết nhân viên</DialogTitle>
                      <DialogDescription>Thông tin đầy đủ về nhân viên.</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Họ và tên" placeholder="Nguyễn Văn A" />
                        <Input label="Email" placeholder="email@company.com" />
                        <Input label="Phòng ban" placeholder="Kỹ thuật" />
                        <Input label="Chức vụ" placeholder="Senior Developer" />
                        <Input label="Ngày vào" type="date" />
                        <Input label="Số điện thoại" placeholder="0901234567" />
                      </div>
                    </DialogBody>
                    <DialogFooter>
                      <Button variant="secondary">Hủy</Button>
                      <Button>Cập nhật</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </Section>

            {/* ── TOAST ── */}
            <Section title="5. Toast / Alert">
              <SubSection title="Tĩnh (Static)">
                <div className="flex flex-col gap-3 max-w-md">
                  <Toast variant="success" title="Thành công" description="Nhân viên đã được thêm vào hệ thống." />
                  <Toast variant="warning" title="Cảnh báo" description="Nhân viên này chưa có phòng ban." />
                  <Toast variant="error" title="Lỗi" description="Không thể kết nối đến server." />
                  <Toast variant="info" title="Thông tin" description="Có 3 yêu cầu nghỉ phép chờ duyệt." />
                </div>
              </SubSection>
              <SubSection title="Tương tác (Click để hiển thị)">
                <ToastDemo />
              </SubSection>
            </Section>

            {/* ── BADGE ── */}
            <Section title="6. Badge">
              <SubSection title="Biến thể & Kích thước">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Badge variant="default" size="sm">Default sm</Badge>
                  <Badge variant="brand" size="sm">Brand sm</Badge>
                  <Badge variant="success" size="sm">Success sm</Badge>
                  <Badge variant="warning" size="sm">Warning sm</Badge>
                  <Badge variant="error" size="sm">Error sm</Badge>
                  <Badge variant="info" size="sm">Info sm</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Badge variant="default" size="md">Default md</Badge>
                  <Badge variant="brand" size="md">Brand md</Badge>
                  <Badge variant="success" size="md">Success md</Badge>
                  <Badge variant="warning" size="md">Warning md</Badge>
                  <Badge variant="error" size="md">Error md</Badge>
                  <Badge variant="info" size="md">Info md</Badge>
                </div>
              </SubSection>
              <SubSection title="Status Badge (với chấm tròn)">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success" dot>Đang làm việc</Badge>
                  <Badge variant="warning" dot>Nghỉ phép</Badge>
                  <Badge variant="error" dot>Đã nghỉ việc</Badge>
                  <Badge variant="info" dot>Thử việc</Badge>
                  <Badge variant="default" dot>Chưa xác nhận</Badge>
                </div>
              </SubSection>
            </Section>

            {/* ── TABLE ── */}
            <Section title="7. Table">
              <DataTable
                columns={columns}
                data={sampleEmployees}
                keyExtractor={(row) => row.name}
              />
            </Section>

            {/* ── SELECT ── */}
            <Section title="8. Dropdown / Select">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]">
                    Phòng ban
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phòng ban" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Phòng ban</SelectLabel>
                        <SelectItem value="tech">Kỹ thuật</SelectItem>
                        <SelectItem value="hr">Nhân sự</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="finance">Tài chính</SelectItem>
                        <SelectItem value="sales">Kinh doanh</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]">
                    Trạng thái
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Đang làm việc</SelectItem>
                      <SelectItem value="leave">Nghỉ phép</SelectItem>
                      <SelectItem value="probation">Thử việc</SelectItem>
                      <SelectItem value="resigned">Đã nghỉ việc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            {/* ── TABS ── */}
            <Section title="9. Tabs">
              <Tabs defaultValue="info">
                <TabsList>
                  <TabsTrigger value="info">Thông tin chung</TabsTrigger>
                  <TabsTrigger value="attendance">Chấm công</TabsTrigger>
                  <TabsTrigger value="leave">Nghỉ phép</TabsTrigger>
                  <TabsTrigger value="salary" disabled>Lương (sắp có)</TabsTrigger>
                </TabsList>
                <TabsContent value="info">
                  <Card variant="default">
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[var(--font-size-xs)] text-[var(--color-text-tertiary)]">Họ và tên</p>
                          <p className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)]">Nguyễn Văn An</p>
                        </div>
                        <div>
                          <p className="text-[var(--font-size-xs)] text-[var(--color-text-tertiary)]">Phòng ban</p>
                          <p className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)]">Kỹ thuật</p>
                        </div>
                        <div>
                          <p className="text-[var(--font-size-xs)] text-[var(--color-text-tertiary)]">Chức vụ</p>
                          <p className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)]">Senior Developer</p>
                        </div>
                        <div>
                          <p className="text-[var(--font-size-xs)] text-[var(--color-text-tertiary)]">Trạng thái</p>
                          <Badge variant="success" dot>Đang làm việc</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="attendance">
                  <Card variant="default">
                    <CardContent>
                      <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
                        Bảng chấm công tháng 03/2026 — 22/22 ngày công.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="leave">
                  <Card variant="default">
                    <CardContent>
                      <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
                        Còn lại: 8/12 ngày phép năm.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </Section>

            {/* ── SIDEBAR ── */}
            <Section title="10. Sidebar Layout">
              <Card variant="outlined">
                <CardContent>
                  <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
                    Sidebar layout đang hiển thị bên trái trang này. Tính năng bao gồm:
                  </p>
                  <ul className="mt-3 space-y-2 text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
                    <li className="flex items-center gap-2">
                      <Badge variant="success" size="sm">OK</Badge>
                      Thu gọn / Mở rộng (click icon trên desktop)
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="success" size="sm">OK</Badge>
                      Highlight menu active
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="success" size="sm">OK</Badge>
                      Nhóm menu với label
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="success" size="sm">OK</Badge>
                      Responsive drawer trên mobile
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </Section>

          </div>
        </SidebarContent>
      </SidebarLayout>
    </ToastProvider>
  );
}
