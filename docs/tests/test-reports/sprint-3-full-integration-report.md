# Integration Test Report — Full System

## Test Environment
- **Date**: 2026-03-24
- **Server**: Next.js 15 + Prisma + PostgreSQL 16
- **Browser**: Chrome (Playwright MCP)
- **Port**: localhost:3002
- **Tester**: ASTRA /test-run automation

## Test Result Summary

| Item | Result | Notes |
|------|--------|-------|
| Server Startup | **PASS** | DB cần khởi động thủ công (docker compose up -d postgres) |
| Console Errors | **0** | Không có console error trên bất kỳ trang nào |
| Network Failures | **0** | Tất cả API endpoints trả về 200/201 |
| Responsive Layout | **PASS** | Desktop/Tablet/Mobile đều hoạt động tốt |
| Auth Scenarios | **5/5 PASS** | Signup, Login, Logout, Re-login, Role-based menu |
| Department CRUD | **3/3 PASS** | Create, Delete, Duplicate code handling (409) |
| Leave Management | **PASS** | 7 loại nghỉ, 10+ yêu cầu, tabs/filters hoạt động |
| Attendance Page | **PASS** | ~90 records, stats, filters, pagination |
| Server Log Errors | **0** | Không có exception/stack trace |

## Detailed Results

### 1. Page Load Verification

| Page | URL | Status | Console Errors | Notes |
|------|-----|--------|----------------|-------|
| Trang chủ | `/` | PASS | 0 | Redirect link to `/login` |
| Đăng nhập | `/login` | PASS | 0 | Pre-filled credentials |
| Đăng ký | `/signup` | PASS | 0 | Form + terms checkbox |
| Quên mật khẩu | `/forgot-password` | PASS | 0 | Email form |
| Dashboard | `/dashboard` | PASS | 0 | Stats, charts, quick actions |
| Nhân viên | `/employees` | PASS | 0 | Table 11 NV, pagination, filters |
| Chi tiết NV | `/employees/[id]` | N/T | - | Không test trong round này |
| Phòng ban | `/departments` | PASS | 0 | 6 PB, table/tree view |
| Chấm công | `/attendance` | PASS | 0 | ~90 records, stats widget |
| Nghỉ phép | `/leave` | PASS | 0 | Tabs: Yêu cầu + Loại nghỉ |
| Hồ sơ cá nhân | `/profile` | PASS | 0 | Tabs: Info/Security/Terms |
| Quản lý users | `/admin/users` | PASS | 0 | 2 users, role badge |
| Design System | `/design-system` | N/T | - | Không test trong round này |

### 2. Responsive Layout

| Viewport | Size | Dashboard | Employees | Notes |
|----------|------|-----------|-----------|-------|
| Desktop | 1280x720 | PASS | Table view | Sidebar visible |
| Tablet | 768x1024 | PASS | Table view | Sidebar auto-collapse |
| Mobile | 375x667 | PASS | Card view | Sidebar hidden, hamburger menu |

Screenshots: `docs/tests/test-reports/screenshots/`

### 3. Auth Flow E2E

| Test Case | Result | Details |
|-----------|--------|---------|
| Đăng ký tài khoản mới | PASS | tester-e2e@hrlite.com, redirect to dashboard |
| Validation điều khoản | PASS | Alert "Vui lòng đồng ý với tất cả điều khoản bắt buộc" |
| Password strength meter | PASS | Hiển thị "Mạnh" cho Test@12345 |
| Logout | PASS | Redirect về /login |
| Login tài khoản vừa tạo | PASS | Hiển thị "Tester E2E", role "Người dùng" |
| Login admin | PASS | Hiển thị menu "Quản trị" (phân quyền đúng) |
| API: POST /api/auth/signup | 201 Created | Token trả về trong response |
| API: POST /api/auth/login | 200 OK | Token refresh hoạt động |

### 4. Department CRUD

| Test Case | Result | Details |
|-----------|--------|---------|
| Tạo phòng ban (DEPT-QA) | PASS | Toast "Đã tạo phòng ban", hiển thị trong bảng |
| Tạo mã trùng (DEPT-TEST) | PASS | Toast "Mã phòng ban đã được sử dụng bởi phòng ban đã xóa" (409) |
| Xóa phòng ban (DEPT-QA) | PASS | Confirm dialog, toast "Đã xóa phòng ban" |

### 5. Leave Management

| Test Case | Result | Details |
|-----------|--------|---------|
| Xem danh sách yêu cầu | PASS | 10 yêu cầu, pagination 2 trang |
| Tab loại nghỉ phép | PASS | 7 loại: ANNUAL(12), SICK(30), MARRIAGE(3), MATERNITY(180), PATERNITY(5), BEREAVEMENT(3), UNPAID(∞) |
| Bộ lọc trạng thái/loại/năm | PASS | Combobox hoạt động |
| Thống kê | PASS | Chờ duyệt: 0, Đã duyệt: 8, Nghỉ hôm nay: 0, Sắp nghỉ: 0 |

### 6. Attendance

| Test Case | Result | Details |
|-----------|--------|---------|
| Xem danh sách chấm công | PASS | ~90 records, 10 trang |
| Thống kê hôm nay | PASS | Có mặt: 0, Chưa check-in: 9, Đi trễ: 0, Đã check-out: 0 |
| Bộ lọc tháng/PB/trạng thái | PASS | Hoạt động tốt |

### 7. Network Request Analysis

| API Endpoint | Method | Status | Notes |
|-------------|--------|--------|-------|
| /api/health | GET | 200 | Health check OK |
| /api/auth/login | POST | 200 | Token issued |
| /api/auth/signup | POST | 201 | Account created |
| /api/users/me | GET | 200 | User profile |
| /api/dashboard/stats | GET | 200 | Dashboard statistics |
| /api/employees/stats | GET | 200 | Employee statistics |
| /api/departments | GET | 200 | Department list |
| /api/departments | POST | 201 | Department created |
| /api/departments/[id] | DELETE | 200 | Department deleted |
| /api/attendance | GET | 200 | Attendance list |
| /api/attendance/stats | GET | 200 | Attendance stats |
| /api/leave | GET | 200 | Leave requests |
| /api/leave/stats | GET | 200 | Leave statistics |
| /api/leave-types | GET | 200 | Leave types |
| /api/terms/active | GET | 200 | Active terms |

## Issues Found

### 1. [Medium] User dropdown menu z-index conflict
- **Location**: Dashboard page — user menu dropdown
- **Description**: Menu dropdown bị che bởi hero banner (`z-index` conflict). Click bình thường timeout, phải dùng JS `el.click()` để workaround.
- **Reproduction**: Login → Dashboard → Click user avatar (top-right) → Click "Đăng xuất"
- **Root Cause**: Element `.relative.z-10` trong hero banner section che phủ dropdown menu
- **Severity**: Medium — UX issue, chức năng vẫn hoạt động nhưng đôi khi khó click

### 2. [Low] DB connection not auto-started
- **Location**: Server startup
- **Description**: PostgreSQL Docker container cần khởi động thủ công trước khi chạy `npm run dev`
- **Recommendation**: Thêm script `predev` trong package.json hoặc ghi chú trong README

## Performance Notes
- Tất cả trang load < 1s (dev mode)
- API response time đều < 500ms
- Không phát hiện N+1 query hoặc slow query

## Conclusion
Hệ thống HRLite hoạt động ổn định trên tất cả modules chính. **1 bug medium** (z-index dropdown) cần fix. Tổng thể đạt tiêu chuẩn cho sprint review.
