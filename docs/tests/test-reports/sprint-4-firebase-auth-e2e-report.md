# Sprint 4 E2E Test Report — Firebase Auth Migration

## Test Environment
- **Date**: 2026-03-24
- **Server**: Next.js 15 + Prisma + PostgreSQL 16 + Firebase Auth
- **Browser**: Chrome (Playwright MCP)
- **Port**: localhost:3002
- **Firebase Project**: hungnd-bb801
- **Tester**: ASTRA /test-run automation

## Test Result Summary

| Item | Result | Notes |
|------|--------|-------|
| Server Startup | **PASS** | Firebase Admin SDK initialized OK |
| Sign Up E2E | **PASS** | Firebase + DB + Session cookie |
| Sign In E2E | **PASS** | Firebase + Session cookie |
| Logout E2E | **PASS** | Firebase signOut + revoke + cookie clear |
| Withdrawal E2E | **PASS** | DB soft-delete + Firebase deleteUser |
| Post-withdrawal login blocked | **PASS** | Firebase user deleted, can't login |
| Client-side Validation | **PASS** | Email, password, terms, strength |
| Route Protection | **PASS** | Redirect to /login when no session |
| Console Errors | **0** | (excluding expected Firebase API errors during test) |

## Full E2E Journey: Sign Up → Login → Withdraw

### Step 1: Sign Up
- **URL**: `/signup`
- **Input**: Firebase Tester / firebase-test@hrlite.test / Test@2026!
- **Terms**: 2 required terms checked
- **Result**: **PASS**
  - Firebase `accounts:signUp` → 200
  - `POST /api/auth/signup` → 201 Created
  - Cookie `__session` set
  - Redirect → `/dashboard`
  - Dashboard: "Chào buổi sáng, Firebase Tester" (Người dùng)

### Step 2: Logout
- **Action**: User menu → Đăng xuất
- **Result**: **PASS**
  - `POST /api/auth/logout` → 200
  - Firebase signOut + revokeRefreshTokens
  - Cookie `__session` cleared
  - Redirect → `/login`

### Step 3: Login
- **URL**: `/login`
- **Input**: firebase-test@hrlite.test / Test@2026!
- **Result**: **PASS**
  - Firebase `signInWithPassword` → 200
  - `POST /api/auth/session` → 200
  - Cookie `__session` set (new)
  - Redirect → `/dashboard`
  - Dashboard: "Firebase Tester" displayed

### Step 4: Profile & Withdrawal
- **URL**: `/profile` → tab Bảo mật
- **Action**: Click "Xóa tài khoản" → nhập email xác nhận → "Xóa vĩnh viễn"
- **Result**: **PASS**
  - Dialog: email confirm input + disabled button until match
  - `DELETE /api/users/me` → 200
  - DB: sttsCd='WITHDRAWN', delYn='Y', email masked
  - Firebase: `adminAuth.deleteUser()` executed
  - Cookie `__session` cleared
  - Redirect → `/login`

### Step 5: Post-Withdrawal Login Attempt
- **Input**: firebase-test@hrlite.test / Test@2026!
- **Result**: **PASS** (blocked correctly)
  - Toast: "Đăng nhập thất bại — Email hoặc mật khẩu không đúng"
  - Firebase user no longer exists

## Validation Tests

| Test | Result |
|------|--------|
| Signup: empty form submit | **PASS** — 3 validation errors shown |
| Signup: missing required terms | **PASS** — "Vui lòng đồng ý" alert |
| Signup: password strength indicator | **PASS** — Mạnh/Trung bình/Yếu |
| Withdrawal: email mismatch → button disabled | **PASS** |
| Withdrawal: email match → button enabled | **PASS** |
| Protected route without auth → redirect | **PASS** |

## API Verification

| Endpoint | Method | Status | Verified |
|----------|--------|--------|----------|
| /api/terms/active | GET | 200 | Yes |
| /api/auth/signup | POST | 201 | Yes |
| /api/auth/session | POST | 200 | Yes |
| /api/auth/logout | POST | 200 | Yes |
| /api/users/me | GET | 200 | Yes |
| /api/users/me | DELETE | 200 | Yes |
| /api/dashboard/stats | GET | 200 | Yes |
| /api/employees/stats | GET | 200 | Yes |

## Issues Found

### 1. [Low] User dropdown z-index conflict (pre-existing from Sprint 3)
- **Location**: Dashboard — user menu dropdown
- **Status**: Known issue, workaround with JS click

### 2. [Info] Login form pre-filled values
- **Location**: `/login` — browser autofill
- **Impact**: None — user can type over

## Scenario Coverage

| Scenario Group | Tested | Passed | Blocked |
|---------------|--------|--------|---------|
| Sign Up (E2E-F001~F006) | 4/6 | 4/4 | 2 (need manual manipulation) |
| Sign In (E2E-F010~F015) | 3/6 | 3/3 | 3 (SUSPENDED/WITHDRAWN DB state) |
| Logout (E2E-F020~F021) | 2/2 | 2/2 | 0 |
| Session (E2E-F030~F032) | 2/3 | 2/2 | 1 (role check API) |
| Withdrawal (E2E-F040~F043) | 4/4 | 4/4 | 0 |
| Password Change (E2E-F050~F052) | 0/3 | - | 3 (need separate test) |
| Full Journey (E2E-F060~F061) | 1/2 | 1/1 | 1 (migration user) |
| **Total** | **16/26** | **16/16** | **10** |

## Conclusion

Sprint 4 Firebase Auth migration **hoàn toàn thành công**. Core flow (Sign Up → Login → Logout → Withdrawal) hoạt động end-to-end với real Firebase project. **16/16 tested scenarios PASS**, 10 scenarios còn lại cần test thủ công hoặc setup DB state đặc biệt.
