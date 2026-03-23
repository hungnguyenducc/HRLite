# Sprint 1 - Integration Test Cases (Browser E2E)

> Ngày tạo: 2026-03-23
> Phạm vi: Module Xác thực (Auth) - Kiểm tra trên trình duyệt thực

---

## TC-001: Trang chủ redirect
- **Điều kiện tiên quyết**: Chưa đăng nhập
- **Bước thực hiện**:
  1. Truy cập http://localhost:3002/
- **Kết quả mong đợi**: Trang chủ hiển thị hoặc redirect đến /login
- **Phương pháp xác minh**: snapshot

## TC-002: Trang đăng nhập - Hiển thị
- **Điều kiện tiên quyết**: Không
- **Bước thực hiện**:
  1. Truy cập http://localhost:3002/login
- **Kết quả mong đợi**: Hiển thị form với trường Email, Mật khẩu, nút "Đăng nhập", link "Đăng ký ngay"
- **Phương pháp xác minh**: snapshot

## TC-003: Trang đăng nhập - Validation trống
- **Điều kiện tiên quyết**: Đang ở trang /login
- **Bước thực hiện**:
  1. Không nhập gì, click "Đăng nhập"
- **Kết quả mong đợi**: Hiển thị lỗi validation cho email và mật khẩu
- **Phương pháp xác minh**: snapshot

## TC-004: Trang đăng nhập - Email sai định dạng
- **Điều kiện tiên quyết**: Đang ở trang /login
- **Bước thực hiện**:
  1. Nhập email: "invalid-email"
  2. Nhập mật khẩu: "123456"
  3. Click "Đăng nhập"
- **Kết quả mong đợi**: Hiển thị lỗi "Email không hợp lệ"
- **Phương pháp xác minh**: snapshot

## TC-005: Trang đăng nhập - Đăng nhập sai
- **Điều kiện tiên quyết**: Đang ở trang /login
- **Bước thực hiện**:
  1. Nhập email: "wrong@test.com"
  2. Nhập mật khẩu: "wrongpassword"
  3. Click "Đăng nhập"
- **Kết quả mong đợi**: Hiển thị thông báo lỗi xác thực
- **Phương pháp xác minh**: snapshot + network

## TC-006: Trang đăng nhập - Đăng nhập thành công (Admin)
- **Điều kiện tiên quyết**: Tài khoản admin@hrlite.com đã seed
- **Bước thực hiện**:
  1. Nhập email: "admin@hrlite.com"
  2. Nhập mật khẩu: "Admin123!@#"
  3. Click "Đăng nhập"
- **Kết quả mong đợi**: Redirect đến /dashboard, hiển thị dashboard với tên user
- **Phương pháp xác minh**: snapshot + network

## TC-007: Trang đăng ký - Hiển thị
- **Điều kiện tiên quyết**: Không
- **Bước thực hiện**:
  1. Truy cập http://localhost:3002/signup
- **Kết quả mong đợi**: Hiển thị form đăng ký với các trường: Họ tên, Email, Mật khẩu, Xác nhận MK, Điều khoản
- **Phương pháp xác minh**: snapshot

## TC-008: Trang đăng ký - Validation
- **Điều kiện tiên quyết**: Đang ở trang /signup
- **Bước thực hiện**:
  1. Không nhập gì, click "Đăng ký"
- **Kết quả mong đợi**: Hiển thị lỗi validation cho các trường bắt buộc
- **Phương pháp xác minh**: snapshot

## TC-009: Dashboard - Hiển thị sau đăng nhập
- **Điều kiện tiên quyết**: Đã đăng nhập thành công (TC-006)
- **Bước thực hiện**:
  1. Xác nhận đang ở trang /dashboard
- **Kết quả mong đợi**: Hiển thị thống kê (Tổng nhân viên, Đang làm việc, Nghỉ phép, Phòng ban), sidebar, header
- **Phương pháp xác minh**: snapshot + network

