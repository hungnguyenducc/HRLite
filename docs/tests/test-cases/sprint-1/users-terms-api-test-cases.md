# Test Cases: Users & Terms API

| Thông tin | Chi tiết |
|-----------|---------|
| **Module** | Users API (Me, Admin) & Terms API (Active, Agree, Pending, Admin CRUD) |
| **Sprint** | Sprint 1 |
| **Blueprint** | `docs/blueprints/001-auth/` |
| **Ngày tạo** | 2026-03-19 |

---

## Mục lục

- [1. GET /api/users/me](#1-get-apiusersme)
- [2. PATCH /api/users/me](#2-patch-apiusersme)
- [3. DELETE /api/users/me](#3-delete-apiusersme)
- [4. GET /api/users (Admin)](#4-get-apiusers-admin)
- [5. PATCH /api/users/[id] (Admin)](#5-patch-apiusersid-admin)
- [6. GET /api/terms/active (Public)](#6-get-apitermsactive-public)
- [7. POST /api/terms/agree](#7-post-apitermsagree)
- [8. GET /api/terms/pending](#8-get-apitermspending)
- [9. Admin Terms CRUD](#9-admin-terms-crud)
- [Bảng tổng hợp](#bảng-tổng-hợp)

---

## 1. GET /api/users/me

### Happy Path

### TC-USR-001: Lấy thông tin profile không chứa password hash

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập với Bearer token hợp lệ

**When** (Hành động):
- Gửi GET `/api/users/me`

**Then** (Kết quả mong đợi):
- Status 200, body chứa id, email, displayName, roleCd, sttsCd
- Không chứa `passwdHash` hoặc `password`

---

### Error Handling

### TC-USR-002: Trả về 401 khi không có token xác thực

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Request không có token

**When** (Hành động):
- Gửi GET `/api/users/me`

**Then** (Kết quả mong đợi):
- Status 401, `success: false`

---

## 2. PATCH /api/users/me

### Happy Path

### TC-USR-003: Cập nhật displayName và phone thành công

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập

**When** (Hành động):
- Gửi PATCH `/api/users/me` với `{ displayName: 'Nguyen Van A', phone: '0901234567' }`

**Then** (Kết quả mong đợi):
- Status 200, body chứa displayName và phone đã cập nhật

---

### TC-USR-004: Cập nhật một trường duy nhất

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập

**When** (Hành động):
- Gửi PATCH `/api/users/me` với `{ displayName: 'Chi Cap Nhat Ten' }`

**Then** (Kết quả mong đợi):
- Status 200, displayName được cập nhật

---

### Validation

### TC-USR-005: Từ chối khi photoUrl không hợp lệ

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập

**When** (Hành động):
- Gửi PATCH `/api/users/me` với `{ photoUrl: 'not-a-valid-url' }`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`

---

### Error Handling

### TC-USR-006: Trả về 401 khi PATCH không có token

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Request không có token xác thực

**When** (Hành động):
- Gửi PATCH `/api/users/me`

**Then** (Kết quả mong đợi):
- Status 401, `success: false`

---

## 3. DELETE /api/users/me

### Happy Path

### TC-USR-007: Soft-delete tài khoản thành công

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập

**When** (Hành động):
- Gửi DELETE `/api/users/me`

**Then** (Kết quả mong đợi):
- Status 200, `success: true`
- DB: `delYn='Y'`, `sttsCd='WITHDRAWN'`, email masked thành `deleted_{userId}@withdrawn.local`
- `deleteDt` và `withdrawDt` được ghi nhận

---

### TC-USR-008: Hủy tất cả refresh token khi xóa tài khoản

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập, có refresh token trong DB

**When** (Hành động):
- Gửi DELETE `/api/users/me`

**Then** (Kết quả mong đợi):
- Tất cả refresh token của user có `dscdDt` != null

---

### TC-USR-009: Xóa cookies khi xóa tài khoản

**Loại**: Integration
**File test**: `src/tests/integration/users/me.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập

**When** (Hành động):
- Gửi DELETE `/api/users/me`

**Then** (Kết quả mong đợi):
- Set-Cookie header xóa `access_token` và `refresh_token` (Max-Age=0)

---

## 4. GET /api/users (Admin)

### Happy Path

### TC-USR-010: Lấy danh sách user phân trang mặc định

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập bằng tài khoản ADMIN, DB có 2 user

**When** (Hành động):
- Gửi GET `/api/users`

**Then** (Kết quả mong đợi):
- Status 200, `data` là mảng 2 phần tử
- `meta.page=1`, `meta.limit=20`, `meta.total=2`, `meta.totalPages=1`

---

### TC-USR-011: Tìm kiếm user theo tên hoặc email

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, DB có admin và normal user

**When** (Hành động):
- Gửi GET `/api/users?search=User Test`

**Then** (Kết quả mong đợi):
- Trả về 1 user có email trùng khớp

---

### TC-USR-012: Lọc user theo role

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, DB có admin và normal user

**When** (Hành động):
- Gửi GET `/api/users?role=ADMIN`

**Then** (Kết quả mong đợi):
- Trả về 1 user có role ADMIN

---

### TC-USR-013: Lọc user theo status

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, 1 user có `sttsCd='SUSPENDED'`

**When** (Hành động):
- Gửi GET `/api/users?status=SUSPENDED`

**Then** (Kết quả mong đợi):
- Trả về 1 user có status SUSPENDED

---

### TC-USR-014: Loại trừ user đã soft-delete

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, 1 user có `delYn='Y'`

**When** (Hành động):
- Gửi GET `/api/users`

**Then** (Kết quả mong đợi):
- Chỉ trả về 1 user (admin), user đã xóa bị loại trừ

---

### Security

### TC-USR-015: Trả về 403 khi user không phải ADMIN

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập bằng tài khoản USER thường

**When** (Hành động):
- Gửi GET `/api/users`

**Then** (Kết quả mong đợi):
- Status 403, `success: false`

---

## 5. PATCH /api/users/[id] (Admin)

### Happy Path

### TC-USR-016: Admin cập nhật role user khác thành công

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, user mục tiêu tồn tại

**When** (Hành động):
- Gửi PATCH `/api/users/{userId}` với `{ role: 'ADMIN' }`

**Then** (Kết quả mong đợi):
- Status 200, `data.role` = 'ADMIN'

---

### TC-USR-017: Admin cập nhật status user thành công

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, user mục tiêu tồn tại

**When** (Hành động):
- Gửi PATCH `/api/users/{userId}` với `{ status: 'SUSPENDED' }`

**Then** (Kết quả mong đợi):
- Status 200, `data.status` = 'SUSPENDED'

---

### Error Handling

### TC-USR-018: Từ chối admin tự thay đổi role của chính mình

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN

**When** (Hành động):
- Gửi PATCH `/api/users/{adminId}` với `{ role: 'USER' }`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`

---

### TC-USR-019: Trả về 404 khi user không tồn tại

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, UUID không tồn tại trong DB

**When** (Hành động):
- Gửi PATCH `/api/users/{nonExistentId}`

**Then** (Kết quả mong đợi):
- Status 404, `success: false`

---

### Validation

### TC-USR-020: Từ chối giá trị role không hợp lệ

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN

**When** (Hành động):
- Gửi PATCH `/api/users/{userId}` với `{ role: 'SUPERADMIN' }`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`

---

### Security

### TC-USR-021: Trả về 403 khi user không phải ADMIN cố cập nhật

**Loại**: Integration
**File test**: `src/tests/integration/users/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập bằng tài khoản USER thường

**When** (Hành động):
- Gửi PATCH `/api/users/{adminId}`

**Then** (Kết quả mong đợi):
- Status 403, `success: false`

---

## 6. GET /api/terms/active (Public)

### Happy Path

### TC-TRM-001: Lấy danh sách điều khoản đang hoạt động

**Loại**: Integration
**File test**: `src/tests/integration/terms/public.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- DB có 3 điều khoản đã seed (tất cả active, enfcDt <= hiện tại)

**When** (Hành động):
- Gửi GET `/api/terms/active` (không cần xác thực)

**Then** (Kết quả mong đợi):
- Status 200, trả về 3 điều khoản với các trường id, typeCd, verNo, title, content, reqYn, enfcDt

---

### TC-TRM-002: Loại trừ điều khoản không hoạt động

**Loại**: Integration
**File test**: `src/tests/integration/terms/public.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- 1 điều khoản có `actvYn='N'`

**When** (Hành động):
- Gửi GET `/api/terms/active`

**Then** (Kết quả mong đợi):
- Chỉ trả về 2 điều khoản, không chứa điều khoản đã deactivate

---

### TC-TRM-003: Loại trừ điều khoản có ngày hiệu lực trong tương lai

**Loại**: Integration
**File test**: `src/tests/integration/terms/public.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- 1 điều khoản có `enfcDt` trong tương lai

**When** (Hành động):
- Gửi GET `/api/terms/active`

**Then** (Kết quả mong đợi):
- Chỉ trả về 2 điều khoản, không chứa điều khoản chưa có hiệu lực

---

## 7. POST /api/terms/agree

### Happy Path

### TC-TRM-004: Đồng ý điều khoản thành công

**Loại**: Integration
**File test**: `src/tests/integration/terms/agree.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập, terms tồn tại trong DB

**When** (Hành động):
- Gửi POST `/api/terms/agree` với `{ termsIds: [tosId, privacyId] }`

**Then** (Kết quả mong đợi):
- Status 200, `data.agreedCount` = 2
- DB: 2 bản ghi UserAgreement với `agreYn='Y'`, `agreDt` != null

---

### TC-TRM-005: Đồng ý lại điều khoản đã đồng ý (idempotent)

**Loại**: Integration
**File test**: `src/tests/integration/terms/agree.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- User đã đồng ý TOS trước đó

**When** (Hành động):
- Gửi POST `/api/terms/agree` với `{ termsIds: [tosId] }` lần nữa

**Then** (Kết quả mong đợi):
- Status 200, `success: true`
- DB chỉ có 1 bản ghi UserAgreement cho TOS (không trùng lặp)

---

### Error Handling

### TC-TRM-006: Từ chối khi termsIds chứa ID không tồn tại

**Loại**: Integration
**File test**: `src/tests/integration/terms/agree.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập, UUID giả không tồn tại trong DB

**When** (Hành động):
- Gửi POST `/api/terms/agree` với `{ termsIds: [fakeId] }`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`

---

### TC-TRM-007: Trả về 401 khi không có token xác thực

**Loại**: Integration
**File test**: `src/tests/integration/terms/agree.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Request không có token

**When** (Hành động):
- Gửi POST `/api/terms/agree`

**Then** (Kết quả mong đợi):
- Status 401, `success: false`

---

## 8. GET /api/terms/pending

### Happy Path

### TC-TRM-008: Lấy điều khoản chưa đồng ý

**Loại**: Integration
**File test**: `src/tests/integration/terms/agree.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- User đã đăng nhập, chưa đồng ý bất kỳ điều khoản nào

**When** (Hành động):
- Gửi GET `/api/terms/pending`

**Then** (Kết quả mong đợi):
- Status 200, trả về 3 điều khoản chưa đồng ý

---

### TC-TRM-009: Trả về danh sách rỗng khi đã đồng ý tất cả

**Loại**: Integration
**File test**: `src/tests/integration/terms/agree.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- User đã đồng ý tất cả 3 điều khoản

**When** (Hành động):
- Gửi GET `/api/terms/pending`

**Then** (Kết quả mong đợi):
- Status 200, `data` là mảng rỗng

---

### Error Handling

### TC-TRM-010: Trả về 401 khi không có token

**Loại**: Integration
**File test**: `src/tests/integration/terms/agree.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Request không có token

**When** (Hành động):
- Gửi GET `/api/terms/pending`

**Then** (Kết quả mong đợi):
- Status 401, `success: false`

---

## 9. Admin Terms CRUD

### Happy Path

### TC-TRM-011: Admin lấy tất cả điều khoản bao gồm không hoạt động

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, DB có 3 terms (1 đã deactivate)

**When** (Hành động):
- Gửi GET `/api/terms`

**Then** (Kết quả mong đợi):
- Status 200, trả về 3 điều khoản, bao gồm cả điều khoản `active: false`

---

### TC-TRM-012: Admin tạo điều khoản mới

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN

**When** (Hành động):
- Gửi POST `/api/terms` với type, version, title, content, required, active, effectiveDate

**Then** (Kết quả mong đợi):
- Status 201, body chứa đầy đủ thông tin điều khoản mới và id

---

### TC-TRM-013: Admin cập nhật điều khoản

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, điều khoản tồn tại

**When** (Hành động):
- Gửi PATCH `/api/terms/{termsId}` với title, version, required mới

**Then** (Kết quả mong đợi):
- Status 200, các trường được cập nhật

---

### TC-TRM-014: Admin soft-delete điều khoản

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, điều khoản tồn tại

**When** (Hành động):
- Gửi DELETE `/api/terms/{termsId}`

**Then** (Kết quả mong đợi):
- Status 200, DB: `actvYn='N'`, `updtBy` = admin ID

---

### Validation

### TC-TRM-015: Từ chối tạo khi thiếu title

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, body thiếu title

**When** (Hành động):
- Gửi POST `/api/terms`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`

---

### TC-TRM-016: Từ chối tạo khi thiếu version

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, body thiếu version

**When** (Hành động):
- Gửi POST `/api/terms`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`

---

### TC-TRM-017: Từ chối tạo khi type không hợp lệ

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, `type: 'INVALID_TYPE'`

**When** (Hành động):
- Gửi POST `/api/terms`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`

---

### TC-TRM-018: Từ chối tạo khi effectiveDate không hợp lệ

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, `effectiveDate: 'not-a-date'`

**When** (Hành động):
- Gửi POST `/api/terms`

**Then** (Kết quả mong đợi):
- Status 400, `success: false`

---

### Error Handling

### TC-TRM-019: Trả về 404 khi PATCH điều khoản không tồn tại

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, UUID không tồn tại

**When** (Hành động):
- Gửi PATCH `/api/terms/{nonExistentId}`

**Then** (Kết quả mong đợi):
- Status 404, `success: false`

---

### TC-TRM-020: Trả về 404 khi DELETE điều khoản không tồn tại

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Trung bình

**Given** (Điều kiện tiên quyết):
- Đăng nhập ADMIN, UUID không tồn tại

**When** (Hành động):
- Gửi DELETE `/api/terms/{nonExistentId}`

**Then** (Kết quả mong đợi):
- Status 404, `success: false`

---

### Security

### TC-TRM-021: Trả về 403 khi user không phải ADMIN truy cập GET /api/terms

**Loại**: Integration
**File test**: `src/tests/integration/terms/admin.test.ts`
**Ưu tiên**: Cao

**Given** (Điều kiện tiên quyết):
- Đăng nhập bằng tài khoản USER thường

**When** (Hành động):
- Gửi GET `/api/terms`

**Then** (Kết quả mong đợi):
- Status 403, `success: false`

---

## Bảng tổng hợp

| Nhóm | Số test case | File test |
|------|-------------|-----------|
| GET /api/users/me | 2 | `src/tests/integration/users/me.test.ts` |
| PATCH /api/users/me | 4 | `src/tests/integration/users/me.test.ts` |
| DELETE /api/users/me | 3 | `src/tests/integration/users/me.test.ts` |
| GET /api/users (Admin) | 6 | `src/tests/integration/users/admin.test.ts` |
| PATCH /api/users/[id] (Admin) | 6 | `src/tests/integration/users/admin.test.ts` |
| GET /api/terms/active | 3 | `src/tests/integration/terms/public.test.ts` |
| POST /api/terms/agree | 4 | `src/tests/integration/terms/agree.test.ts` |
| GET /api/terms/pending | 3 | `src/tests/integration/terms/agree.test.ts` |
| Admin Terms CRUD | 11 | `src/tests/integration/terms/admin.test.ts` |
| **Tổng cộng** | **42** | |
