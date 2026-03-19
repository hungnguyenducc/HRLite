# Test Cases: Auth UI

| Thông tin | Chi tiết |
|-----------|---------|
| **Module** | Auth UI (Login, Signup, Profile, Admin pages) |
| **Sprint** | Sprint 1 |
| **Blueprint** | `docs/blueprints/001-auth/` |
| **Ngày tạo** | 2026-03-19 |
| **Trạng thái** | Chưa triển khai — tài liệu kịch bản dự kiến |

---

## Mục lục

- [1. Trang đăng nhập](#1-trang-đăng-nhập)
- [2. Trang đăng ký](#2-trang-đăng-ký)
- [3. Trang hồ sơ cá nhân](#3-trang-hồ-sơ-cá-nhân)
- [4. Trang quản trị người dùng](#4-trang-quản-trị-người-dùng)
- [5. Trang quản trị điều khoản](#5-trang-quản-trị-điều-khoản)
- [Bảng tổng hợp](#bảng-tổng-hợp)

---

## 1. Trang đăng nhập

### Happy Path

### TC-UI-001: Hiển thị form đăng nhập đúng cấu trúc

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Người dùng truy cập trang `/login`

**When** (Hành động):
- Trang được tải hoàn tất

**Then** (Kết quả mong đợi):
- Hiển thị trường nhập email, mật khẩu
- Hiển thị nút "Đăng nhập"
- Hiển thị liên kết đến trang đăng ký

---

### TC-UI-002: Đăng nhập thành công và chuyển hướng

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng ký với email và mật khẩu hợp lệ

**When** (Hành động):
- Nhập email, mật khẩu đúng và nhấn "Đăng nhập"

**Then** (Kết quả mong đợi):
- Chuyển hướng đến trang dashboard `/`
- Cookies `access_token` và `refresh_token` được thiết lập

---

### Validation

### TC-UI-003: Hiển thị lỗi khi email hoặc mật khẩu sai

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User ở trang đăng nhập

**When** (Hành động):
- Nhập email hoặc mật khẩu sai và nhấn "Đăng nhập"

**Then** (Kết quả mong đợi):
- Hiển thị thông báo lỗi "Email hoặc mật khẩu không chính xác"
- Không chuyển hướng

---

### TC-UI-004: Hiển thị lỗi validation phía client khi email rỗng

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- User ở trang đăng nhập

**When** (Hành động):
- Để trống email và nhấn "Đăng nhập"

**Then** (Kết quả mong đợi):
- Hiển thị thông báo validation cho trường email
- Không gửi request đến server

---

### Edge Cases

### TC-UI-005: Hiển thị điều khoản chờ đồng ý sau đăng nhập

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đăng nhập thành công nhưng có pendingTerms

**When** (Hành động):
- Đăng nhập thành công

**Then** (Kết quả mong đợi):
- Hiển thị dialog/trang yêu cầu đồng ý điều khoản mới
- Không cho phép truy cập chức năng khác cho đến khi đồng ý

---

### TC-UI-006: Hiển thị thông báo khi tài khoản bị vô hiệu hóa

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Tài khoản user có `sttsCd='SUSPENDED'`

**When** (Hành động):
- Nhập email, mật khẩu đúng và nhấn "Đăng nhập"

**Then** (Kết quả mong đợi):
- Hiển thị thông báo "Tài khoản đã bị vô hiệu hóa"

---

## 2. Trang đăng ký

### Happy Path

### TC-UI-007: Hiển thị form đăng ký đúng cấu trúc

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Người dùng truy cập trang `/signup`

**When** (Hành động):
- Trang được tải hoàn tất

**Then** (Kết quả mong đợi):
- Hiển thị trường email, mật khẩu, tên hiển thị (tùy chọn)
- Hiển thị danh sách điều khoản cần đồng ý (lấy từ API `/api/terms/active`)
- Hiển thị nút "Đăng ký"

---

### TC-UI-008: Đăng ký thành công và chuyển hướng

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Điền đầy đủ thông tin hợp lệ, đồng ý tất cả điều khoản bắt buộc

**When** (Hành động):
- Nhấn "Đăng ký"

**Then** (Kết quả mong đợi):
- Chuyển hướng đến trang dashboard
- Cookies được thiết lập

---

### Validation

### TC-UI-009: Hiển thị lỗi khi mật khẩu không đủ mạnh

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User ở trang đăng ký

**When** (Hành động):
- Nhập mật khẩu không đủ 8 ký tự hoặc thiếu chữ hoa/thường/số

**Then** (Kết quả mong đợi):
- Hiển thị thông báo lỗi validation tương ứng (realtime hoặc khi submit)

---

### TC-UI-010: Hiển thị lỗi khi chưa đồng ý điều khoản bắt buộc

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Điền đầy đủ thông tin nhưng chưa chọn checkbox điều khoản bắt buộc

**When** (Hành động):
- Nhấn "Đăng ký"

**Then** (Kết quả mong đợi):
- Hiển thị thông báo yêu cầu đồng ý điều khoản bắt buộc

---

### TC-UI-011: Hiển thị lỗi khi email đã tồn tại

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Email đã được đăng ký trước đó

**When** (Hành động):
- Điền form với email đã tồn tại và nhấn "Đăng ký"

**Then** (Kết quả mong đợi):
- Hiển thị thông báo "Email đã được sử dụng"

---

## 3. Trang hồ sơ cá nhân

### Happy Path

### TC-UI-012: Hiển thị thông tin hồ sơ cá nhân

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập

**When** (Hành động):
- Truy cập trang `/profile`

**Then** (Kết quả mong đợi):
- Hiển thị email, tên hiển thị, số điện thoại, ảnh đại diện
- Không hiển thị mật khẩu

---

### TC-UI-013: Cập nhật hồ sơ thành công

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập, ở trang profile

**When** (Hành động):
- Thay đổi tên hiển thị và nhấn "Lưu"

**Then** (Kết quả mong đợi):
- Hiển thị thông báo cập nhật thành công
- Dữ liệu trên trang được cập nhật

---

### TC-UI-014: Xóa tài khoản với xác nhận

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập, ở trang profile

**When** (Hành động):
- Nhấn "Xóa tài khoản" → Xác nhận trong dialog

**Then** (Kết quả mong đợi):
- Tài khoản bị soft-delete
- Chuyển hướng về trang đăng nhập
- Cookies bị xóa

---

### Security

### TC-UI-015: Chuyển hướng về login khi chưa đăng nhập

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Người dùng chưa đăng nhập

**When** (Hành động):
- Truy cập trang `/profile`

**Then** (Kết quả mong đợi):
- Chuyển hướng về trang `/login`

---

## 4. Trang quản trị người dùng

### Happy Path

### TC-UI-016: Admin xem danh sách người dùng

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập bằng tài khoản ADMIN

**When** (Hành động):
- Truy cập trang quản trị người dùng

**Then** (Kết quả mong đợi):
- Hiển thị bảng danh sách user với phân trang
- Có ô tìm kiếm, bộ lọc theo role và status

---

### TC-UI-017: Admin thay đổi role người dùng

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, xem danh sách user

**When** (Hành động):
- Chọn user, thay đổi role thành ADMIN

**Then** (Kết quả mong đợi):
- Role được cập nhật, hiển thị thông báo thành công

---

### TC-UI-018: Admin vô hiệu hóa tài khoản người dùng

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, xem danh sách user

**When** (Hành động):
- Chọn user, thay đổi status thành SUSPENDED

**Then** (Kết quả mong đợi):
- Status được cập nhật, hiển thị thông báo thành công

---

### Security

### TC-UI-019: Từ chối truy cập trang admin khi không phải ADMIN

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập bằng tài khoản USER thường

**When** (Hành động):
- Truy cập trang quản trị người dùng

**Then** (Kết quả mong đợi):
- Hiển thị trang 403 hoặc chuyển hướng về trang chủ

---

## 5. Trang quản trị điều khoản

### Happy Path

### TC-UI-020: Admin xem danh sách điều khoản

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN

**When** (Hành động):
- Truy cập trang quản trị điều khoản

**Then** (Kết quả mong đợi):
- Hiển thị tất cả điều khoản bao gồm cả inactive
- Phân biệt trạng thái active/inactive bằng visual indicator

---

### TC-UI-021: Admin tạo điều khoản mới

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, ở trang quản trị điều khoản

**When** (Hành động):
- Nhấn "Tạo mới", điền đầy đủ thông tin, nhấn "Lưu"

**Then** (Kết quả mong đợi):
- Điều khoản mới xuất hiện trong danh sách
- Hiển thị thông báo tạo thành công

---

### TC-UI-022: Admin chỉnh sửa điều khoản

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, điều khoản tồn tại

**When** (Hành động):
- Chọn điều khoản, sửa title/content, nhấn "Lưu"

**Then** (Kết quả mong đợi):
- Thông tin được cập nhật, hiển thị thông báo thành công

---

### TC-UI-023: Admin vô hiệu hóa điều khoản

**Loại**: UI (E2E)
**File test**: Chưa triển khai
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, điều khoản đang active

**When** (Hành động):
- Nhấn "Xóa/Vô hiệu hóa" điều khoản → Xác nhận

**Then** (Kết quả mong đợi):
- Điều khoản chuyển sang trạng thái inactive
- Hiển thị thông báo thành công

---

## Bảng tổng hợp

| Nhóm | Số test case | Trạng thái |
|------|-------------|------------|
| Trang đăng nhập | 6 | Chưa triển khai |
| Trang đăng ký | 5 | Chưa triển khai |
| Trang hồ sơ cá nhân | 4 | Chưa triển khai |
| Trang quản trị người dùng | 4 | Chưa triển khai |
| Trang quản trị điều khoản | 4 | Chưa triển khai |
| **Tổng cộng** | **23** | **Chưa triển khai** |
