# Sprint 4 — Firebase Auth Integration Test Report

## Môi trường test
- **Ngày**: 2026-03-24
- **Server**: Next.js 15 (dev mode, port 3002)
- **Browser**: Chrome (Playwright MCP)
- **Database**: PostgreSQL 16 (Docker)
- **Auth**: Firebase Authentication

---

## Tổng kết kết quả

| Hạng mục | Kết quả | Ghi chú |
|----------|---------|---------|
| Server khởi động | PASS | Đã chạy sẵn trên port 3002 |
| Console Errors | 1 (expected) | 403 cho API admin-only khi role USER |
| Network Failures | 0 critical | Firebase 400 cho sai credentials (expected) |
| Responsive Layout | PASS | Desktop/Tablet/Mobile đều OK |
| Scenario Tests | **14/15 PASS** | 1 BLOCKED (admin chưa migrate Firebase) |
| Server Log Errors | 0 | |

---

## Kết quả chi tiết theo Scenario Group

### Group 1: Sign Up (Đăng ký qua Firebase)

| Test Case | Mô tả | Kết quả | Ghi chú |
|-----------|--------|---------|---------|
| E2E-F001 | Đăng ký thành công | **PASS** | Redirect /dashboard, hiển thị user info đúng |
| E2E-F002 | Thiếu required terms → chặn | **PASS** | Alert "Vui lòng đồng ý với tất cả điều khoản bắt buộc" |
| E2E-F004 | Mật khẩu yếu → validation | **PASS** | Zod chặn client-side: "Mật khẩu phải có ít nhất 8 ký tự" |
| E2E-F006 | Password strength indicator | **PASS** | 3 mức: Yếu/Trung bình/Mạnh hiển thị đúng |

**Network verified**:
- `POST identitytoolkit.googleapis.com/signUp` → 200
- `POST /api/auth/signup` → 201 Created
- Cookie `__session` được set
- `GET /api/users/me` → 200

### Group 2: Sign In (Đăng nhập qua Firebase)

| Test Case | Mô tả | Kết quả | Ghi chú |
|-----------|--------|---------|---------|
| E2E-F010 | Đăng nhập thành công | **PASS** | Test với account vừa tạo, redirect /dashboard |
| E2E-F011 | Sai password → lỗi | **PASS** | Toast "Email hoặc mật khẩu không đúng" |
| E2E-F014 | Email không tồn tại → lỗi | **PASS** | Toast "Email hoặc mật khẩu không đúng" |
| E2E-F010 (admin) | Đăng nhập admin seed | **BLOCKED** | Admin chưa migrate sang Firebase |

### Group 3: Logout

| Test Case | Mô tả | Kết quả | Ghi chú |
|-----------|--------|---------|---------|
| E2E-F020 | Logout thành công | **PASS** | Redirect /login, cookie xóa |
| E2E-F021 | Protected route sau logout | **PASS** | /dashboard → 401 → redirect /login |

### Group 4: Session Management

| Test Case | Mô tả | Kết quả | Ghi chú |
|-----------|--------|---------|---------|
| E2E-F030 | Session cookie trên nhiều trang | **PASS** | Dashboard/Employees/Departments/Leave đều OK |
| E2E-F032 | Admin route với USER role | **PASS** | `/api/users?limit=100` → 403 Forbidden |

### Group 5: Withdrawal (Xóa tài khoản)

| Test Case | Mô tả | Kết quả | Ghi chú |
|-----------|--------|---------|---------|
| E2E-F041 | Email không khớp → disabled | **PASS** | Nút "Xóa vĩnh viễn" disabled |
| E2E-F042 | Hủy xóa → dialog đóng | **PASS** | Dialog đóng, không thay đổi |

### Group 6: Password Change

| Test Case | Mô tả | Kết quả | Ghi chú |
|-----------|--------|---------|---------|
| E2E-F052 | Xác nhận không khớp → validation | **PASS** | "Mật khẩu xác nhận không khớp" |

---

## Responsive Layout

| Viewport | Kích thước | Kết quả | Ghi chú |
|----------|-----------|---------|---------|
| Desktop | 1280x720 | **PASS** | Sidebar mở, full layout |
| Tablet | 768x1024 | **PASS** | Sidebar collapsed, grid 2 cột |
| Mobile | 375x667 | **PASS** | Sidebar ẩn, form full-width |

---

## Issues phát hiện

### Issue 1: [HIGH] Admin seed account chưa migrate Firebase
- **Mô tả**: Tài khoản `admin@hrlite.com` từ seed data không tồn tại trong Firebase Auth
- **Nguyên nhân**: Migration script (`scripts/migrate-to-firebase.ts`) chưa được chạy
- **Ảnh hưởng**: Không thể đăng nhập bằng admin seed account
- **Khắc phục**: Chạy `npx tsx scripts/migrate-to-firebase.ts`

### Issue 2: [MEDIUM] Seed hash không tương thích migration
- **Mô tả**: `prisma/seed.ts` sử dụng `SHA256` cho password hash, nhưng `migrate-to-firebase.ts` import với algorithm `BCRYPT`
- **Ảnh hưởng**: Nếu chạy migration với seed data hiện tại, user không thể đăng nhập vì hash algorithm không khớp
- **Khắc phục**: Sửa seed.ts dùng bcrypt hoặc sửa migration script detect hash algorithm

### Issue 3: [LOW] Login form pre-fill credentials
- **Mô tả**: Trang login pre-fill `admin@hrlite.com` / `Admin@123456` — credentials không hoạt động với Firebase
- **Ảnh hưởng**: UX confusing cho developer mới
- **Khắc phục**: Xóa pre-fill hoặc cập nhật sau khi migration hoàn tất

---

## Thống kê tổng hợp

| Metric | Giá trị |
|--------|---------|
| Tổng test cases thực hiện | 15 |
| PASS | 14 (93%) |
| FAIL | 0 |
| BLOCKED | 1 (7%) |
| Console errors (unexpected) | 0 |
| Network failures (unexpected) | 0 |
| Issues phát hiện | 3 |

---

## Kết luận

Firebase Auth migration cho Sprint 4 **hoạt động tốt** ở mức chức năng core:
- Sign Up → Login → Dashboard → Logout flow hoàn chỉnh
- Session cookie management đúng
- Client-side validation (Zod + Firebase) hoạt động
- Phân quyền role-based access control đúng
- Withdrawal UI components hoạt động
- Responsive layout không bị vỡ

**Blocker chính**: Cần chạy migration script và sửa hash algorithm incompatibility trước khi release.
