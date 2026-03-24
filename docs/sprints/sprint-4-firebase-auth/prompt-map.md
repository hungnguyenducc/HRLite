# Sprint 4 Prompt Map

## Sprint Goal
Chuyển đổi hệ thống xác thực từ Custom JWT sang Firebase Authentication, bổ sung chức năng Withdrawal (xóa tài khoản), đảm bảo backward-compatible với dữ liệu user hiện có.

---

## Feature 1: Firebase Infrastructure Setup

### 1.1 Design Prompt
> Blueprint đã hoàn thành tại `docs/blueprints/006-firebase-auth/blueprint.md`.
> Không cần viết thêm design document.

### 1.2 DB Design Reflection Prompt
/feature-dev "Cập nhật docs/database/database-design.md cho Firebase Auth migration:
- Thêm cột FIREBASE_UID (VARCHAR 128, UNIQUE, nullable) vào TB_COMM_USER
- Đánh dấu PASSWD_HASH là nullable (trước đây NOT NULL)
- Đánh dấu TB_COMM_RFRSH_TKN là deprecated (giữ lại cho migration, sẽ xóa Sprint 5+)
- Cập nhật phần ERD và mô tả quan hệ
- Tuân thủ từ điển thuật ngữ chuẩn dữ liệu công
- Tham chiếu blueprint: docs/blueprints/006-firebase-auth/blueprint.md (Section 4)
Không chỉnh sửa code."

### 1.3 Implementation Prompt
/feature-dev "Thiết lập Firebase infrastructure cho dự án HRLite:

**Bước 1: Cài đặt dependencies**
- Cài `firebase` (Client SDK) và `firebase-admin` (Admin SDK)
- Gỡ `bcryptjs`, `@types/bcryptjs` (không cần nữa — CHƯA gỡ ở bước này, gỡ sau khi migration xong)

**Bước 2: Prisma migration**
- Thêm cột `firebaseUid` (String?, @unique, @map('FIREBASE_UID')) vào model User
- Sửa `passwdHash` thành optional (String?)
- Chạy `npx prisma migrate dev --name add-firebase-uid`

**Bước 3: Firebase SDK setup**
- Tạo `src/lib/firebase/config.ts` — Firebase Client SDK initialization (dùng NEXT_PUBLIC_FIREBASE_* env vars)
- Tạo `src/lib/firebase/auth.ts` — Helper functions: firebaseSignUp, firebaseSignIn, firebaseSignOut
- Tạo `src/lib/firebase/admin.ts` — Firebase Admin SDK initialization (dùng FIREBASE_* env vars)

**Bước 4: Environment variables**
- Cập nhật `.env.example` với Firebase env vars mới (NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, SESSION_COOKIE_MAX_AGE)
- Đánh dấu JWT_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES là deprecated

Tham chiếu: docs/blueprints/006-firebase-auth/blueprint.md (Section 3, 4, 7.1, 6.1)
Tham chiếu DB: docs/database/database-design.md"

---

## Feature 2: Backend Auth API Migration

### 2.1 Implementation Prompt — Middleware & Session
/feature-dev "Viết lại auth middleware và tạo session endpoint cho Firebase Auth:

**Bước 1: Viết lại middleware** (`src/lib/auth/middleware.ts`)
- `withAuth()`: Lấy session cookie `__session` → `adminAuth.verifySessionCookie(cookie, true)` → tìm user bằng firebaseUid → attach user info vào request
- `withRole()`: Giữ nguyên logic check role
- Cập nhật type `VerifiedPayload` thêm `firebaseUid`

**Bước 2: Tạo POST /api/auth/session** (`src/app/api/auth/session/route.ts`)
- Nhận `{ idToken }` từ body
- `adminAuth.verifyIdToken(idToken)` → lấy firebaseUid
- Tìm user trong DB bằng firebaseUid, kiểm tra sttsCd='ACTIVE', delYn='N'
- Kiểm tra pending required terms
- Cập nhật lastLoginDt
- `adminAuth.createSessionCookie(idToken, { expiresIn: 5 days })`
- Set-Cookie: `__session` (HttpOnly, Secure in prod, SameSite=Lax, path=/, maxAge=5 days)
- Response: `{ success: true, data: { user, pendingTerms } }`

**Bước 3: Cập nhật validation schemas** (`src/lib/auth/validation.ts`)
- Thêm `sessionSchema`: `{ idToken: z.string().min(1) }`
- Thêm `signupFirebaseSchema`: `{ idToken: string, displayName?: string, agreedTermsIds: string[] }`

Tham chiếu: docs/blueprints/006-firebase-auth/blueprint.md (Section 5.3, 7.2)
Tham chiếu DB: docs/database/database-design.md"

### 2.2 Implementation Prompt — Signup & Logout & Withdraw
/feature-dev "Viết lại signup, logout và tạo withdraw endpoint:

