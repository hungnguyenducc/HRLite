# Báo cáo Integration Test — Sprint 1 Auth (Lần 2)

## Môi trường kiểm thử
- **Ngày**: 2026-03-20
- **Server**: Next.js 15.5.13 (Docker production build)
- **Database**: PostgreSQL 16 Alpine (Docker)
- **Browser**: Chrome (Playwright MCP)
- **Viewport**: Desktop (1280x720), Tablet (768x1024), Mobile (375x667)

## Tóm tắt kết quả

| Hạng mục | Kết quả | Ghi chú |
|----------|---------|---------|
| Server Startup | PASS | Container healthy sau fix |
| Console Errors | 0 | Không có lỗi console trên các trang chính |
| Network Failures | 0 | Tất cả API trả 200 OK |
| Responsive Layout | PASS | Login + Dashboard hiển thị đúng ở cả 3 viewport |
| Login Flow | PASS | Đăng nhập thành công, redirect đến /dashboard |
| Signup Flow | PASS | Đăng ký + tự động đăng nhập + redirect |
| Logout Flow | PASS | Đăng xuất + redirect về /login |
| Auth Guard | PASS | Truy cập /dashboard khi chưa login → redirect /login |
| Login sai mật khẩu | PASS | Hiện lỗi generic, không tiết lộ email tồn tại |
| Admin Users | PASS | Hiển thị danh sách user, filter, search |
| Admin Terms | PASS | Hiển thị 2 điều khoản từ seed data |
| Profile | PASS | Hiển thị thông tin user, form chỉnh sửa, tabs |

## Lỗi phát hiện và đã sửa

### 1. [CRITICAL] Module `bcryptjs` thiếu trong Docker production build
- **Vị trí**: `Dockerfile` (production stage)
- **Nguyên nhân**: Next.js standalone mode không bundle `bcryptjs` vào output, Dockerfile cũng không copy riêng
- **Triệu chứng**: API `/api/auth/login` trả 500 — "Lỗi hệ thống"
- **Fix**:
  - Thêm `serverExternalPackages: ["bcryptjs"]` vào `next.config.ts`
  - Thêm `COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs` vào Dockerfile

### 2. [CRITICAL] Thiếu `JWT_SECRET` trong Docker environment
- **Vị trí**: `docker-compose.yml` → app service → environment
- **Nguyên nhân**: `.env` local có `JWT_SECRET` nhưng docker-compose không map
- **Triệu chứng**: API `/api/auth/login` trả 500 — "JWT_SECRET environment variable is not set"
- **Fix**: Thêm `JWT_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES` vào docker-compose.yml

### 3. [MEDIUM] Healthcheck dùng `localhost` thay vì `0.0.0.0`
- **Vị trí**: `Dockerfile` + `docker-compose.yml` healthcheck
- **Nguyên nhân**: Next.js standalone bind `0.0.0.0` nhưng healthcheck gọi `localhost` → DNS resolution khác trên Alpine
- **Triệu chứng**: Container luôn `unhealthy` dù app hoạt động bình thường
- **Fix**: Đổi healthcheck URL thành `http://0.0.0.0:3000/api/health`

### 4. [INFO] PostgreSQL local xung đột port 5432 với Docker
- **Nguyên nhân**: Homebrew PostgreSQL@16 chạy trên localhost:5432, Docker PostgreSQL cũng map port 5432
- **Triệu chứng**: Seed data/migration từ local đi vào PostgreSQL local thay vì Docker
- **Fix**: `brew services stop postgresql@16` trước khi dùng Docker

## Kiểm tra chi tiết theo trang

### Trang chủ (/)
- Hiển thị heading "HRLite" + mô tả
- 0 console errors, 0 network failures

### Trang Login (/login)
- Form: Email + Mật khẩu + nút Đăng nhập
- Link: Quên mật khẩu, Đăng ký ngay
- Responsive: 2 cột (Desktop) → 1 cột (Tablet/Mobile)
- Error handling: Hiện toast "Email hoặc mật khẩu không chính xác."

### Trang Signup (/signup)
- Form: Họ tên + Email + Mật khẩu + Xác nhận + Điều khoản (checkbox)
- Đăng ký thành công → auto login → redirect /dashboard

### Dashboard (/dashboard)
- Sidebar: 6 menu items (Dashboard, Nhân viên, Phòng ban, Chấm công, Nghỉ phép, Báo cáo)
- Stats: 4 cards (Tổng NV, Đang làm việc, Nghỉ phép hôm nay, Phòng ban)
- Thao tác nhanh: 4 buttons
- Responsive: Sidebar ẩn trên mobile, cards xếp 1 cột

### Profile (/profile)
- 3 tabs: Thông tin cá nhân, Bảo mật, Điều khoản
- Form chỉnh sửa: Tên, Email (disabled), SĐT, Avatar URL
- Hiển thị avatar + vai trò

### Admin Users (/admin/users)
- Bảng: Tên, Email, Vai trò, Trạng thái, Ngày tạo
- Filter: Vai trò, Trạng thái
- Search: Tìm kiếm người dùng

### Admin Terms (/admin/terms)
- Bảng: Loại, Phiên bản, Tiêu đề, Bắt buộc, Trạng thái, Ngày hiệu lực
- Nút: Thêm điều khoản, Vô hiệu hóa

## Kết luận

- **12/12 test cases PASS** sau khi sửa 3 lỗi cấu hình Docker
- Responsive layout hoạt động tốt trên cả 3 viewport
- Auth flow hoàn chỉnh: Signup → Login → Dashboard → Profile → Logout → Guard
- Không có lỗi console hoặc network failure trên các trang đã test
