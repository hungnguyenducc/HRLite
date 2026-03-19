# Kế hoạch kiểm thử tổng thể — Sprint 1: Module Auth

| Thông tin | Chi tiết |
|-----------|---------|
| **Sprint** | Sprint 1 |
| **Module** | Auth (Đăng ký, Đăng nhập, Phiên, Hồ sơ, Quản trị, Điều khoản) |
| **Blueprint** | `docs/blueprints/001-auth/blueprint.md` |
| **Ngày tạo** | 2026-03-19 |
| **Tổng test case** | 169 |
| **Coverage mục tiêu** | ≥ 70% |

---

## Tổng quan Flow kiểm thử

```
                    ┌─────────────────────────────────────────┐
                    │         KIM TỰ THÁP KIỂM THỬ            │
                    │                                         │
                    │              /  E2E  \     ← 23 TC      │
                    │             / Browser \    (Playwright)  │
                    │            /───────────\                 │
                    │           / Integration \  ← 95 TC      │
                    │          /   API Tests   \ (Jest+DB)     │
                    │         /─────────────────\              │
                    │        /    Unit Tests     \ ← 51 TC    │
                    │       /   Infrastructure    \(Jest mock) │
                    │      /─────────────────────────\         │
                    └─────────────────────────────────────────┘

              Thực thi từ dưới lên: Unit → Integration → E2E
```

### Flow thực thi theo thứ tự

```
Bước 1: Unit Tests (51 TC)
   ├── JWT Token (13 TC)
   ├── Password Hashing (10 TC)
   ├── Validation Schema (18 TC)
   ├── API Response Helper (4 TC)
   └── Error Classes (6 TC)
         │
         ▼
Bước 2: Integration Tests — API (95 TC)
   ├── Auth API (32 TC)
   │   ├── Signup API (8 TC)
   │   ├── Login API (7 TC)
   │   ├── Refresh Token API (6 TC)
   │   ├── Logout API (3 TC)
   │   └── Auth Middleware (8 TC)
   ├── Users & Terms API (42 TC)
   │   ├── GET/PATCH/DELETE /api/users/me (9 TC)
   │   ├── Admin Users API (12 TC)
   │   ├── Terms Public API (3 TC)
   │   ├── Terms Agree API (7 TC)
   │   └── Admin Terms CRUD (11 TC)
   └── Security & Integration (21 TC)
       ├── Rate Limiting (10 TC)
       ├── Error Handling (4 TC)
       └── Security Integration (7 TC)
         │
         ▼
Bước 3: E2E Browser Tests (23 TC)
   ├── Trang đăng nhập (6 TC)
   ├── Trang đăng ký (5 TC)
   ├── Trang hồ sơ cá nhân (4 TC)
   ├── Trang quản trị người dùng (4 TC)
   └── Trang quản trị điều khoản (4 TC)
```

---

## Bước 1: Unit Tests (51 TC)

> **Mục đích**: Kiểm tra các hàm/module riêng lẻ hoạt động đúng ở mức thấp nhất.
> **Cách chạy**: `npm run test:unit`
> **Không cần DB**: Dùng mock hoàn toàn.

### 1.1 JWT Token — 13 TC

| ID | Tên | Loại | Ưu tiên |
|----|-----|------|---------|
| TC-INF-001 | Tạo access token hợp lệ | Happy | Cao |
| TC-INF-002 | Tạo refresh token hợp lệ | Happy | Cao |
| TC-INF-003 | Xác minh access token hợp lệ | Happy | Cao |
| TC-INF-004 | Xác minh refresh token hợp lệ | Happy | Cao |
| TC-INF-005 | Từ chối refresh token khi dùng verifyAccessToken | Error | Cao |
| TC-INF-006 | Từ chối access token khi dùng verifyRefreshToken | Error | Cao |
| TC-INF-007 | Từ chối token bị thay đổi (tampered) | Error | Cao |
| TC-INF-008 | Từ chối token đã hết hạn | Error | Cao |
| TC-INF-009 | Từ chối token rỗng | Edge | Trung bình |
| TC-INF-010 | Từ chối token sai format | Edge | Trung bình |
| TC-INF-011 | Hash token trả về chuỗi hex 64 ký tự | Edge | Trung bình |
| TC-INF-012 | Hash token có tính deterministic | Edge | Trung bình |
| TC-INF-013 | Hash token khác nhau cho giá trị khác nhau | Edge | Trung bình |

