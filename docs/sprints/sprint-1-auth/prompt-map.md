# Sprint 1 Prompt Map

## Sprint Goal
Xây dựng hoàn chỉnh module xác thực (Auth) cho HRLite — bao gồm đăng ký, đăng nhập, đăng xuất, làm mới token, quản lý hồ sơ, phân quyền ADMIN/USER, quản lý điều khoản sử dụng, và các biện pháp bảo mật cơ bản (rate limiting, error handling).

## Feature 1: Hạ tầng xác thực (Auth Infrastructure)

### 1.1 Design Prompt
/feature-dev "Viết tài liệu thiết kế cho module xác thực người dùng (Auth)
vào docs/blueprints/001-auth/blueprint.md.
Bao gồm: kiến trúc, tech stack, DB schema (4 bảng: TB_COMM_USER, TB_COMM_TRMS,
TH_COMM_USER_AGRE, TB_COMM_RFRSH_TKN), thiết kế API, luồng xác thực,
bảo mật (bcrypt, JWT HS256, HttpOnly cookies, rate limiting).
Tham chiếu docs/database/database-design.md cho DB schema.
Không chỉnh sửa code."

### 1.2 DB Design Reflection Prompt
/feature-dev "Thêm/cập nhật các bảng Module Auth trong
docs/database/database-design.md:
- TB_COMM_USER (Tài khoản người dùng)
- TB_COMM_TRMS (Điều khoản sử dụng)
- TH_COMM_USER_AGRE (Lịch sử đồng ý điều khoản)
- TB_COMM_RFRSH_TKN (Refresh Token)
- Cập nhật ERD và tóm tắt FK. Tuân thủ từ điển thuật ngữ chuẩn.
Không chỉnh sửa code."

### 1.3 Test Case Prompt
/feature-dev "Dựa trên docs/blueprints/001-auth/blueprint.md,
viết test cases vào docs/tests/test-cases/sprint-1/auth-infrastructure-test-cases.md.
Dùng format Given-When-Then, bao gồm unit/integration/edge cases cho:
- JWT utility (tạo, xác minh, hết hạn)
- Password utility (hash, compare)
- Zod validation schemas
- Cookie utility
Không chỉnh sửa code."

### 1.4 Implementation Prompt
/feature-dev "Tuân thủ nghiêm ngặt docs/blueprints/001-auth/blueprint.md và
docs/database/database-design.md để triển khai:
- prisma/schema.prisma (4 model auth)
- src/lib/auth/jwt.ts (jose, HS256)
- src/lib/auth/password.ts (bcryptjs, cost 12)
- src/lib/auth/validation.ts (zod schemas)
- src/lib/auth/cookies.ts (HttpOnly cookies)
- src/lib/db.ts (Prisma singleton)
- src/lib/api-response.ts (response helper)
Viết test tham chiếu docs/tests/test-cases/sprint-1/auth-infrastructure-test-cases.md,
chạy test và báo cáo kết quả vào docs/tests/test-reports/."

## Feature 2: Auth API (Signup, Login, Refresh, Logout)

### 2.1 Test Case Prompt
/feature-dev "Dựa trên docs/blueprints/001-auth/blueprint.md mục 5.1 và 7.1-7.3,
viết test cases vào docs/tests/test-cases/sprint-1/auth-api-test-cases.md.
Bao gồm:
- POST /api/auth/signup (validation, email trùng, hash password, tạo token)
- POST /api/auth/login (xác minh, trạng thái tài khoản, cập nhật lastLoginDt)
- POST /api/auth/refresh (rotation, token bị thu hồi, reuse attack)
- POST /api/auth/logout (thu hồi token, xóa cookie)
- Auth middleware (withAuth, withRole)
Không chỉnh sửa code."

### 2.2 Implementation Prompt
/feature-dev "Tuân thủ nghiêm ngặt docs/blueprints/001-auth/blueprint.md để triển khai:
- src/app/api/auth/signup/route.ts
- src/app/api/auth/login/route.ts
- src/app/api/auth/refresh/route.ts
- src/app/api/auth/logout/route.ts
- src/lib/auth/middleware.ts (withAuth, withRole)
Viết test tham chiếu docs/tests/test-cases/sprint-1/auth-api-test-cases.md,
chạy test và báo cáo kết quả vào docs/tests/test-reports/."

## Feature 3: Users & Terms API