**Bước 1: Viết lại POST /api/auth/signup** (`src/app/api/auth/signup/route.ts`)
- Nhận `{ idToken, displayName?, agreedTermsIds }` từ body
- `adminAuth.verifyIdToken(idToken)` → lấy email, uid
- Kiểm tra email chưa tồn tại trong DB (hoặc tồn tại nhưng chưa link Firebase)
- Kiểm tra tất cả required terms đã được đồng ý
- Transaction: tạo User (với firebaseUid) + UserAgreement records
- `adminAuth.createSessionCookie(idToken, { expiresIn: 5 days })`
- Set-Cookie: `__session`
- Response 201: `{ success: true, data: { user } }`

**Bước 2: Viết lại POST /api/auth/logout** (`src/app/api/auth/logout/route.ts`)
- Lấy session cookie → verify → lấy uid
- `adminAuth.revokeRefreshTokens(uid)` (revoke Firebase tokens)
- Clear cookie `__session` (maxAge=0)
- Response: `{ success: true, data: { message: 'Đăng xuất thành công' } }`

**Bước 3: Tạo DELETE /api/auth/withdraw** (`src/app/api/auth/withdraw/route.ts`)
- Requires auth (withAuth middleware)
- Tìm user trong DB
- Transaction:
  - Set sttsCd='WITHDRAWN', delYn='Y', deleteDt=now(), withdrawDt=now()
  - Mask email: 'withdrawn_{userId}@deleted.local'
  - Clear phone, photoUrl
  - Discard all legacy refresh tokens
- `adminAuth.deleteUser(firebaseUid)` (xóa trên Firebase)
- Clear cookie `__session`
- Response: `{ success: true, data: { message: 'Tài khoản đã được xóa thành công' } }`

**Bước 4: Cleanup**
- Xóa `src/app/api/auth/login/route.ts` (thay bằng /api/auth/session)
- Xóa `src/app/api/auth/refresh/route.ts` (Firebase tự quản lý)
- Xóa `src/lib/auth/jwt.ts`
- Xóa `src/lib/auth/password.ts`
- Cập nhật tất cả imports bị ảnh hưởng

Tham chiếu: docs/blueprints/006-firebase-auth/blueprint.md (Section 5.2, 5.4, 5.5)
Tham chiếu DB: docs/database/database-design.md"

---

## Feature 3: Frontend Auth Migration

### 3.1 Implementation Prompt — Auth Context & Login
/feature-dev "Cập nhật frontend auth flow cho Firebase:

**Bước 1: Cập nhật Auth Context** (`src/lib/auth/auth-context.tsx`)
- On mount: fetch `/api/users/me` (session cookie tự gửi)
- Xóa logic retry với `/api/auth/refresh` (Firebase tự refresh)
- `logout()`: gọi `firebaseSignOut()` → `POST /api/auth/logout`
- Giữ nguyên: `user`, `loading`, `refreshUser()`

**Bước 2: Viết lại Login page** (`src/app/(auth)/login/page.tsx`)
- Giữ nguyên UI layout, Zod validation
- Thay đổi submit handler:
  1. `firebaseSignIn(email, password)` → nhận idToken
  2. `POST /api/auth/session { idToken }` → nhận user + pendingTerms
  3. Nếu có pendingTerms → xử lý (hiện tại redirect dashboard)
  4. Redirect → `/dashboard`
- Error handling: map Firebase error codes → tiếng Việt
  - `auth/user-not-found` / `auth/wrong-password` / `auth/invalid-credential` → 'Email hoặc mật khẩu không đúng'
  - `auth/user-disabled` → 'Tài khoản đã bị vô hiệu hóa'
  - `auth/too-many-requests` → 'Quá nhiều lần thử. Vui lòng thử lại sau'

**Bước 3: Tạo Firebase error mapper** (`src/lib/firebase/errors.ts`)
- `mapFirebaseError(error)` → `{ message: string }`
- Cover tất cả error codes từ blueprint Section 11

Tham chiếu: docs/blueprints/006-firebase-auth/blueprint.md (Section 6.2, 6.3, 11)
Xóa default credentials pre-fill trong login form (không cần thiết nữa với Firebase)."

### 3.2 Implementation Prompt — Signup & Withdrawal UI
/feature-dev "Cập nhật Signup page và thêm Withdrawal UI:

**Bước 1: Viết lại Signup page** (`src/app/(auth)/signup/page.tsx`)
- Giữ nguyên: UI layout, Zod validation, terms checkbox, password strength meter
- Thay đổi submit handler:
  1. `firebaseSignUp(email, password)` → nhận idToken
  2. `POST /api/auth/signup { idToken, displayName, agreedTermsIds }`
  3. Nếu server error → `auth.currentUser?.delete()` (rollback Firebase user)
  4. Redirect → `/dashboard`