**File test**: `src/tests/unit/lib/auth/jwt.test.ts`

### 1.2 Password Hashing — 10 TC

| ID | Tên | Loại | Ưu tiên |
|----|-----|------|---------|
| TC-INF-014 | Hash password trả về giá trị khác gốc | Happy | Cao |
| TC-INF-015 | Hash có định dạng bcrypt | Happy | Cao |
| TC-INF-016 | Cùng password tạo hash khác nhau (salt) | Happy | Cao |
| TC-INF-017 | Xác minh password đúng | Happy | Cao |
| TC-INF-018 | Từ chối password sai | Happy | Cao |
| TC-INF-019 | Phân biệt chữ hoa/thường | Edge | Trung bình |
| TC-INF-020 | Xác minh password có ký tự đặc biệt | Edge | Trung bình |
| TC-INF-021 | Xác minh password Unicode | Edge | Trung bình |
| TC-INF-022 | Hash và xác minh password rỗng | Edge | Thấp |
| TC-INF-023 | Hash password dài (100+ ký tự) | Edge | Thấp |

**File test**: `src/tests/unit/lib/auth/password.test.ts`

### 1.3 Validation Schema — 18 TC

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-INF-024~025 | signupSchema happy path (2 TC) | Cao/Trung bình |
| TC-INF-026~028 | signupSchema email validation (3 TC) | Cao |
| TC-INF-029~031 | signupSchema password validation (3 TC) | Cao |
| TC-INF-032~033 | signupSchema agreedTermsIds validation (2 TC) | Cao |
| TC-INF-034~035 | loginSchema validation (2 TC) | Cao |
| TC-INF-036~037 | refreshSchema validation (2 TC) | Cao |
| TC-INF-038~039 | updateProfileSchema validation (2 TC) | Trung bình |
| TC-INF-040~041 | agreeTermsSchema validation (2 TC) | Cao |

**File test**: `src/tests/unit/lib/auth/validation.test.ts`

### 1.4 API Response + Error Classes — 10 TC

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-INF-042~045 | successResponse / errorResponse (4 TC) | Cao/Trung bình |
| TC-INF-046~051 | AppError, các lớp con, handleApiError, ẩn chi tiết production (6 TC) | Cao |

**File test**: `src/tests/unit/lib/api-response.test.ts`, `src/tests/unit/lib/errors.test.ts`

---

## Bước 2: Integration Tests — API (95 TC)

> **Mục đích**: Kiểm tra API endpoint hoạt động đúng với database thật.
> **Cách chạy**: `npm run test:setup && npm run test:integration`
> **Cần DB**: PostgreSQL test container (port 5433).

### 2.1 Auth API — 32 TC

#### Signup API (8 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-AUTH-001 | Đăng ký thành công với dữ liệu hợp lệ | Cao |
| TC-AUTH-002 | Từ chối email không hợp lệ | Cao |
| TC-AUTH-003 | Từ chối mật khẩu yếu | Cao |
| TC-AUTH-004 | Từ chối agreedTermsIds rỗng | Cao |
| TC-AUTH-005 | Từ chối email đã tồn tại (409) | Cao |
| TC-AUTH-006 | Từ chối khi thiếu điều khoản bắt buộc | Cao |
| TC-AUTH-007 | Từ chối agreedTermsIds chứa ID không tồn tại | Trung bình |
| TC-AUTH-008 | Rate limit signup (3 request/window) | Cao |

**Flow**: `Client → POST /api/auth/signup → Validate → Check email unique → Check terms → Hash password → Create user + agreements → Generate tokens → Set cookies → 201`

#### Login API (7 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-AUTH-009 | Đăng nhập thành công | Cao |
| TC-AUTH-010 | Trả về pendingTerms khi chưa đồng ý điều khoản mới | Cao |
| TC-AUTH-011 | Từ chối email sai (401) | Cao |
| TC-AUTH-012 | Từ chối mật khẩu sai (401) | Cao |
| TC-AUTH-013 | Từ chối user đã xóa (delYn=Y) | Cao |
| TC-AUTH-014 | Từ chối user bị vô hiệu hóa (SUSPENDED) | Cao |
| TC-AUTH-015 | Rate limit login (5 request/window) | Cao |

**Flow**: `Client → POST /api/auth/login → Validate → Find user → Check delYn/sttsCd → Verify password → Check pending terms → Generate tokens → Set cookies → 200`