### 3.1 Test Case Prompt
/feature-dev "Dựa trên docs/blueprints/001-auth/blueprint.md mục 5.2 và 5.3,
viết test cases vào docs/tests/test-cases/sprint-1/users-terms-api-test-cases.md.
Bao gồm:
- GET/PATCH/DELETE /api/users/me (profile CRUD, soft delete)
- GET /api/users, PATCH /api/users/[id] (ADMIN: danh sách, thay đổi role/status)
- GET /api/terms/active, POST /api/terms/agree, GET /api/terms/pending
- GET/POST /api/terms, PATCH/DELETE /api/terms/[id] (ADMIN CRUD)
Không chỉnh sửa code."

### 3.2 Implementation Prompt
/feature-dev "Tuân thủ nghiêm ngặt docs/blueprints/001-auth/blueprint.md để triển khai:
- src/app/api/users/me/route.ts (GET/PATCH/DELETE)
- src/app/api/users/route.ts (GET — ADMIN)
- src/app/api/users/[id]/route.ts (PATCH — ADMIN)
- src/app/api/terms/active/route.ts (GET — public)
- src/app/api/terms/agree/route.ts (POST — auth)
- src/app/api/terms/pending/route.ts (GET — auth)
- src/app/api/terms/route.ts (GET/POST — ADMIN)
- src/app/api/terms/[id]/route.ts (PATCH/DELETE — ADMIN)
Viết test tham chiếu docs/tests/test-cases/sprint-1/users-terms-api-test-cases.md,
chạy test và báo cáo kết quả vào docs/tests/test-reports/."

## Feature 4: Giao diện người dùng (Auth UI)

### 4.1 Test Case Prompt
/feature-dev "Dựa trên docs/blueprints/001-auth/blueprint.md mục 6,
viết test cases vào docs/tests/test-cases/sprint-1/auth-ui-test-cases.md.
Bao gồm:
- Trang đăng nhập (/login): form validation, gọi API, redirect, hiển thị lỗi
- Trang đăng ký (/signup): hiển thị điều khoản, xác nhận mật khẩu, password strength
- Trang hồ sơ (/profile): load data, cập nhật, xóa tài khoản
- Trang quản trị (/admin/users, /admin/terms): phân trang, tìm kiếm, CRUD
- Dashboard layout: sidebar, auth context, logout
Không chỉnh sửa code."

### 4.2 Implementation Prompt
/feature-dev "Tuân thủ nghiêm ngặt docs/blueprints/001-auth/blueprint.md để triển khai:
- src/app/(auth)/layout.tsx, login/page.tsx, signup/page.tsx, forgot-password/page.tsx
- src/lib/auth/auth-context.tsx (AuthProvider, useAuth)
- src/app/(dashboard)/layout.tsx (sidebar, header, auth guard)
- src/app/(dashboard)/profile/page.tsx
- src/app/(dashboard)/admin/users/page.tsx
- src/app/(dashboard)/admin/terms/page.tsx
- src/app/(dashboard)/dashboard/page.tsx
Tuân thủ design token tại src/styles/design-tokens.css.
Viết test tham chiếu docs/tests/test-cases/sprint-1/auth-ui-test-cases.md,
chạy test và báo cáo kết quả vào docs/tests/test-reports/."

## Feature 5: Tích hợp & Bảo mật

### 5.1 Test Case Prompt
/feature-dev "Viết test cases vào docs/tests/test-cases/sprint-1/security-integration-test-cases.md.
Bao gồm:
- Rate limiting (login 5/min, signup 3/min, refresh 10/min, trả 429 + Retry-After)
- Error classes (AppError, AuthError, ForbiddenError, NotFoundError, ConflictError, RateLimitError)
- Seed data (admin login, điều khoản mặc định)
Không chỉnh sửa code."

### 5.2 Implementation Prompt
/feature-dev "Triển khai:
- src/lib/auth/rate-limit.ts (in-memory sliding window)
- src/lib/errors.ts (error classes + handleApiError)
- prisma/seed.ts (admin@hrlite.com + 2 điều khoản mẫu)
- Tích hợp rate limiting vào auth routes (signup, login, refresh)
Viết test tham chiếu docs/tests/test-cases/sprint-1/security-integration-test-cases.md,
chạy test và báo cáo kết quả vào docs/tests/test-reports/."

## Phụ thuộc

```
Feature 1 (Hạ tầng)
       ↓
Feature 2 (Auth API) ← phụ thuộc Feature 1
       ↓
Feature 3 (Users/Terms API) ← phụ thuộc Feature 1, 2
       ↓
Feature 4 (Auth UI) ← phụ thuộc Feature 2, 3
       ↓
Feature 5 (Tích hợp) ← phụ thuộc Feature 2, 3
```
