# Báo cáo kiểm thử E2E Browser — Sprint 1

## Môi trường kiểm thử
- **Ngày**: 2026-03-19
- **Server**: Next.js 15.5.13 (App Router) — `npm run dev`
- **Database**: PostgreSQL 16 (Docker, port 5432)
- **Browser**: Chrome (Playwright MCP)
- **Node.js**: v20.x
- **Tài khoản test**: `e2e-test-1742358420@hrlite.test` / `Test@2026!Str0ng`

## Tóm tắt kết quả

| Hạng mục | Kết quả | Ghi chú |
|----------|---------|---------|
| Khởi động server | PASS | Ready trong 1370ms |
| Console Errors | 5 lỗi | 1 favicon 404, 2 dashboard/stats 404 (chưa triển khai), 2 auth expected |
| Network Failures | 3 loại | `/api/dashboard/stats` 404, `/api/users/me` 401 (khi chưa auth), `/api/auth/refresh` 400 (khi chưa auth) |
| Responsive Layout | PASS | Mobile/Tablet/Desktop đều hiển thị đúng |
| Kịch bản E2E | 3/5 PASS | 2 FAIL (signup UI thiếu terms, profile update lỗi validation) |
| Server Log Errors | 0 | Không có exception/stack trace |

## Kết quả chi tiết

### 1. Kiểm tra tải trang (Page Load)