#### Refresh Token API (6 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-AUTH-016 | Làm mới token thành công (rotation) | Cao |
| TC-AUTH-017 | Phát hiện token reuse → thu hồi tất cả | Cao |
| TC-AUTH-018 | Từ chối JWT không hợp lệ | Cao |
| TC-AUTH-019 | Từ chối access token thay refresh token | Cao |
| TC-AUTH-020 | Trả về 400 khi không có token | Cao |
| TC-AUTH-021 | Từ chối refresh khi user bị SUSPENDED | Cao |

**Flow**: `Client → POST /api/auth/refresh → Extract cookie → Verify JWT → Find token in DB → Check discarded (token reuse?) → Check user status → Rotate tokens → Set new cookies → 200`

#### Logout API (3 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-AUTH-022 | Đăng xuất thành công (xóa cookies + discard token) | Cao |
| TC-AUTH-023 | Đăng xuất chỉ với access_token | Trung bình |
| TC-AUTH-024 | Từ chối khi không có access token | Cao |

**Flow**: `Client → POST /api/auth/logout → Verify access token → Discard refresh token in DB → Clear cookies → 200`

#### Auth Middleware (8 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-AUTH-025~026 | withAuth cho phép handler khi token hợp lệ (Bearer/Cookie) | Cao |
| TC-AUTH-027 | withRole cho phép handler khi role phù hợp | Cao |
| TC-AUTH-028~029 | withAuth trả về 401 khi không có token / token không hợp lệ | Cao |
| TC-AUTH-030~032 | withRole trả về 403/401 theo các trường hợp | Cao/Trung bình |

### 2.2 Users & Terms API — 42 TC

#### Users Me API (9 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-USR-001~002 | GET /api/users/me — lấy profile / 401 không token | Cao |
| TC-USR-003~006 | PATCH /api/users/me — cập nhật OK / validation / 401 | Cao |
| TC-USR-007~009 | DELETE /api/users/me — soft-delete / hủy token / xóa cookie | Cao |

**Flow GET**: `Client → GET /api/users/me → withAuth → Query DB (select, không có password) → 200`
**Flow PATCH**: `Client → PATCH /api/users/me → withAuth → Validate (Zod) → Update DB → 200`
**Flow DELETE**: `Client → DELETE /api/users/me → withAuth → Mask email → Set delYn=Y, WITHDRAWN → Discard all tokens → Clear cookies → 200`

#### Admin Users API (12 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-USR-010~014 | GET /api/users — phân trang, tìm kiếm, lọc role/status, loại trừ deleted | Cao/Trung bình |
| TC-USR-015 | GET /api/users — 403 khi không phải ADMIN | Cao |
| TC-USR-016~017 | PATCH /api/users/[id] — cập nhật role/status | Cao |
| TC-USR-018~021 | PATCH /api/users/[id] — tự thay đổi role / 404 / validation / 403 | Cao/Trung bình |

**Flow**: `Client → GET|PATCH /api/users → withRole(['ADMIN']) → Query/Update DB → 200|403`

#### Terms API (21 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-TRM-001~003 | GET /api/terms/active — public, loại trừ inactive/future | Cao |
| TC-TRM-004~007 | POST /api/terms/agree — đồng ý OK / idempotent / error | Cao |
| TC-TRM-008~010 | GET /api/terms/pending — chưa đồng ý / đã đồng ý tất cả / 401 | Cao |
| TC-TRM-011~021 | Admin Terms CRUD — list all / create / update / delete / validation / security | Cao/Trung bình |

### 2.3 Security & Integration — 21 TC

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-SEC-001~010 | Rate Limiting unit tests | Cao |
| TC-SEC-011~014 | Error Handling tập trung | Cao |
| TC-SEC-015~021 | Security integration (rate limit E2E, token reuse, suspended user, password hash leak, self-demote) | Cao |

---

## Bước 3: E2E Browser Tests (23 TC)

> **Mục đích**: Kiểm tra hành trình người dùng hoàn chỉnh trên trình duyệt.
> **Cách chạy**: `/test-run` (Playwright MCP)
> **Cần**: Server đang chạy + DB có seed data.

### 3.1 Trang đăng nhập (6 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-UI-001 | Hiển thị form đăng nhập đúng cấu trúc | Cao |
| TC-UI-002 | Đăng nhập thành công → chuyển hướng dashboard | Cao |
| TC-UI-003 | Hiển thị lỗi khi email/mật khẩu sai | Cao |
| TC-UI-004 | Hiển thị validation phía client khi email rỗng | Trung bình |
| TC-UI-005 | Hiển thị điều khoản chờ đồng ý sau đăng nhập | Cao |
| TC-UI-006 | Hiển thị thông báo khi tài khoản bị vô hiệu hóa | Trung bình |