## TC-010: Dashboard - Sidebar navigation
- **Điều kiện tiên quyết**: Đã đăng nhập, đang ở /dashboard
- **Bước thực hiện**:
  1. Kiểm tra sidebar có đủ menu: Dashboard, Nhân viên, Phòng ban, Chấm công, Nghỉ phép, Báo cáo
  2. Admin user: kiểm tra có menu "Cài đặt"
- **Kết quả mong đợi**: Tất cả menu items hiển thị đúng
- **Phương pháp xác minh**: snapshot

## TC-011: Trang hồ sơ cá nhân
- **Điều kiện tiên quyết**: Đã đăng nhập
- **Bước thực hiện**:
  1. Navigate đến /profile
- **Kết quả mong đợi**: Hiển thị 3 tab (Thông tin cá nhân, Bảo mật, Điều khoản), avatar, tên, email
- **Phương pháp xác minh**: snapshot + network

## TC-012: Quản lý người dùng (Admin)
- **Điều kiện tiên quyết**: Đã đăng nhập với tài khoản ADMIN
- **Bước thực hiện**:
  1. Navigate đến /admin/users
- **Kết quả mong đợi**: Hiển thị bảng danh sách user với cột: Tên, Email, Vai trò, Trạng thái, Ngày tạo
- **Phương pháp xác minh**: snapshot + network

## TC-013: Quản lý điều khoản (Admin)
- **Điều kiện tiên quyết**: Đã đăng nhập với tài khoản ADMIN
- **Bước thực hiện**:
  1. Navigate đến /admin/terms
- **Kết quả mong đợi**: Hiển thị bảng điều khoản với nút "Thêm điều khoản"
- **Phương pháp xác minh**: snapshot + network

## TC-014: Đăng xuất
- **Điều kiện tiên quyết**: Đã đăng nhập
- **Bước thực hiện**:
  1. Click vào user dropdown ở header
  2. Click "Đăng xuất"
- **Kết quả mong đợi**: Redirect về trang /login
- **Phương pháp xác minh**: snapshot + network

## TC-015: Auth Guard - Truy cập trang yêu cầu đăng nhập
- **Điều kiện tiên quyết**: Chưa đăng nhập (đã đăng xuất)
- **Bước thực hiện**:
  1. Truy cập http://localhost:3002/dashboard
- **Kết quả mong đợi**: Redirect về /login
- **Phương pháp xác minh**: snapshot

## TC-016: Responsive - Trang đăng nhập trên Mobile
- **Điều kiện tiên quyết**: Không
- **Bước thực hiện**:
  1. Resize viewport 375x667
  2. Truy cập /login
- **Kết quả mong đợi**: Layout hiển thị đúng, không bị vỡ, panel trái ẩn
- **Phương pháp xác minh**: snapshot

## TC-017: Responsive - Dashboard trên Tablet
- **Điều kiện tiên quyết**: Đã đăng nhập
- **Bước thực hiện**:
  1. Resize viewport 768x1024
  2. Truy cập /dashboard
- **Kết quả mong đợi**: Layout responsive phù hợp, sidebar có thể thu gọn
- **Phương pháp xác minh**: snapshot

## TC-018: Console Error Check
- **Điều kiện tiên quyết**: Tất cả trang đã được truy cập
- **Bước thực hiện**:
  1. Kiểm tra console messages trên mỗi trang
- **Kết quả mong đợi**: Không có lỗi JavaScript nào trong console
- **Phương pháp xác minh**: console

## TC-019: Network Error Check
- **Điều kiện tiên quyết**: Tất cả trang đã được truy cập
- **Bước thực hiện**:
  1. Kiểm tra network requests trên mỗi trang
- **Kết quả mong đợi**: Không có request thất bại (4xx, 5xx) ngoại trừ lỗi expected
- **Phương pháp xác minh**: network

## TC-020: API Health Check
- **Điều kiện tiên quyết**: Server đang chạy
- **Bước thực hiện**:
  1. Gọi GET /api/health
- **Kết quả mong đợi**: Response 200 với { status: "ok" }
- **Phương pháp xác minh**: network