| Trang | URL | Status | Console Errors | Kết quả |
|-------|-----|--------|----------------|---------|
| Trang chủ | `/` | 200 | favicon.ico 404 | PASS |
| Đăng nhập | `/login` | 200 | 0 | PASS |
| Đăng ký | `/signup` | 200 | 0 | PASS |
| Dashboard | `/dashboard` | 200 | `/api/dashboard/stats` 404 x2 | PASS (nhưng xem issue #1) |
| Hồ sơ cá nhân | `/profile` | 200 | `/api/users/me` 401 | PASS (nhưng xem issue #1) |
| Quản trị users | `/admin/users` | 200 | `/api/users` 401 | PASS (nhưng xem issue #1) |
| Quản trị terms | `/admin/terms` | 200 | `/api/terms` 401 | PASS (nhưng xem issue #1) |

### 2. Kịch bản E2E

#### TC-E2E-001: Đăng ký tài khoản mới (UI) — FAIL
- **Bước thực hiện**: Truy cập `/signup` → Điền form → Nhấn "Đăng ký"
- **Kết quả**: Lỗi "Phải đồng ý ít nhất một điều khoản"
- **Nguyên nhân**: Form đăng ký không hiển thị checkbox điều khoản (backend yêu cầu `agreedTermsIds` nhưng UI không có field này)
- **Mức độ**: Cao — Người dùng không thể đăng ký qua UI

#### TC-E2E-002: Đăng nhập thành công — PASS
- **Bước thực hiện**: Truy cập `/login` → Nhập email/password → Nhấn "Đăng nhập"
- **Kết quả**: Chuyển hướng đến `/dashboard`, hiển thị "Chào buổi sáng, E2E Test User"
- **Cookies**: `access_token` và `refresh_token` được thiết lập

#### TC-E2E-003: Đăng nhập sai mật khẩu — PASS
- **Bước thực hiện**: Nhập email đúng + mật khẩu sai → Nhấn "Đăng nhập"
- **Kết quả**: Hiển thị toast "Email hoặc mật khẩu không chính xác."
- **Không chuyển hướng**: Đúng

#### TC-E2E-004: Xem và cập nhật hồ sơ cá nhân — FAIL
- **Bước thực hiện**: Truy cập `/profile` → Thay đổi tên + SĐT → Nhấn "Lưu thay đổi"
- **Kết quả**: Lỗi "Expected string, received null"
- **Nguyên nhân**: API `PATCH /api/users/me` validation lỗi khi `avatarUrl` là null — DTO không handle optional field
- **Mức độ**: Trung bình — Có thể workaround bằng cách điền URL avatar

#### TC-E2E-005: Hiển thị dashboard sau đăng nhập — PASS
- **Bước thực hiện**: Đăng nhập → Kiểm tra dashboard
- **Kết quả**: Sidebar đầy đủ menu, 4 stat cards (tổng nhân viên, đang làm việc, nghỉ phép, phòng ban), thao tác nhanh
- **Lưu ý**: `/api/dashboard/stats` trả về 404 — API chưa triển khai, stat hiển thị 0

### 3. Kiểm tra Responsive

| Viewport | Kích thước | Login | Dashboard | Kết quả |
|----------|-----------|-------|-----------|---------|
| Mobile | 375x812 | PASS | PASS | Sidebar ẩn, hamburger menu, layout 1 cột |
| Tablet | 768x1024 | N/A | PASS | Sidebar ẩn, grid 2 cột |
| Desktop | 1280x720 | PASS | PASS | Sidebar hiển thị, grid 4 cột stats + 2 cột actions |

Screenshots: `test-screenshots/`

### 4. Phân tích Server Logs

- **Tổng request**: ~50 requests trong quá trình test
- **Exception/Stack trace**: 0
- **Thời gian phản hồi**: Tất cả < 1s (nhanh nhất 8ms, chậm nhất 1039ms cho first compile)
- **N+1 Query**: Không phát hiện
- **Memory warnings**: Không có

## Các vấn đề phát hiện và sửa chữa

### Issue #1: [Cao] Các trang protected không redirect khi chưa đăng nhập — FIXED
- **Trang ảnh hưởng**: `/dashboard`, `/profile`, `/admin/users`, `/admin/terms`
- **Nguyên nhân**: `DashboardShell` chỉ kiểm tra `loading` mà không kiểm tra `user === null`
- **Sửa**: Thêm auth guard trong `DashboardShell` — redirect về `/login` khi `!loading && !user`
- **File sửa**: `src/app/(dashboard)/layout.tsx`
- **Xác minh**: Tất cả 4 trang đều redirect về `/login` khi chưa đăng nhập

### Issue #2: [Cao] Form đăng ký thiếu checkbox điều khoản — FIXED
- **Nguyên nhân**: API `/api/terms/active` trả về `reqYn: "Y"` nhưng UI interface kỳ vọng `required: boolean`. Field mapping sai dẫn đến `term.required` luôn là `undefined`
- **Sửa**: Thêm `TermItemApi` interface và transform data khi fetch (`reqYn === 'Y'` → `required: true`)
- **File sửa**: `src/app/(auth)/signup/page.tsx`
- **Xác minh**: Checkbox hiển thị đúng với badge "Bắt buộc"/"Tùy chọn", đăng ký E2E thành công

### Issue #3: [Trung bình] Cập nhật profile lỗi validation cho optional fields — FIXED
- **Nguyên nhân**: Zod schema `updateProfileSchema` dùng `.optional()` nhưng không dùng `.nullable()`, trong khi frontend gửi `null` cho các field trống
- **Sửa**: Thêm `.nullable()` cho `displayName`, `phone`, `photoUrl` trong schema
- **File sửa**: `src/lib/auth/validation.ts`
- **Xác minh**: Cập nhật tên + SĐT thành công, toast "Đã cập nhật thông tin cá nhân"

### Issue #4: [Thấp] API Dashboard Stats chưa triển khai — FIXED
- **Sửa**: Tạo `GET /api/dashboard/stats` với Prisma queries cho Employee, LeaveRequest, Department
- **File tạo**: `src/app/api/dashboard/stats/route.ts`
- **Xác minh**: API trả 200, dashboard không còn console error 404

### Issue #5: [Thấp] Thiếu favicon — FIXED
- **Sửa**: Tạo SVG favicon với brand color (#4f46e5) và text "HR"
- **File tạo**: `src/app/icon.svg`
- **Xác minh**: `GET /icon.svg` trả 200

## Kết luận

- **Tổng test case**: 5 kịch bản E2E + 7 page load + 3 responsive = 15
- **Lần 1**: PASS 12/15 (80%), FAIL 3/15 — phát hiện 5 issues
- **Lần 2 (sau sửa)**: PASS 15/15 (100%)
- **Issues phát hiện**: 5 (2 cao, 1 trung bình, 2 thấp) — **tất cả đã sửa**