**Flow E2E**:
```
Trình duyệt → /login
  → Render form (email, password, nút Đăng nhập, link Đăng ký)
  → Nhập email + password → Click "Đăng nhập"
  → fetch POST /api/auth/login
  → Nếu 200: Set cookies → router.push('/dashboard')
  → Nếu 401: Hiển thị toast lỗi
  → Nếu 200 + pendingTerms: Hiển thị dialog đồng ý điều khoản
```

### 3.2 Trang đăng ký (5 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-UI-007 | Hiển thị form đăng ký + checkbox điều khoản | Cao |
| TC-UI-008 | Đăng ký thành công → chuyển hướng dashboard | Cao |
| TC-UI-009 | Hiển thị lỗi khi mật khẩu không đủ mạnh | Cao |
| TC-UI-010 | Hiển thị lỗi khi chưa đồng ý điều khoản bắt buộc | Cao |
| TC-UI-011 | Hiển thị lỗi khi email đã tồn tại | Cao |

**Flow E2E**:
```
Trình duyệt → /signup
  → Render form (tên, email, password, xác nhận password)
  → fetch GET /api/terms/active → Render checkbox điều khoản (Bắt buộc/Tùy chọn)
  → Nhập thông tin → Tick checkbox bắt buộc → Click "Đăng ký"
  → Validate phía client (Zod: email, password strength, password match, terms)
  → Nếu valid: fetch POST /api/auth/signup
  → Nếu 201: Set cookies → router.push('/dashboard')
  → Nếu 400/409: Hiển thị toast lỗi
```

### 3.3 Trang hồ sơ cá nhân (4 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-UI-012 | Hiển thị thông tin hồ sơ đúng | Cao |
| TC-UI-013 | Cập nhật hồ sơ thành công | Cao |
| TC-UI-014 | Xóa tài khoản với xác nhận | Cao |
| TC-UI-015 | Chuyển hướng về login khi chưa đăng nhập | Cao |

**Flow E2E**:
```
Trình duyệt → /profile
  → AuthProvider: fetch GET /api/users/me
  → Nếu 401 + refresh fail: redirect → /login  ← Auth Guard
  → Nếu OK: Render 3 tabs (Thông tin, Bảo mật, Điều khoản)
  → Tab Thông tin: Hiển thị tên, email (disabled), SĐT, avatar URL
  → Sửa thông tin → Click "Lưu" → fetch PATCH /api/users/me
  → Tab Bảo mật: Đổi mật khẩu → Xóa tài khoản (dialog xác nhận)
```

### 3.4 Trang quản trị người dùng (4 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-UI-016 | Admin xem danh sách user (bảng + phân trang) | Cao |
| TC-UI-017 | Admin thay đổi role user | Cao |
| TC-UI-018 | Admin vô hiệu hóa tài khoản | Cao |
| TC-UI-019 | Từ chối truy cập khi không phải ADMIN | Cao |

### 3.5 Trang quản trị điều khoản (4 TC)

| ID | Tên | Ưu tiên |
|----|-----|---------|
| TC-UI-020 | Admin xem danh sách điều khoản | Cao |
| TC-UI-021 | Admin tạo điều khoản mới | Cao |
| TC-UI-022 | Admin chỉnh sửa điều khoản | Trung bình |
| TC-UI-023 | Admin vô hiệu hóa điều khoản | Trung bình |

---

## Kịch bản E2E tổng hợp (Hành trình người dùng)

> Đây là các kịch bản kiểm thử **chuỗi hành động liên tiếp** mô phỏng hành vi người dùng thực.

### Kịch bản 1: Người dùng mới — Đăng ký → Đăng nhập → Sử dụng

```
1. Truy cập /signup
2. Điền form (tên, email, password, xác nhận)
3. Chờ checkbox điều khoản xuất hiện (fetch /api/terms/active)
4. Tick tất cả điều khoản bắt buộc
5. Click "Đăng ký" → Chuyển hướng /dashboard
6. Kiểm tra header hiển thị tên user
7. Kiểm tra dashboard stats (Tổng nhân viên, Đang làm việc, ...)
8. Navigate /profile → Kiểm tra thông tin đúng
9. Cập nhật tên + SĐT → Click "Lưu" → Kiểm tra toast thành công
10. Header cập nhật tên mới
```