- Error handling: map Firebase error codes
  - `auth/email-already-in-use` → 'Email đã được sử dụng'
  - `auth/weak-password` → 'Mật khẩu quá yếu'

**Bước 2: Thêm Withdrawal UI** vào Profile page (`src/app/(dashboard)/profile/page.tsx`)
- Trong tab 'Bảo mật', thêm section 'Vùng nguy hiểm' ở cuối:
  - Heading: 'Xóa tài khoản'
  - Mô tả: 'Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.'
  - Button 'Xóa tài khoản' (variant destructive, màu đỏ)
- AlertDialog xác nhận:
  - Title: 'Xác nhận xóa tài khoản'
  - Description: 'Nhập email của bạn để xác nhận'
  - Input: email xác nhận (phải khớp chính xác với email hiện tại)
  - Button 'Hủy' + Button 'Xóa vĩnh viễn' (disabled khi email chưa khớp)
- Submit handler:
  1. `DELETE /api/auth/withdraw`
  2. `firebaseSignOut()`
  3. Redirect → `/login` với toast 'Tài khoản đã được xóa'

Tham chiếu: docs/blueprints/006-firebase-auth/blueprint.md (Section 6.4, 6.5)
Dùng Radix UI AlertDialog component (đã có trong dự án)."

---

## Feature 4: Migration Script & E2E Testing

### 4.1 Implementation Prompt — Migration Script
/feature-dev "Viết migration script để chuyển user hiện tại sang Firebase Auth:

**Tạo file** `scripts/migrate-to-firebase.ts`

**Flow:**
1. Kết nối DB qua Prisma, lấy tất cả user có sttsCd='ACTIVE', delYn='N'
2. Với mỗi user:
   - Import sang Firebase bằng `adminAuth.importUsers()` với algorithm BCRYPT
   - Dùng user.id làm Firebase UID (hoặc generate mới)
   - Update TB_COMM_USER set firebaseUid = uid đã import
3. Log kết quả: total, success, failed, skip (đã có firebaseUid)
4. Error handling: continue on individual failure, log error details

**Script chạy:**
```bash
npx tsx scripts/migrate-to-firebase.ts
```

**Lưu ý quan trọng:**
- Firebase Admin SDK hỗ trợ import bcrypt hash trực tiếp → user KHÔNG cần đặt lại mật khẩu
- Chạy dry-run trước (flag --dry-run) để kiểm tra không có lỗi
- Backup DB trước khi chạy production

Tham chiếu: docs/blueprints/006-firebase-auth/blueprint.md (Section 8)"

### 4.2 Test Case Prompt
/feature-dev "Dựa trên blueprint docs/blueprints/006-firebase-auth/blueprint.md,
viết test cases vào docs/tests/test-cases/sprint-4/firebase-auth-e2e-scenarios.md.
Bao gồm:
- Sign Up: đăng ký mới, email trùng, mật khẩu yếu, thiếu terms, rollback khi server fail
- Sign In: đăng nhập thành công, sai password, tài khoản WITHDRAWN/SUSPENDED
- Logout: xóa session, revoke token
- Withdrawal: xóa thành công, email không khớp, verify DB soft-delete + Firebase delete
- Session: cookie expired, protected route without session, admin route với user role
- Migration: user cũ login được sau migration
Dùng format Given-When-Then.
Không chỉnh sửa code."

### 4.3 E2E Test Prompt
/test-run "Chạy integration test toàn diện cho Firebase Auth migration:
1. Sign Up flow: tạo tài khoản mới → verify session cookie → verify DB record (firebaseUid)
2. Logout → Login flow: đăng nhập lại → verify session cookie mới
3. Protected routes: verify middleware hoạt động với session cookie
4. Withdrawal flow: xóa tài khoản → verify DB soft-delete → verify không login được nữa
5. Migration users: login với tài khoản đã migrate → verify hoạt động bình thường
6. Error cases: sai password, email trùng, session expired"

---

## Execution Order

```
Prompt 1.2  → DB Design Reflection (cập nhật database-design.md)
Prompt 1.3  → Firebase Infrastructure Setup (SDK, Prisma migration, env vars)
Prompt 2.1  → Backend: Middleware + Session endpoint
Prompt 2.2  → Backend: Signup + Logout + Withdraw + Cleanup old files
Prompt 3.1  → Frontend: Auth Context + Login page
Prompt 3.2  → Frontend: Signup page + Withdrawal UI
Prompt 4.1  → Migration Script
Prompt 4.2  → Test Cases
Prompt 4.3  → E2E Test Run
```

## Dependencies

```
Feature 1 (Infrastructure) ──→ Feature 2 (Backend API)
                              ──→ Feature 3 (Frontend)
                                  ──→ Feature 4 (Migration & Test)
```
