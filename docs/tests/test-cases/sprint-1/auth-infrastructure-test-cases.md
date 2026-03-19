# Test Cases: Auth Infrastructure

| Thông tin | Chi tiết |
|-----------|---------|
| **Module** | Auth Infrastructure (JWT, Password, Validation, API Response, Errors) |
| **Sprint** | Sprint 1 |
| **Blueprint** | `docs/blueprints/001-auth/` |
| **Ngày tạo** | 2026-03-19 |

---

## Mục lục

- [1. JWT Token](#1-jwt-token)
- [2. Password Hashing](#2-password-hashing)
- [3. Validation Schema](#3-validation-schema)
- [4. API Response Helper](#4-api-response-helper)
- [5. Error Classes](#5-error-classes)
- [Bảng tổng hợp](#bảng-tổng-hợp)

---

## 1. JWT Token

### Happy Path

### TC-INF-001: Tạo access token hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Payload chứa sub, email, role hợp lệ

**When** (Hành động):
- Gọi `generateAccessToken(payload)`

**Then** (Kết quả mong đợi):
- Trả về chuỗi string có 3 phần phân cách bởi dấu `.` (format JWT)

---

### TC-INF-002: Tạo refresh token hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Payload chứa sub, email, role hợp lệ

**When** (Hành động):
- Gọi `generateRefreshToken(payload)`

**Then** (Kết quả mong đợi):
- Trả về chuỗi string có 3 phần phân cách bởi dấu `.` (format JWT)

---

### TC-INF-003: Xác minh access token hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Access token được tạo từ payload hợp lệ

**When** (Hành động):
- Gọi `verifyAccessToken(token)`

**Then** (Kết quả mong đợi):
- Trả về payload chứa sub, email, role, type='access', iat, exp

---

### TC-INF-004: Xác minh refresh token hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Refresh token được tạo từ payload hợp lệ

**When** (Hành động):
- Gọi `verifyRefreshToken(token)`

**Then** (Kết quả mong đợi):
- Trả về payload chứa sub, email, role, type='refresh'

---

### Error Handling

### TC-INF-005: Từ chối refresh token khi dùng verifyAccessToken

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Token được tạo bằng `generateRefreshToken`

**When** (Hành động):
- Gọi `verifyAccessToken(refreshToken)`

**Then** (Kết quả mong đợi):
- Trả về `null`

---

### TC-INF-006: Từ chối access token khi dùng verifyRefreshToken

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Token được tạo bằng `generateAccessToken`

**When** (Hành động):
- Gọi `verifyRefreshToken(accessToken)`

**Then** (Kết quả mong đợi):
- Trả về `null`

---

### TC-INF-007: Từ chối token bị thay đổi

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Access token hợp lệ bị thay đổi 5 ký tự cuối

**When** (Hành động):
- Gọi `verifyAccessToken(tamperedToken)`

**Then** (Kết quả mong đợi):
- Trả về `null`

---

### TC-INF-008: Từ chối token đã hết hạn

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Token được tạo với thời gian hết hạn 0 giây, đợi 1.1 giây

**When** (Hành động):
- Gọi `verifyAccessToken(expiredToken)`

**Then** (Kết quả mong đợi):
- Trả về `null`

---

### Edge Cases

### TC-INF-009: Từ chối token rỗng

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Token là chuỗi rỗng `''`

**When** (Hành động):
- Gọi `verifyAccessToken('')`

**Then** (Kết quả mong đợi):
- Trả về `null`

---

### TC-INF-010: Từ chối token sai format

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Token là chuỗi không phải JWT `'not-a-valid-jwt'`

**When** (Hành động):
- Gọi `verifyAccessToken('not-a-valid-jwt')`

**Then** (Kết quả mong đợi):
- Trả về `null`

---

### TC-INF-011: Hash token trả về chuỗi hex 64 ký tự

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Một giá trị token bất kỳ

**When** (Hành động):
- Gọi `hashToken('some-token-value')`

**Then** (Kết quả mong đợi):
- Trả về chuỗi khớp pattern `/^[0-9a-f]{64}$/`

---

### TC-INF-012: Hash token có tính deterministic

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Cùng một giá trị input

**When** (Hành động):
- Gọi `hashToken` hai lần với cùng giá trị

**Then** (Kết quả mong đợi):
- Hai kết quả trả về giống nhau

---

### TC-INF-013: Hash token khác nhau cho giá trị khác nhau

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/jwt.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Hai giá trị input khác nhau

**When** (Hành động):
- Gọi `hashToken` cho từng giá trị

**Then** (Kết quả mong đợi):
- Hai kết quả trả về khác nhau

---

## 2. Password Hashing

### Happy Path

### TC-INF-014: Hash password trả về giá trị khác password gốc

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/password.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Password `'MyPassword1'`

**When** (Hành động):
- Gọi `hashPassword(password)`

**Then** (Kết quả mong đợi):
- Giá trị hash khác password gốc

---

### TC-INF-015: Hash password có định dạng bcrypt

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/password.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Password hợp lệ

**When** (Hành động):
- Gọi `hashPassword(password)`

**Then** (Kết quả mong đợi):
- Hash bắt đầu với `$2a$` hoặc `$2b$` (bcrypt format) và có độ dài 60 ký tự

---

### TC-INF-016: Cùng password tạo hash khác nhau (do salt)

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/password.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Cùng một password `'SamePassword1'`

**When** (Hành động):
- Gọi `hashPassword` hai lần

**Then** (Kết quả mong đợi):
- Hai hash trả về khác nhau

---

### TC-INF-017: Xác minh password đúng

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/password.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Password đã được hash

**When** (Hành động):
- Gọi `verifyPassword(password, hash)` với password đúng

**Then** (Kết quả mong đợi):
- Trả về `true`

---

### TC-INF-018: Từ chối password sai

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/password.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Hash của password `'OriginalPass1'`

**When** (Hành động):
- Gọi `verifyPassword('WrongPass1', hash)`

**Then** (Kết quả mong đợi):
- Trả về `false`

---

### Edge Cases

### TC-INF-019: Phân biệt chữ hoa/thường trong password

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/password.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Hash của `'Password1'`

**When** (Hành động):
- Gọi `verifyPassword('password1', hash)`

**Then** (Kết quả mong đợi):
- Trả về `false`

---

### TC-INF-020: Xác minh password có ký tự đặc biệt

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/password.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Password `'P@$$w0rd!#%^&*'` đã được hash

**When** (Hành động):
- Gọi `verifyPassword` với cùng password

**Then** (Kết quả mong đợi):
- Trả về `true`

---

### TC-INF-021: Xác minh password có ký tự Unicode

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/password.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Password `'Mật_khẩu_1'` đã được hash

**When** (Hành động):
- Gọi `verifyPassword` với cùng password

**Then** (Kết quả mong đợi):
- Trả về `true`

---

### TC-INF-022: Hash và xác minh password rỗng

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/password.test.ts`
**Ưu tiên**: Thấp

**Given** (Điều kiện tiên quyết):
- Password rỗng `''` đã được hash

**When** (Hành động):
- Gọi `verifyPassword('', hash)`

**Then** (Kết quả mong đợi):
- Trả về `true`

---

### TC-INF-023: Hash password dài (100+ ký tự)

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/password.test.ts`
**Ưu tiên**: Thấp

**Given** (Điều kiện tiên quyết):
- Password dài 102 ký tự

**When** (Hành động):
- Gọi `hashPassword(longPassword)`

**Then** (Kết quả mong đợi):
- Trả về hash có độ dài 60 ký tự (chuẩn bcrypt)

---

## 3. Validation Schema

### Happy Path — signupSchema

### TC-INF-024: Chấp nhận dữ liệu signup hợp lệ đầy đủ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Input có email, password hợp lệ, agreedTermsIds chứa UUID hợp lệ

**When** (Hành động):
- Parse bằng `signupSchema.safeParse(input)`

**Then** (Kết quả mong đợi):
- `result.success` = `true`

---

### TC-INF-025: Chấp nhận signup với displayName tùy chọn

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Input hợp lệ kèm `displayName: 'Nguyen Van A'`

**When** (Hành động):
- Parse bằng `signupSchema.safeParse(input)`

**Then** (Kết quả mong đợi):
- `result.success` = `true`

---

### Validation — signupSchema email

### TC-INF-026: Từ chối email rỗng

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Email là chuỗi rỗng

**When** (Hành động):
- Parse bằng `signupSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `false`

---

### TC-INF-027: Từ chối email thiếu @

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Email `'userexample.com'` (thiếu @)

**When** (Hành động):
- Parse bằng `signupSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `false`

---

### TC-INF-028: Chấp nhận email với subdomain và dấu +

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Email `'user@mail.example.com'` hoặc `'user+tag@example.com'`

**When** (Hành động):
- Parse bằng `signupSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `true`

---

### Validation — signupSchema password

### TC-INF-029: Từ chối password ngắn hơn 8 ký tự

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Password `'Abcde1'` (6 ký tự)

**When** (Hành động):
- Parse bằng `signupSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `false`, thông báo "Mật khẩu phải có ít nhất 8 ký tự"

---

### TC-INF-030: Chấp nhận password đúng 8 ký tự (boundary)

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Password `'Abcdef1x'` (8 ký tự, có chữ hoa, thường, số)

**When** (Hành động):
- Parse bằng `signupSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `true`

---

### TC-INF-031: Từ chối password thiếu chữ hoa/thường/số

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Password chỉ có chữ thường + số, hoặc chỉ chữ hoa + số, hoặc chỉ chữ

**When** (Hành động):
- Parse bằng `signupSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `false`, thông báo lỗi tương ứng

---

### Validation — signupSchema agreedTermsIds

### TC-INF-032: Từ chối agreedTermsIds rỗng

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- `agreedTermsIds: []`

**When** (Hành động):
- Parse bằng `signupSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `false`, thông báo "Phải đồng ý ít nhất một điều khoản"

---

### TC-INF-033: Từ chối UUID không hợp lệ trong agreedTermsIds

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- `agreedTermsIds: ['not-a-uuid']`

**When** (Hành động):
- Parse bằng `signupSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `false`, thông báo "ID điều khoản không hợp lệ"

---

### Validation — loginSchema

### TC-INF-034: Chấp nhận login data hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Email hợp lệ, password bất kỳ (không kiểm tra độ mạnh)

**When** (Hành động):
- Parse bằng `loginSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `true`

---

### TC-INF-035: Từ chối login khi thiếu email hoặc password

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Thiếu email hoặc thiếu password hoặc input rỗng

**When** (Hành động):
- Parse bằng `loginSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `false`

---

### Validation — refreshSchema

### TC-INF-036: Chấp nhận refreshToken hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- `refreshToken: 'some-token-value'`

**When** (Hành động):
- Parse bằng `refreshSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `true`

---

### TC-INF-037: Từ chối refreshToken rỗng hoặc thiếu

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- `refreshToken: ''` hoặc thiếu trường

**When** (Hành động):
- Parse bằng `refreshSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `false`, thông báo "Refresh token không được để trống"

---

### Validation — updateProfileSchema

### TC-INF-038: Chấp nhận object rỗng (tất cả trường optional)

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Input `{}`

**When** (Hành động):
- Parse bằng `updateProfileSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `true`

---

### TC-INF-039: Từ chối photoUrl không hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- `photoUrl: 'not-a-url'`

**When** (Hành động):
- Parse bằng `updateProfileSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `false`, thông báo "URL ảnh không hợp lệ"

---

### Validation — agreeTermsSchema

### TC-INF-040: Chấp nhận mảng UUID hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- `termsIds` chứa 1 hoặc nhiều UUID hợp lệ

**When** (Hành động):
- Parse bằng `agreeTermsSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `true`

---

### TC-INF-041: Từ chối termsIds rỗng hoặc chứa UUID không hợp lệ

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/validation.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- `termsIds: []` hoặc chứa giá trị không phải UUID

**When** (Hành động):
- Parse bằng `agreeTermsSchema`

**Then** (Kết quả mong đợi):
- `result.success` = `false`

---

## 4. API Response Helper

### Happy Path

### TC-INF-042: successResponse trả về đúng format

**Loại**: Unit
**File test**: `src/tests/unit/lib/api-response.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Data object `{ id: 1, name: 'test' }`

**When** (Hành động):
- Gọi `successResponse(data)`

**Then** (Kết quả mong đợi):
- Body: `{ success: true, data: { id: 1, name: 'test' } }`, status 200

---

### TC-INF-043: successResponse với status tùy chỉnh

**Loại**: Unit
**File test**: `src/tests/unit/lib/api-response.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Data object và status 201

**When** (Hành động):
- Gọi `successResponse(data, 201)`

**Then** (Kết quả mong đợi):
- Response có status 201

---

### TC-INF-044: errorResponse trả về đúng format

**Loại**: Unit
**File test**: `src/tests/unit/lib/api-response.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Thông báo lỗi `'Something went wrong'`

**When** (Hành động):
- Gọi `errorResponse('Something went wrong')`

**Then** (Kết quả mong đợi):
- Body: `{ success: false, error: 'Something went wrong' }`, status 400

---

### Edge Cases

### TC-INF-045: successResponse với data là null, mảng rỗng, chuỗi, số

**Loại**: Unit
**File test**: `src/tests/unit/lib/api-response.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Data là `null`, `[]`, `'hello'`, hoặc `42`

**When** (Hành động):
- Gọi `successResponse(data)`

**Then** (Kết quả mong đợi):
- Body có `success: true` và `data` tương ứng

---

## 5. Error Classes

### Happy Path

### TC-INF-046: AppError tạo lỗi với message và statusCode

**Loại**: Unit
**File test**: `src/tests/unit/lib/errors.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Message `'test error'`, statusCode `418`

**When** (Hành động):
- Tạo `new AppError('test error', 418)`

**Then** (Kết quả mong đợi):
- `error.message` = `'test error'`, `error.statusCode` = `418`, kế thừa từ Error

---

### TC-INF-047: Các lớp lỗi con có message mặc định và status đúng

**Loại**: Unit
**File test**: `src/tests/unit/lib/errors.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Khởi tạo các lớp lỗi con không có tham số

**When** (Hành động):
- Tạo `ValidationError()`, `AuthError()`, `ForbiddenError()`, `NotFoundError()`, `ConflictError()`, `RateLimitError()`

**Then** (Kết quả mong đợi):
- ValidationError: status 400, message "Dữ liệu không hợp lệ."
- AuthError: status 401, message "Chưa xác thực. Vui lòng đăng nhập."
- ForbiddenError: status 403, message "Bạn không có quyền truy cập tài nguyên này."
- NotFoundError: status 404, message "Không tìm thấy tài nguyên."
- ConflictError: status 409, message "Dữ liệu bị trùng lặp."
- RateLimitError: status 429, message "Quá nhiều yêu cầu. Vui lòng thử lại sau."

---

### TC-INF-048: handleApiError xử lý đúng theo loại lỗi

**Loại**: Unit
**File test**: `src/tests/unit/lib/errors.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Các loại lỗi khác nhau: AppError, ValidationError, AuthError, v.v.

**When** (Hành động):
- Gọi `handleApiError(error)` cho từng loại

**Then** (Kết quả mong đợi):
- Trả về response với status code tương ứng (400, 401, 403, 404, 409, 429)

---

### Security

### TC-INF-049: Ẩn chi tiết lỗi hệ thống ở production

**Loại**: Unit
**File test**: `src/tests/unit/lib/errors.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- `NODE_ENV = 'production'`, lỗi không phải AppError

**When** (Hành động):
- Gọi `handleApiError(new Error('DB connection failed'))`

**Then** (Kết quả mong đợi):
- Status 500, body chứa "Lỗi hệ thống. Vui lòng thử lại sau." (không lộ chi tiết)

---

### TC-INF-050: Hiển thị chi tiết lỗi ở development

**Loại**: Unit
**File test**: `src/tests/unit/lib/errors.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- `NODE_ENV = 'development'`, lỗi Error instance

**When** (Hành động):
- Gọi `handleApiError(new Error('DB connection failed'))`

**Then** (Kết quả mong đợi):
- Status 500, body chứa "DB connection failed"

---

### TC-INF-051: Xử lý an toàn lỗi null/undefined/không phải Error

**Loại**: Unit
**File test**: `src/tests/unit/lib/errors.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Lỗi là `null`, `undefined`, số, hoặc chuỗi

**When** (Hành động):
- Gọi `handleApiError(error)`

**Then** (Kết quả mong đợi):
- Status 500, body chứa thông báo chung

---

## Bảng tổng hợp

| Nhóm | Số test case | File test |
|------|-------------|-----------|
| JWT Token | 13 | `src/tests/unit/lib/auth/jwt.test.ts` |
| Password Hashing | 10 | `src/tests/unit/lib/auth/password.test.ts` |
| Validation Schema | 18 | `src/tests/unit/lib/auth/validation.test.ts` |
| API Response | 4 | `src/tests/unit/lib/api-response.test.ts` |
| Error Classes | 6 | `src/tests/unit/lib/errors.test.ts` |
| **Tổng cộng** | **51** | |
