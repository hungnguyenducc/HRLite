# Sprint 4 Smoke Test Report — Firebase Auth Migration

## Test Environment
- **Date**: 2026-03-24
- **Server**: Next.js 15 + Prisma + PostgreSQL 16 + Firebase SDK
- **Browser**: Chrome (Playwright MCP)
- **Port**: localhost:3002
- **Firebase Status**: Placeholder credentials (real Firebase project chưa tạo)
- **Tester**: ASTRA /test-run automation

## Important Note

Firebase credentials đang là placeholder values. Tất cả API endpoint sử dụng Firebase Admin SDK sẽ trả 500 (Failed to parse private key). Đây là **expected behavior** và sẽ được resolve khi có real Firebase project credentials.

Test này tập trung vào:
- UI rendering & layout
- Client-side validation
- Firebase error handling graceful
- Route protection (redirect to login)
- Code compilation (0 TypeScript errors)

## Test Result Summary

| Item | Result | Notes |
|------|--------|-------|
| TypeScript Build | **PASS** | 0 errors trong production code |
| Trang chủ `/` | **PASS** | Load OK, link đăng nhập hoạt động |
| Login `/login` | **PASS** | Form render, Firebase error toast hiển thị |
| Signup `/signup` | **PASS** | Form + terms + password strength + validation |
| Forgot Password `/forgot-password` | **PASS** | Load OK |
| Protected Route Redirect | **PASS** | `/dashboard` → redirect `/login` khi chưa auth |
| Console Errors | **1** | `/api/users/me` 500 — expected (placeholder Firebase) |
| Network Failures | **Expected** | Firebase API calls fail do placeholder API key |

## Detailed Results

### 1. Login Page (`/login`)

| Test | Result | Details |
|------|--------|---------|
| Page load | PASS | Form email + password render đúng |
| Submit với placeholder key | PASS | Toast: "Đăng nhập thất bại" + Firebase error message |
| Error handling | PASS | `mapFirebaseError()` hoạt động, catch Firebase reject |
| Link Quên mật khẩu | PASS | Navigate đến `/forgot-password` |
| Link Đăng ký ngay | PASS | Navigate đến `/signup` |

### 2. Signup Page (`/signup`)

| Test | Result | Details |
|------|--------|---------|
| Page load | PASS | Form + terms checkboxes render |
| Terms fetch | PASS | GET /api/terms/active → 200 OK |
| Submit trống | PASS | Validation: "Email không được để trống", "Mật khẩu không được để trống", "Vui lòng xác nhận mật khẩu" |
| Submit thiếu terms | PASS | "Vui lòng đồng ý với tất cả điều khoản bắt buộc" |
| Password strength | PASS | Indicator "Mạnh" cho password mạnh |
| Submit với placeholder key | PASS | Toast: "Đăng ký thất bại" + Firebase error |

### 3. Protected Route Redirect

| Test | Result | Details |
|------|--------|---------|
| `/dashboard` không auth | PASS | "Đang tải..." → redirect `/login` (~2s) |
| `/api/users/me` không session | PASS | 500 (Firebase Admin crash — expected) |

### 4. Forgot Password (`/forgot-password`)

| Test | Result | Details |
|------|--------|---------|
| Page load | PASS | Form email render OK |
| Link quay lại | PASS | Navigate về `/login` |

## Issues Found

### 1. [Expected] Firebase Admin SDK crash — placeholder credentials
- **Severity**: N/A (expected, sẽ fix khi có real credentials)
- **Location**: Mọi endpoint dùng `adminAuth` (`/api/auth/session`, `/api/users/me`, etc.)
- **Error**: `Failed to parse private key: Error: Invalid PEM formatted message`
- **Impact**: Tất cả auth flow blocked — signup, login, protected pages
- **Fix**: Thay placeholder env vars bằng real Firebase project credentials

### 2. [Low] `/api/users/me` returns 500 instead of 401 when Firebase unavailable
- **Severity**: Low
- **Location**: `src/lib/auth/middleware.ts`
- **Description**: Khi Firebase Admin init fail, middleware throw error trước khi kịp check session cookie → 500 thay vì 401
- **Impact**: Client vẫn redirect đúng (auth-context xử lý mọi non-200 response)
- **Recommendation**: Wrap Firebase Admin import với try/catch để trả 401 khi service unavailable

### 3. [Info] Login form vẫn có pre-filled values
- **Severity**: Info
- **Description**: Email/password pre-filled (browser autofill hoặc default values)
- **Impact**: Không ảnh hưởng — đây là browser behavior

## Code Quality Verification

| Check | Result |
|-------|--------|
| TypeScript (production) | **0 errors** |
| TypeScript (test files) | 11 errors — old imports (jwt.ts, password.ts) — cần update test files |
| New files created | 6 (firebase/config, admin, auth, errors + session route + migration script) |
| Old files removed | 4 (jwt.ts, password.ts, login/route.ts, refresh/route.ts) |
| Import cleanup | PASS — no broken imports in production code |

## Test Scenarios Coverage (Sprint 4)

| Scenario Group | Testable Now | Blocked by Firebase | Total |
|---------------|-------------|-------------------|-------|
| Sign Up | 3/6 (validation) | 3/6 (Firebase calls) | 6 |
| Sign In | 1/6 (error handling) | 5/6 (Firebase calls) | 6 |
| Logout | 0/2 | 2/2 | 2 |
| Session | 1/3 (redirect) | 2/3 | 3 |
| Withdrawal | 0/4 | 4/4 | 4 |
| Password Change | 0/3 | 3/3 | 3 |
| Full Journey | 0/2 | 2/2 | 2 |
| **Total** | **5/26** | **21/26** | **26** |

## Conclusion

Sprint 4 Firebase Auth migration code đã được triển khai thành công:
- **0 TypeScript errors** trong production code
- **UI rendering** hoạt động đúng trên tất cả trang auth
- **Client-side validation** đầy đủ (email, password, terms, password strength)
- **Firebase error handling** graceful — toast hiển thị lỗi rõ ràng
- **Route protection** hoạt động — redirect login khi chưa auth

**Blocker**: Cần tạo Firebase project và cập nhật `.env` để test full auth flow (21/26 scenarios).

### Next Steps
1. Tạo Firebase project tại console.firebase.google.com
2. Enable Email/Password authentication
3. Cập nhật `.env` với real credentials
4. Chạy `npx tsx scripts/migrate-to-firebase.ts` để migrate existing users
5. Chạy lại `/test-run` cho full E2E testing