### Kịch bản 2: Quản lý phiên — Logout → Redirect → Re-login

```
1. Đăng nhập thành công
2. Truy cập /dashboard → OK
3. Click "Đăng xuất" → Chuyển hướng /login
4. Truy cập /dashboard trực tiếp → Redirect /login (Auth Guard)
5. Truy cập /profile trực tiếp → Redirect /login (Auth Guard)
6. Đăng nhập lại → Dashboard hiển thị đúng
```

### Kịch bản 3: Bảo mật — Đăng nhập sai + Rate limit

```
1. Truy cập /login
2. Nhập email đúng + password sai → Toast "Email hoặc mật khẩu không chính xác"
3. Nhập email không tồn tại → Toast "Email hoặc mật khẩu không chính xác" (cùng thông báo)
4. Thử đăng nhập sai 5 lần liên tiếp → Lần thứ 6 bị rate limit (429)
```

### Kịch bản 4: Admin — Quản trị user + Điều khoản

```
1. Đăng nhập bằng tài khoản ADMIN
2. Sidebar hiển thị thêm menu "Quản trị"
3. Navigate /admin/users → Bảng danh sách user
4. Tìm kiếm user → Lọc theo role/status
5. Thay đổi role user → Kiểm tra cập nhật
6. Navigate /admin/terms → Danh sách điều khoản
7. Tạo điều khoản mới → Kiểm tra xuất hiện trong danh sách
8. Vô hiệu hóa điều khoản → Kiểm tra trạng thái
```

### Kịch bản 5: Responsive — Kiểm tra layout 3 viewport

```
1. Desktop (1280x720): Sidebar hiển thị, grid 4 cột stats
2. Tablet (768x1024): Sidebar ẩn, grid 2 cột
3. Mobile (375x812): Sidebar ẩn, hamburger menu, grid 1 cột
4. Kiểm tra cho: /login, /signup, /dashboard, /profile
```

### Kịch bản 6: Xóa tài khoản — Soft delete + Cleanup

```
1. Đăng nhập
2. Navigate /profile
3. Click "Xóa tài khoản" → Dialog xác nhận
4. Xác nhận → fetch DELETE /api/users/me
5. Redirect /login
6. Cookies bị xóa
7. Thử đăng nhập lại với email cũ → Thất bại (email đã mask)
```

---

## Lệnh thực thi

| Bước | Lệnh | Mô tả |
|------|-------|-------|
| 1a | `npm run test:unit` | Chạy tất cả unit test (51 TC) |
| 1b | `npm run test:unit -- --verbose` | Chạy với log chi tiết |
| 2a | `npm run test:setup` | Khởi động DB test container + migrate |
| 2b | `npm run test:integration` | Chạy tất cả integration test (95 TC) |
| 2c | `npm run test:coverage` | Chạy tất cả + báo cáo coverage |
| 3a | `npm run dev` | Khởi động server dev |
| 3b | `/test-run` | Chạy E2E browser test (23 TC) |

### Chạy tất cả:
```bash
npm run test:setup && npm run test:coverage
# Sau đó:
# /test-run (trong Claude Code)
```

---

## Bảng tổng hợp toàn bộ

| Tài liệu | File | Số TC |
|-----------|------|-------|
| Auth Infrastructure | `auth-infrastructure-test-cases.md` | 51 |
| Auth API | `auth-api-test-cases.md` | 32 |
| Users & Terms API | `users-terms-api-test-cases.md` | 42 |
| Security & Integration | `security-integration-test-cases.md` | 21 |
| Auth UI (E2E) | `auth-ui-test-cases.md` | 23 |
| **Tổng cộng** | | **169** |

### Phân loại theo ưu tiên

| Ưu tiên | Số TC | Tỷ lệ |
|---------|-------|--------|
| Cao | 112 | 66% |
| Trung bình | 47 | 28% |
| Thấp | 10 | 6% |

### Tiêu chí PASS Sprint 1

- [ ] Unit tests: 51/51 PASS
- [ ] Integration tests: 95/95 PASS
- [ ] E2E browser tests: 23/23 PASS (hoặc có lý do skip hợp lệ)
- [ ] Coverage ≥ 70%
- [ ] 0 console error nghiêm trọng
- [ ] 0 lỗi bảo mật (password hash lộ, thiếu auth guard, ...)
- [ ] Responsive: Desktop/Tablet/Mobile layout đúng
