# Test Cases: Security & Integration

| Thông tin | Chi tiết |
|-----------|---------|
| **Module** | Rate Limiting, Error Handling, Seed Data |
| **Sprint** | Sprint 1 |
| **Blueprint** | `docs/blueprints/001-auth/` |
| **Ngày tạo** | 2026-03-19 |

---

## Mục lục

- [1. Rate Limiting](#1-rate-limiting)
- [2. Error Handling tập trung](#2-error-handling-tập-trung)
- [3. Seed Data & Cấu hình](#3-seed-data--cấu-hình)
- [Bảng tổng hợp](#bảng-tổng-hợp)

---

## 1. Rate Limiting

### Happy Path

### TC-SEC-001: Cho phép yêu cầu đầu tiên

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/rate-limit.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Chưa có yêu cầu nào từ IP `1.2.3.4`

**When** (Hành động):
- Gọi `checkRateLimit(req, 'login', RATE_LIMITS.login)`

**Then** (Kết quả mong đợi):
- Không ném exception

---

### TC-SEC-002: Cho phép yêu cầu trong giới hạn

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/rate-limit.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Cùng IP, chưa vượt quá `maxRequests` (5 cho login)

**When** (Hành động):
- Gửi đúng số lượng `maxRequests` yêu cầu

**Then** (Kết quả mong đợi):
- Tất cả đều không ném exception

---

### Security

### TC-SEC-003: Ném RateLimitError khi vượt quá giới hạn

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/rate-limit.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đã gửi đúng `maxRequests` yêu cầu từ cùng IP

**When** (Hành động):
- Gửi thêm 1 yêu cầu

**Then** (Kết quả mong đợi):
- Ném `RateLimitError`

---

### TC-SEC-004: Tách riêng bucket theo IP

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/rate-limit.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- IP A đã hết giới hạn (bị rate limit)

**When** (Hành động):
- IP B gửi yêu cầu cùng endpoint

**Then** (Kết quả mong đợi):
- IP B không bị rate limit

---

### TC-SEC-005: Tách riêng bucket theo key (endpoint)

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/rate-limit.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Cùng IP, key `'login'` đã hết giới hạn

**When** (Hành động):
- Gửi yêu cầu với key `'refresh'`

**Then** (Kết quả mong đợi):
- Không bị rate limit (bucket khác)

---

### TC-SEC-006: Tính retryAfter đúng khi bị rate limit

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/rate-limit.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đã hết giới hạn login (window 60s), đã trôi qua 30 giây

**When** (Hành động):
- Gửi thêm 1 yêu cầu

**Then** (Kết quả mong đợi):
- `RateLimitError.retryAfter` khoảng 29-31 giây

---

### TC-SEC-007: Reset window khi hết thời gian

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/rate-limit.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đã hết giới hạn, đợi hết `windowMs` + 1ms

**When** (Hành động):
- Gửi yêu cầu mới

**Then** (Kết quả mong đợi):
- Không bị rate limit (window đã reset)

---

### TC-SEC-008: rateLimitResponse trả về 429 với Retry-After header

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/rate-limit.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- `RateLimitError` với `retryAfter: 45`

**When** (Hành động):
- Gọi `rateLimitResponse(err)`

**Then** (Kết quả mong đợi):
- Status 429, header `Retry-After: 45`

---

### TC-SEC-009: rateLimitResponse dùng giá trị mặc định 60 khi không có retryAfter

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/rate-limit.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- `RateLimitError` không có `retryAfter`

**When** (Hành động):
- Gọi `rateLimitResponse(err)`

**Then** (Kết quả mong đợi):
- Status 429, header `Retry-After: 60`

---

### TC-SEC-010: Cấu hình RATE_LIMITS đúng cho login, signup, refresh

**Loại**: Unit
**File test**: `src/tests/unit/lib/auth/rate-limit.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Hằng số `RATE_LIMITS`

**When** (Hành động):
- Kiểm tra các giá trị cấu hình

**Then** (Kết quả mong đợi):
- `login.maxRequests` = 5
- `signup.maxRequests` = 3
- `refresh.maxRequests` = 10

---

## 2. Error Handling tập trung

### Happy Path

### TC-SEC-011: handleApiError xử lý AppError con đúng status

**Loại**: Unit
**File test**: `src/tests/unit/lib/errors.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Các lỗi: ValidationError(400), AuthError(401), ForbiddenError(403), NotFoundError(404), ConflictError(409), RateLimitError(429)

**When** (Hành động):
- Gọi `handleApiError(error)` cho từng loại

**Then** (Kết quả mong đợi):
- Response trả về status code tương ứng và `{ success: false, error: message }`

---

### Security

### TC-SEC-012: Ẩn chi tiết lỗi hệ thống ở production

**Loại**: Unit
**File test**: `src/tests/unit/lib/errors.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- `NODE_ENV='production'`, lỗi là Error instance (không phải AppError)

**When** (Hành động):
- Gọi `handleApiError(new Error('DB connection failed'))`

**Then** (Kết quả mong đợi):
- Status 500, body: `{ success: false, error: 'Lỗi hệ thống. Vui lòng thử lại sau.' }`
- Không lộ chi tiết lỗi nội bộ

---

### TC-SEC-013: Hiển thị chi tiết lỗi ở development

**Loại**: Unit
**File test**: `src/tests/unit/lib/errors.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- `NODE_ENV='development'`, lỗi là Error instance

**When** (Hành động):
- Gọi `handleApiError(new Error('DB connection failed'))`

**Then** (Kết quả mong đợi):
- Status 500, body chứa message gốc "DB connection failed"

---

### Edge Cases

### TC-SEC-014: Xử lý an toàn khi lỗi là null/undefined/số/chuỗi

**Loại**: Unit
**File test**: `src/tests/unit/lib/errors.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Lỗi truyền vào là `null`, `undefined`, `42`, hoặc `'string error'`

**When** (Hành động):
- Gọi `handleApiError(error)`

**Then** (Kết quả mong đợi):
- Status 500, body chứa thông báo chung, không crash

---

## 3. Seed Data & Cấu hình

### Happy Path

### TC-SEC-015: Rate limit tích hợp signup (3 request/window)

**Loại**: Integration
**File test**: `src/tests/integration/auth/signup.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- DB đã seed terms, gửi 3 request signup từ cùng IP

**When** (Hành động):
- Gửi request signup thứ 4 từ cùng IP

**Then** (Kết quả mong đợi):
- Status 429, error chứa "Quá nhiều yêu cầu"

---

### TC-SEC-016: Rate limit tích hợp login (5 request/window)

**Loại**: Integration
**File test**: `src/tests/integration/auth/login.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- DB đã seed user + terms, gửi 5 request login từ cùng IP

**When** (Hành động):
- Gửi request login thứ 6 từ cùng IP

**Then** (Kết quả mong đợi):
- Status 429, error chứa "Quá nhiều yêu cầu"

---

### TC-SEC-017: Token reuse detection — thu hồi tất cả token

**Loại**: Integration
**File test**: `src/tests/integration/auth/refresh.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Refresh token đã bị discard (bị đánh cắp và đã sử dụng bởi attacker)
- User còn token hợp lệ khác

**When** (Hành động):
- Gửi POST `/api/auth/refresh` với token đã bị discard

**Then** (Kết quả mong đợi):
- Status 401, error chứa "đã bị thu hồi"
- Tất cả refresh token của user đều bị discard (bảo vệ toàn diện)

---

### TC-SEC-018: Từ chối refresh khi user bị vô hiệu hóa sau khi token được cấp

**Loại**: Integration
**File test**: `src/tests/integration/auth/refresh.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Refresh token hợp lệ, sau đó admin set user `sttsCd='SUSPENDED'`

**When** (Hành động):
- Gửi POST `/api/auth/refresh`

**Then** (Kết quả mong đợi):
- Status 401, error chứa "Tài khoản không hợp lệ"

---

### TC-SEC-019: Không lộ password hash trong API response

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập

**When** (Hành động):
- Gửi GET `/api/users/me`

**Then** (Kết quả mong đợi):
- Response không chứa trường `passwdHash` hoặc `password`

---

### TC-SEC-020: Admin không tự thay đổi role của chính mình

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN

**When** (Hành động):
- Gửi PATCH `/api/users/{adminId}` với `{ role: 'USER' }`

**Then** (Kết quả mong đợi):
- Status 400, ngăn chặn tự hạ quyền

---

### TC-SEC-021: Soft-delete user mask email và hủy tất cả session

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập, có refresh token

**When** (Hành động):
- Gửi DELETE `/api/users/me`

**Then** (Kết quả mong đợi):
- Email masked thành `deleted_{userId}@withdrawn.local`
- `delYn='Y'`, `sttsCd='WITHDRAWN'`
- Tất cả refresh token bị discard
- Cookies bị xóa (Max-Age=0)

---

## Bảng tổng hợp

| Nhóm | Số test case | File test |
|------|-------------|-----------|
| Rate Limiting (Unit) | 10 | `src/tests/unit/lib/auth/rate-limit.test.ts` |
| Error Handling (Unit) | 4 | `src/tests/unit/lib/errors.test.ts` |
| Security Integration | 7 | Nhiều file integration test |
| **Tổng cộng** | **21** | |
