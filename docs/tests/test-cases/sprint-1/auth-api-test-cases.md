# Test Cases: Auth API

| Thông tin | Chi tiết |
|-----------|---------|
| **Module** | Auth API (Signup, Login, Refresh, Logout, Middleware) |
| **Sprint** | Sprint 1 |
| **Blueprint** | `docs/blueprints/001-auth/` |
| **Ngày tạo** | 2026-03-19 |

---

## Mục lục

- [1. Signup API](#1-signup-api)
- [2. Login API](#2-login-api)
- [3. Refresh Token API](#3-refresh-token-api)
- [4. Logout API](#4-logout-api)
- [5. Auth Middleware](#5-auth-middleware)
- [Bảng tổng hợp](#bảng-tổng-hợp)

---

## 1. Signup API

### Happy Path

### TC-AUTH-001: Đăng ký thành công với dữ liệu hợp lệ

**Loại**: Integration
**File test**: `src/tests/integration/auth/signup.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Database đã seed terms (điều khoản bắt buộc TOS, Privacy)
- Email chưa tồn tại trong hệ thống

**When** (Hành động):
- Gửi POST `/api/auth/signup` với email, password hợp lệ, displayName, agreedTermsIds chứa ID của TOS và Privacy

**Then** (Kết quả mong đợi):
- Status 201
- Body chứa `user.email`, `user.displayName`, `user.roleCd='USER'`, `accessToken`, `refreshToken`
- Cookies `access_token` và `refresh_token` được thiết lập
- User được tạo trong DB
- 2 bản ghi UserAgreement với `agreYn='Y'` được tạo
- RefreshToken được lưu trong DB với `dscdDt=null`

---

### Validation

### TC-AUTH-002: Từ chối đăng ký khi email không hợp lệ

**Loại**: Integration
**File test**: `src/tests/integration/auth/signup.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Database đã seed terms

**When** (Hành động):
- Gửi POST `/api/auth/signup` với `email: 'not-an-email'`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`, error chứa "email"

---

### TC-AUTH-003: Từ chối đăng ký khi mật khẩu yếu

**Loại**: Integration
**File test**: `src/tests/integration/auth/signup.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Database đã seed terms

**When** (Hành động):
- Gửi POST `/api/auth/signup` với `password: 'weak'`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`

---

### TC-AUTH-004: Từ chối đăng ký khi agreedTermsIds rỗng

**Loại**: Integration
**File test**: `src/tests/integration/auth/signup.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Database đã seed terms

**When** (Hành động):
- Gửi POST `/api/auth/signup` với `agreedTermsIds: []`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`

---

### Error Handling

### TC-AUTH-005: Từ chối đăng ký khi email đã tồn tại

**Loại**: Integration
**File test**: `src/tests/integration/auth/signup.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User với email đã được đăng ký trước đó

**When** (Hành động):
- Gửi POST `/api/auth/signup` với cùng email (IP khác)

**Then** (Kết quả mong đợi):
- Status 409, error chứa "Email đã được sử dụng"

---

### TC-AUTH-006: Từ chối khi chỉ đồng ý điều khoản tùy chọn mà thiếu bắt buộc

**Loại**: Integration
**File test**: `src/tests/integration/auth/signup.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Database có điều khoản bắt buộc (TOS, Privacy) và tùy chọn (Optional)

**When** (Hành động):
- Gửi POST `/api/auth/signup` với `agreedTermsIds` chỉ chứa ID điều khoản tùy chọn

**Then** (Kết quả mong đợi):
- Status 400, error chứa "điều khoản bắt buộc"

---

### TC-AUTH-007: Từ chối khi agreedTermsIds chứa ID không tồn tại

**Loại**: Integration
**File test**: `src/tests/integration/auth/signup.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Database đã seed terms, có UUID giả không tồn tại trong DB

**When** (Hành động):
- Gửi POST `/api/auth/signup` với agreedTermsIds chứa ID giả

**Then** (Kết quả mong đợi):
- Status 400, error chứa "không hợp lệ hoặc không còn hiệu lực"

---

### Security

### TC-AUTH-008: Rate limit signup (tối đa 3 request/window)

**Loại**: Integration
**File test**: `src/tests/integration/auth/signup.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đã gửi 3 request signup từ cùng IP

**When** (Hành động):
- Gửi request signup thứ 4 từ cùng IP

**Then** (Kết quả mong đợi):
- Status 429, error chứa "Quá nhiều yêu cầu"

---

## 2. Login API

### Happy Path

### TC-AUTH-009: Đăng nhập thành công

**Loại**: Integration
**File test**: `src/tests/integration/auth/login.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng ký, đã đồng ý tất cả điều khoản bắt buộc

**When** (Hành động):
- Gửi POST `/api/auth/login` với email và password đúng

**Then** (Kết quả mong đợi):
- Status 200, body chứa `user.email`, `user.id`, `accessToken`, `refreshToken`
- `pendingTerms` không tồn tại
- Cookies `access_token`, `refresh_token` được thiết lập
- `lastLoginDt` được cập nhật trong DB

---

### TC-AUTH-010: Đăng nhập trả về pendingTerms khi chưa đồng ý điều khoản mới

**Loại**: Integration
**File test**: `src/tests/integration/auth/login.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng ký nhưng chưa tạo UserAgreement cho required terms

**When** (Hành động):
- Gửi POST `/api/auth/login` với thông tin xác thực đúng

**Then** (Kết quả mong đợi):
- Status 200, `pendingTerms` chứa 2 điều khoản bắt buộc (TOS, Privacy)

---

### Error Handling

### TC-AUTH-011: Từ chối đăng nhập khi email sai

**Loại**: Integration
**File test**: `src/tests/integration/auth/login.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Email không tồn tại trong hệ thống

**When** (Hành động):
- Gửi POST `/api/auth/login`

**Then** (Kết quả mong đợi):
- Status 401, error chứa "Email hoặc mật khẩu không chính xác"

---

### TC-AUTH-012: Từ chối đăng nhập khi mật khẩu sai

**Loại**: Integration
**File test**: `src/tests/integration/auth/login.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User tồn tại trong hệ thống

**When** (Hành động):
- Gửi POST `/api/auth/login` với mật khẩu sai

**Then** (Kết quả mong đợi):
- Status 401, error chứa "Email hoặc mật khẩu không chính xác"

---

### TC-AUTH-013: Từ chối đăng nhập khi user đã bị xóa (delYn=Y)

**Loại**: Integration
**File test**: `src/tests/integration/auth/login.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User có `delYn='Y'` trong DB

**When** (Hành động):
- Gửi POST `/api/auth/login` với thông tin đúng

**Then** (Kết quả mong đợi):
- Status 401, error chứa "Tài khoản đã bị xóa"

---

### TC-AUTH-014: Từ chối đăng nhập khi user bị vô hiệu hóa (SUSPENDED)

**Loại**: Integration
**File test**: `src/tests/integration/auth/login.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User có `sttsCd='SUSPENDED'` trong DB

**When** (Hành động):
- Gửi POST `/api/auth/login` với thông tin đúng

**Then** (Kết quả mong đợi):
- Status 401, error chứa "Tài khoản đã bị vô hiệu hóa"

---

### Security

### TC-AUTH-015: Rate limit login (tối đa 5 request/window)

**Loại**: Integration
**File test**: `src/tests/integration/auth/login.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đã gửi 5 request login từ cùng IP

**When** (Hành động):
- Gửi request login thứ 6 từ cùng IP

**Then** (Kết quả mong đợi):
- Status 429, error chứa "Quá nhiều yêu cầu"

---

## 3. Refresh Token API

### Happy Path

### TC-AUTH-016: Làm mới token thành công qua cookie

**Loại**: Integration
**File test**: `src/tests/integration/auth/refresh.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Refresh token hợp lệ được lưu trong DB và cookie

**When** (Hành động):
- Gửi POST `/api/auth/refresh` với cookie `refresh_token`

**Then** (Kết quả mong đợi):
- Status 200, body chứa `accessToken` và `refreshToken` mới (khác token cũ)
- Cookies được cập nhật
- Token cũ bị discard trong DB (`dscdDt` != null)
- Token mới được lưu trong DB (`dscdDt` = null)

---

### Security

### TC-AUTH-017: Phát hiện tấn công token reuse — thu hồi tất cả token

**Loại**: Integration
**File test**: `src/tests/integration/auth/refresh.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Refresh token đã bị discard (mô phỏng bị đánh cắp và đã sử dụng)
- Còn token hợp lệ khác của cùng user

**When** (Hành động):
- Gửi POST `/api/auth/refresh` với token đã bị discard

**Then** (Kết quả mong đợi):
- Status 401, error chứa "đã bị thu hồi"
- Tất cả refresh token của user đều bị discard trong DB

---

### Error Handling

### TC-AUTH-018: Từ chối khi JWT không hợp lệ

**Loại**: Integration
**File test**: `src/tests/integration/auth/refresh.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Cookie chứa chuỗi JWT không hợp lệ

**When** (Hành động):
- Gửi POST `/api/auth/refresh`

**Then** (Kết quả mong đợi):
- Status 401, error chứa "không hợp lệ"

---

### TC-AUTH-019: Từ chối khi dùng access token thay refresh token

**Loại**: Integration
**File test**: `src/tests/integration/auth/refresh.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Cookie chứa access token thay vì refresh token

**When** (Hành động):
- Gửi POST `/api/auth/refresh`

**Then** (Kết quả mong đợi):
- Status 401, `success: false`

---

### TC-AUTH-020: Trả về 400 khi không cung cấp token

**Loại**: Integration
**File test**: `src/tests/integration/auth/refresh.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Request không có cookie refresh_token

**When** (Hành động):
- Gửi POST `/api/auth/refresh`

**Then** (Kết quả mong đợi):
- Status 400, error chứa "không được cung cấp"

---

### TC-AUTH-021: Từ chối refresh khi user bị vô hiệu hóa sau khi token được tạo

**Loại**: Integration
**File test**: `src/tests/integration/auth/refresh.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Refresh token hợp lệ đã được tạo, sau đó user bị set `sttsCd='SUSPENDED'`

**When** (Hành động):
- Gửi POST `/api/auth/refresh`

**Then** (Kết quả mong đợi):
- Status 401, error chứa "Tài khoản không hợp lệ"

---

## 4. Logout API

### Happy Path

### TC-AUTH-022: Đăng xuất thành công với access_token và refresh_token

**Loại**: Integration
**File test**: `src/tests/integration/auth/logout.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập, có access_token và refresh_token trong cookie

**When** (Hành động):
- Gửi POST `/api/auth/logout`

**Then** (Kết quả mong đợi):
- Status 200, message chứa "Đăng xuất thành công"
- Cookies `access_token` và `refresh_token` bị xóa (Max-Age=0)
- Refresh token bị discard trong DB

---

### TC-AUTH-023: Đăng xuất thành công chỉ với access_token

**Loại**: Integration
**File test**: `src/tests/integration/auth/logout.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- User có access_token nhưng không có refresh_token

**When** (Hành động):
- Gửi POST `/api/auth/logout`

**Then** (Kết quả mong đợi):
- Status 200, message chứa "Đăng xuất thành công"

---

### Error Handling

### TC-AUTH-024: Từ chối đăng xuất khi không có access token

**Loại**: Integration
**File test**: `src/tests/integration/auth/logout.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Request không có cookie access_token

**When** (Hành động):
- Gửi POST `/api/auth/logout`

**Then** (Kết quả mong đợi):
- Status 401, error chứa "Chưa xác thực"

---

## 5. Auth Middleware

### Happy Path

### TC-AUTH-025: withAuth cho phép handler khi Bearer token hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/middleware.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Request có header `Authorization: Bearer <valid-token>`
- `verifyAccessToken` trả về payload hợp lệ

**When** (Hành động):
- Gọi handler được bọc bởi `withAuth`

**Then** (Kết quả mong đợi):
- Handler được gọi với `req.user` chứa payload
- Response có `success: true` và `userId`

---

### TC-AUTH-026: withAuth cho phép handler khi cookie token hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/middleware.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Request có cookie `access_token` hợp lệ

**When** (Hành động):
- Gọi handler được bọc bởi `withAuth`

**Then** (Kết quả mong đợi):
- Handler được gọi với payload từ cookie token

---

### TC-AUTH-027: withRole cho phép handler khi role phù hợp

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/middleware.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User có role `'admin'`, danh sách role cho phép `['admin', 'hr_manager']`

**When** (Hành động):
- Gọi handler được bọc bởi `withRole(['admin', 'hr_manager'])`

**Then** (Kết quả mong đợi):
- Status 200, handler được gọi

---

### Error Handling

### TC-AUTH-028: withAuth trả về 401 khi không có token

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/middleware.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Request không có Authorization header và không có cookie

**When** (Hành động):
- Gọi handler được bọc bởi `withAuth`

**Then** (Kết quả mong đợi):
- Status 401, error chứa "xác thực", handler không được gọi

---

### TC-AUTH-029: withAuth trả về 401 khi token không hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/middleware.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- `verifyAccessToken` trả về `null`

**When** (Hành động):
- Gọi handler được bọc bởi `withAuth`

**Then** (Kết quả mong đợi):
- Status 401, error chứa "Token", handler không được gọi

---

### TC-AUTH-030: withRole trả về 403 khi role không phù hợp

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/middleware.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User có role `'admin'`, danh sách role cho phép `['hr_manager']`

**When** (Hành động):
- Gọi handler được bọc bởi `withRole(['hr_manager'])`

**Then** (Kết quả mong đợi):
- Status 403, error chứa "quyền", handler không được gọi

---

### TC-AUTH-031: withRole trả về 401 trước khi kiểm tra role khi không có token

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/middleware.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Request không có token

**When** (Hành động):
- Gọi handler được bọc bởi `withRole(['admin'])`

**Then** (Kết quả mong đợi):
- Status 401, `verifyAccessToken` không được gọi

---

### TC-AUTH-032: withRole trả về 401 khi token không hợp lệ trước khi kiểm tra role

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/middleware.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Token không hợp lệ, `verifyAccessToken` trả về `null`

**When** (Hành động):
- Gọi handler được bọc bởi `withRole(['admin'])`

**Then** (Kết quả mong đợi):
- Status 401, handler không được gọi

---

## Bảng tổng hợp

| Nhóm | Số test case | File test |
|------|-------------|-----------|
| Signup API | 8 | `src/tests/integration/auth/signup.test.ts` |
| Login API | 7 | `src/tests/integration/auth/login.test.ts` |
| Refresh Token API | 6 | `src/tests/integration/auth/refresh.test.ts` |
| Logout API | 3 | `src/tests/integration/auth/logout.test.ts` |
| Auth Middleware | 8 | `src/tests/unit/lib/auth/middleware.test.ts` |
| **Tổng cộng** | **32** | |
