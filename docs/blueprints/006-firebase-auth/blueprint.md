# Blueprint 006: Firebase Authentication Migration

## 1. Overview

### 1.1 Mục tiêu
Chuyển đổi hệ thống xác thực từ **Custom JWT** (jose + bcryptjs) sang **Firebase Authentication**, đồng thời bổ sung chức năng **Withdrawal (xóa tài khoản)** hoàn chỉnh từ phía UI.

### 1.2 Phạm vi

| Chức năng | Mô tả | Ưu tiên |
|-----------|-------|---------|
| Sign Up | Đăng ký bằng Email/Password qua Firebase | Critical |
| Sign In | Đăng nhập bằng Email/Password qua Firebase | Critical |
| Withdrawal | Xóa tài khoản (Firebase + DB soft-delete) | Critical |
| Token Verification | Backend verify Firebase ID Token thay JWT | Critical |
| Session Management | Firebase ID Token + Cookie-based session | Critical |
| Migration Script | Migrate existing users sang Firebase Auth | High |

### 1.3 Ngoài phạm vi (Out of Scope)
- Social login (Google, Facebook, Apple) — giai đoạn sau
- Multi-factor authentication (MFA) — giai đoạn sau
- Phone number authentication — giai đoạn sau
- Password reset qua Firebase (giữ flow hiện tại, chưa implement)

### 1.4 Giá trị kinh doanh
- **Bảo mật**: Firebase xử lý password hashing, token rotation, brute-force protection
- **Scalability**: Không cần quản lý refresh token trong DB
- **Ecosystem**: Nền tảng cho Social Login, MFA, Phone Auth trong tương lai
- **Giảm maintenance**: Loại bỏ code quản lý JWT, bcrypt, rate-limit cho auth

---

## 2. Kiến trúc

### 2.1 Kiến trúc hiện tại (AS-IS)

```
Client                        Server (Next.js)                DB (PostgreSQL)
  │                               │                               │
  │── POST /api/auth/login ──────>│                               │
  │                               │── bcrypt.compare() ──────────>│ TB_COMM_USER
  │                               │── jose.sign(JWT) ─────────────│
  │                               │── store refresh token ────────│ TB_COMM_RFRSH_TKN
  │<── Set-Cookie (access+refresh)│                               │
  │                               │                               │
  │── GET /api/users/me ─────────>│                               │
  │                               │── jose.verify(JWT) ──────────>│
  │<── user data ─────────────────│                               │
```

### 2.2 Kiến trúc mới (TO-BE)

```
Client                    Firebase Auth         Server (Next.js)         DB (PostgreSQL)
  │                           │                      │                       │
  │── signInWithEmail() ─────>│                      │                       │
  │<── Firebase ID Token ─────│                      │                       │
  │                           │                      │                       │
  │── POST /api/auth/session ─│─────────────────────>│                       │
  │   (ID Token in body)      │                      │── admin.verifyIdToken()│
  │                           │                      │── upsert user ────────>│ TB_COMM_USER
  │<── Set-Cookie (session) ──│─────────────────────-│                       │
  │                           │                      │                       │
  │── GET /api/users/me ──────│─────────────────────>│                       │
  │   (Cookie: session)       │                      │── verifySessionCookie()│
  │<── user data ─────────────│─────────────────────-│                       │
```

### 2.3 Nguyên tắc thiết kế

1. **Firebase = Authentication Provider**: Firebase chỉ xử lý xác thực (email/password, token). Dữ liệu profile vẫn nằm trong PostgreSQL.
2. **Server-side Session Cookie**: Dùng Firebase Admin SDK `createSessionCookie()` để tạo session cookie thay vì gửi ID Token mỗi request.
3. **Backward Compatible**: Giữ nguyên API response format `{ success, data, error }`.
4. **Soft Delete**: Withdrawal xóa trên Firebase + soft-delete trên DB (giữ dữ liệu cho audit).
5. **DB vẫn là SSoT**: `TB_COMM_USER` vẫn là source of truth cho profile, role, status. Firebase chỉ quản lý credentials.

---

## 3. Tech Stack

### 3.1 Dependencies mới

| Package | Mục đích | Phía |
|---------|---------|------|
| `firebase` | Client SDK — signIn, signUp, signOut | Frontend |
| `firebase-admin` | Admin SDK — verifyIdToken, createSessionCookie, deleteUser | Backend |

### 3.2 Dependencies loại bỏ

| Package | Lý do |
|---------|-------|
| `bcryptjs` | Firebase xử lý password hashing |
| `@types/bcryptjs` | Không cần type definition nữa |
| `jose` | Firebase Admin SDK verify token, không cần jose |

> **Lưu ý**: `jose` có thể giữ lại nếu cần cho mục đích khác. Tuy nhiên trong phạm vi auth, không cần thiết nữa.

### 3.3 Environment Variables mới

```env
# Firebase Client (public — có thể expose ra frontend)
NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="hrlite-xxx.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="hrlite-xxx"

# Firebase Admin (private — chỉ server-side)
FIREBASE_PROJECT_ID="hrlite-xxx"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@hrlite-xxx.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Session
SESSION_COOKIE_MAX_AGE=432000000  # 5 days in ms
```

### 3.4 Environment Variables loại bỏ

```env
# Không cần nữa
JWT_SECRET
JWT_ACCESS_EXPIRES
JWT_REFRESH_EXPIRES
NEXTAUTH_SECRET
NEXTAUTH_URL
```

---

## 4. Database Changes

### 4.1 TB_COMM_USER — Thay đổi

| Cột | Thay đổi | Mô tả |
|-----|---------|-------|
| `FIREBASE_UID` | **Thêm mới** (VARCHAR 128, UNIQUE, nullable) | Firebase User UID — link giữa Firebase và DB |
| `PASSWD_HASH` | **Nullable** (trước đây required) | Không cần nữa cho user Firebase, giữ cho migration |

```sql
-- Migration
ALTER TABLE "TB_COMM_USER"
  ADD COLUMN "FIREBASE_UID" VARCHAR(128) UNIQUE;

ALTER TABLE "TB_COMM_USER"
  ALTER COLUMN "PASSWD_HASH" DROP NOT NULL;

CREATE INDEX "IDX_USER_FIREBASE_UID" ON "TB_COMM_USER" ("FIREBASE_UID");
```

### 4.2 TB_COMM_RFRSH_TKN — Deprecated

| Thay đổi | Mô tả |
|---------|-------|
| **Giữ nguyên bảng** | Không xóa — giữ dữ liệu lịch sử |
| **Không ghi mới** | Code mới không tạo refresh token trong DB |
| **Cleanup sau** | Xóa bảng + model Prisma sau khi migration hoàn tất và ổn định (Sprint 5+) |

### 4.3 Prisma Schema Update

```prisma
model User {
  id          String   @id @default(uuid()) @map("USER_ID") @db.Uuid
  firebaseUid String?  @unique @map("FIREBASE_UID") @db.VarChar(128)
  email       String   @unique @map("EMAIL") @db.VarChar(255)
  passwdHash  String?  @map("PASSWD_HASH") @db.VarChar(255)  // nullable now
  displayName String?  @map("DSPL_NM") @db.VarChar(100)
  phone       String?  @map("TELNO") @db.VarChar(20)
  photoUrl    String?  @map("PHOTO_URL") @db.VarChar(500)
  roleCd      String   @default("USER") @map("ROLE_CD") @db.VarChar(20)
  sttsCd      String   @default("ACTIVE") @map("STTS_CD") @db.VarChar(20)
  // ... rest unchanged
}
```

---

## 5. API Design

### 5.1 Endpoints — Thay đổi

| Endpoint | Hiện tại | Mới | Thay đổi |
|----------|---------|-----|---------|
| `POST /api/auth/signup` | bcrypt hash + JWT issue | Firebase createUser + session cookie | **Viết lại** |
| `POST /api/auth/login` | bcrypt verify + JWT issue | Nhận Firebase ID Token → session cookie | **Viết lại** |
| `POST /api/auth/logout` | Revoke refresh token + clear cookies | Revoke session + clear cookies | **Sửa** |
| `POST /api/auth/refresh` | JWT rotation | **Xóa** — Firebase tự quản lý | **Xóa** |
| `POST /api/auth/session` | *Mới* | Tạo session cookie từ ID Token | **Mới** |
| `DELETE /api/auth/withdraw` | *Mới* | Xóa tài khoản Firebase + DB soft-delete | **Mới** |
| `GET /api/users/me` | JWT verify | Session cookie verify | **Sửa middleware** |

### 5.2 POST /api/auth/signup

**Flow mới:**

```
1. Client gọi Firebase SDK: createUserWithEmailAndPassword(email, password)
2. Firebase trả về UserCredential (bao gồm ID Token)
3. Client gọi POST /api/auth/signup với ID Token + metadata
4. Server:
   a. admin.auth().verifyIdToken(idToken)
   b. Kiểm tra email chưa tồn tại trong DB (hoặc tồn tại nhưng chưa link Firebase)
   c. Tạo/update TB_COMM_USER với firebaseUid
   d. Tạo UserAgreement cho terms đã đồng ý
   e. admin.auth().createSessionCookie(idToken, { expiresIn })
   f. Set-Cookie: __session (HttpOnly, Secure, SameSite=Lax)
5. Response: { success: true, data: { user, pendingTerms } }
```

**Request:**
```typescript
// POST /api/auth/signup
{
  idToken: string;           // Firebase ID Token
  displayName?: string;      // Tên hiển thị
  agreedTermsIds: string[];  // Danh sách ID điều khoản đã đồng ý
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      displayName: string | null;
      role: string;
      status: string;
    }
  }
}
```

**Error Cases:**
| Status | Error | Mô tả |
|--------|-------|-------|
| 400 | Invalid ID Token | Token không hợp lệ hoặc expired |
| 400 | Missing required terms | Chưa đồng ý đủ điều khoản bắt buộc |
| 409 | Email already exists | Email đã đăng ký trong DB |

### 5.3 POST /api/auth/session

**Flow mới (dùng cho Sign In):**

```
1. Client gọi Firebase SDK: signInWithEmailAndPassword(email, password)
2. Firebase trả về UserCredential + ID Token
3. Client gọi POST /api/auth/session với ID Token
4. Server:
   a. admin.auth().verifyIdToken(idToken)
   b. Tìm user trong DB bằng firebaseUid
   c. Kiểm tra sttsCd = 'ACTIVE', delYn = 'N'
   d. Kiểm tra pending required terms
   e. Cập nhật lastLoginDt
   f. admin.auth().createSessionCookie(idToken, { expiresIn: 5 days })
   g. Set-Cookie: __session
5. Response: { success: true, data: { user, pendingTerms } }
```

**Request:**
```typescript
// POST /api/auth/session
{
  idToken: string;  // Firebase ID Token
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      displayName: string | null;
      role: string;
      status: string;
      lastLoginAt: string;
    },
    pendingTerms: Array<{ id: string; title: string; type: string }> | null
  }
}
```

**Error Cases:**
| Status | Error | Mô tả |
|--------|-------|-------|
| 400 | Invalid ID Token | Token không hợp lệ |
| 401 | Account not found | Firebase UID chưa link với DB user |
| 403 | Account suspended | Tài khoản bị đình chỉ |
| 403 | Account withdrawn | Tài khoản đã xóa |

### 5.4 POST /api/auth/logout

**Flow mới:**

```
1. Client gọi Firebase SDK: signOut()
2. Client gọi POST /api/auth/logout
3. Server:
   a. Lấy session cookie
   b. admin.auth().verifySessionCookie(sessionCookie)
   c. admin.auth().revokeRefreshTokens(uid)  // Revoke Firebase tokens
   d. Clear cookie __session (maxAge=0)
4. Response: { success: true, data: { message: 'Đăng xuất thành công' } }
```

### 5.5 DELETE /api/auth/withdraw

**Flow Withdrawal:**

```
1. Client hiển thị dialog xác nhận
2. Client gọi Firebase SDK: signOut() (local)
3. Client gọi DELETE /api/auth/withdraw
4. Server (requires auth):
   a. Verify session cookie → lấy firebaseUid
   b. Tìm user trong DB
   c. Transaction:
      - DB: Set sttsCd = 'WITHDRAWN'
      - DB: Set delYn = 'Y', deleteDt = now()
      - DB: Set withdrawDt = now()
      - DB: Mask email → 'withdrawn_{userId}@deleted.local'
      - DB: Clear phone, photoUrl
      - DB: Discard all refresh tokens (legacy)
   d. Firebase: admin.auth().deleteUser(firebaseUid)
   e. Clear cookie __session
5. Response: { success: true, data: { message: 'Tài khoản đã được xóa' } }
```

**Request:**
```typescript
// DELETE /api/auth/withdraw
// Headers: Cookie: __session=...
// Body: không cần (xác thực qua session)
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    message: "Tài khoản đã được xóa thành công"
  }
}
```

**Error Cases:**
| Status | Error | Mô tả |
|--------|-------|-------|
| 401 | Not authenticated | Session không hợp lệ |
| 404 | User not found | User không tồn tại trong DB |
| 500 | Firebase delete failed | Lỗi khi xóa user trên Firebase |

> **Lưu ý bảo mật**: Firebase deleteUser() trên server-side KHÔNG yêu cầu re-authentication. Trong production nên cân nhắc yêu cầu nhập lại mật khẩu trước khi withdraw.

---

## 6. Frontend Changes

### 6.1 Firebase Client Setup

```
src/lib/firebase/
├── config.ts          # Firebase app initialization
├── auth.ts            # Auth helper functions (signIn, signUp, signOut)
```

**config.ts:**
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
```

**auth.ts:**
```typescript
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './config';

export async function firebaseSignUp(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();
  return { idToken, uid: credential.user.uid };
}

export async function firebaseSignIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();
  return { idToken, uid: credential.user.uid };
}

export async function firebaseSignOut() {
  return signOut(auth);
}
```

### 6.2 Auth Context — Thay đổi

**Thay đổi chính trong `src/lib/auth/auth-context.tsx`:**

| Hiện tại | Mới |
|---------|-----|
| Fetch `/api/users/me` on mount | Giữ nguyên — session cookie tự gửi |
| Retry with `/api/auth/refresh` | **Xóa** — Firebase tự refresh ID Token |
| `logout()` calls `/api/auth/logout` | `logout()` calls `firebaseSignOut()` + `/api/auth/logout` |

### 6.3 Login Page — Thay đổi

**Flow mới:**
```
1. User nhập email + password
2. Gọi firebaseSignIn(email, password)
3. Nếu thành công → gọi POST /api/auth/session { idToken }
4. Nếu có pendingTerms → redirect /terms/agree
5. Redirect → /dashboard
```

**Error handling:**
| Firebase Error Code | Hiển thị |
|-------------------|---------|
| `auth/user-not-found` | "Email chưa được đăng ký" |
| `auth/wrong-password` | "Mật khẩu không đúng" |
| `auth/invalid-email` | "Email không hợp lệ" |
| `auth/user-disabled` | "Tài khoản đã bị vô hiệu hóa" |
| `auth/too-many-requests` | "Quá nhiều lần thử. Vui lòng thử lại sau" |

### 6.4 Signup Page — Thay đổi

**Flow mới:**
```
1. User nhập name + email + password + confirm password
2. Client-side validation (Zod — giữ nguyên)
3. Fetch active terms → hiển thị checkbox
4. Gọi firebaseSignUp(email, password)
5. Nếu thành công → gọi POST /api/auth/signup { idToken, displayName, agreedTermsIds }
6. Nếu server error → gọi Firebase deleteUser() để rollback
7. Redirect → /dashboard
```

**Rollback strategy:**
Nếu Firebase signup thành công nhưng server-side (DB) thất bại, cần xóa user Firebase để tránh orphan account:
```typescript
try {
  const { idToken } = await firebaseSignUp(email, password);
  await fetch('/api/auth/signup', { body: { idToken, ... } });
} catch (serverError) {
  // Rollback: xóa user Firebase vừa tạo
  await auth.currentUser?.delete();
  throw serverError;
}
```

### 6.5 Withdrawal UI — Mới

**Vị trí**: Tab "Bảo mật" trong trang Profile (`/profile`)

**UI Components:**
```
[Tab Bảo mật]
├── Đổi mật khẩu (existing placeholder)
└── Vùng nguy hiểm
    ├── Heading: "Xóa tài khoản"
    ├── Mô tả: "Hành động này không thể hoàn tác. Tất cả dữ liệu..."
    └── Button: "Xóa tài khoản" (đỏ, destructive)
        └── Dialog xác nhận
            ├── Title: "Xác nhận xóa tài khoản"
            ├── Mô tả: "Nhập email xác nhận để xóa tài khoản"
            ├── Input: email xác nhận (phải khớp email hiện tại)
            ├── Button "Hủy"
            └── Button "Xóa vĩnh viễn" (đỏ, disabled khi email chưa khớp)
```

**Flow:**
```
1. User click "Xóa tài khoản" → hiển thị dialog
2. User nhập email xác nhận
3. Kiểm tra email khớp → enable nút "Xóa vĩnh viễn"
4. User click "Xóa vĩnh viễn"
5. Gọi DELETE /api/auth/withdraw
6. Nếu thành công → redirect /login với toast "Tài khoản đã được xóa"
7. Firebase signOut (clear local state)
```

---

## 7. Backend Changes

### 7.1 Firebase Admin Setup

```
src/lib/firebase/
├── admin.ts           # Firebase Admin SDK initialization
```

**admin.ts:**
```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();
```

### 7.2 Middleware — Thay đổi

**`src/lib/auth/middleware.ts` — viết lại:**

```typescript
// Trước: jose.verify(accessToken)
// Sau: adminAuth.verifySessionCookie(sessionCookie)

async function withAuth(handler) {
  return async (req) => {
    const sessionCookie = req.cookies.get('__session')?.value;
    if (!sessionCookie) return 401;

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    // true = check if revoked

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid }
    });
    if (!user || user.sttsCd !== 'ACTIVE') return 401;

    req.user = {
      sub: user.id,
      email: user.email,
      role: user.roleCd,
      firebaseUid: decoded.uid,
    };

    return handler(req);
  };
}
```

### 7.3 Files loại bỏ / deprecated

| File | Action | Lý do |
|------|--------|-------|
| `src/lib/auth/jwt.ts` | **Xóa** | Firebase thay thế JWT management |
| `src/lib/auth/password.ts` | **Xóa** | Firebase xử lý password |
| `src/lib/auth/rate-limit.ts` | **Giữ** | Vẫn cần rate-limit cho API endpoints |
| `src/app/api/auth/refresh/route.ts` | **Xóa** | Firebase tự refresh token |
| `src/app/api/auth/login/route.ts` | **Xóa** | Thay bằng /api/auth/session |

### 7.4 Directory Structure mới

```
src/
├── lib/
│   ├── firebase/
│   │   ├── config.ts              # [MỚI] Firebase Client SDK config
│   │   ├── auth.ts                # [MỚI] Client auth helpers
│   │   └── admin.ts               # [MỚI] Firebase Admin SDK config
│   ├── auth/
│   │   ├── middleware.ts           # [SỬA] Firebase session verification
│   │   ├── validation.ts          # [SỬA] Cập nhật schemas
│   │   ├── rate-limit.ts          # [GIỮ] Rate limiting
│   │   ├── auth-context.tsx        # [SỬA] Firebase integration
│   │   ├── jwt.ts                 # [XÓA]
│   │   └── password.ts            # [XÓA]
│   └── ...
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # [SỬA] Firebase signIn
│   │   └── signup/page.tsx         # [SỬA] Firebase signUp
│   └── api/
│       └── auth/
│           ├── session/route.ts    # [MỚI] Create session from ID Token
│           ├── signup/route.ts     # [SỬA] Firebase user registration
│           ├── logout/route.ts     # [SỬA] Revoke Firebase session
│           ├── withdraw/route.ts   # [MỚI] Account withdrawal
│           ├── login/route.ts      # [XÓA]
│           └── refresh/route.ts    # [XÓA]
```

---

## 8. Migration Strategy

### 8.1 User Migration Script

Cần migrate existing users từ DB sang Firebase Auth:

```
scripts/migrate-to-firebase.ts
```

**Flow:**
```
1. Đọc tất cả user từ TB_COMM_USER (sttsCd = 'ACTIVE', delYn = 'N')
2. Với mỗi user:
   a. Gọi admin.auth().importUsers([{
        uid: generateUid(),  // hoặc dùng user.id
        email: user.email,
        passwordHash: Buffer.from(user.passwdHash),
        passwordSalt: Buffer.from(''),  // bcrypt tự chứa salt
      }], {
        hash: { algorithm: 'BCRYPT' }
      })
   b. Update TB_COMM_USER set FIREBASE_UID = uid
3. Log kết quả: success count, error count, error details
```

> **Lưu ý**: Firebase Admin SDK hỗ trợ import bcrypt hash trực tiếp, nên user KHÔNG cần đặt lại mật khẩu.

### 8.2 Chiến lược rollback

Nếu migration thất bại:
1. `FIREBASE_UID` là nullable → có thể revert code về custom JWT
2. `PASSWD_HASH` vẫn giữ nguyên → login bằng bcrypt vẫn hoạt động
3. `TB_COMM_RFRSH_TKN` vẫn tồn tại → refresh token logic vẫn chạy

### 8.3 Thứ tự deploy

```
Phase 1: DB Migration
  └── Thêm cột FIREBASE_UID (nullable)
  └── ALTER PASSWD_HASH nullable

Phase 2: Firebase Setup
  └── Tạo Firebase project
  └── Config environment variables
  └── Deploy Firebase Admin SDK

Phase 3: User Migration
  └── Chạy migration script (import bcrypt hashes)
  └── Verify: mỗi user có FIREBASE_UID

Phase 4: Code Deploy
  └── Deploy code mới (Firebase auth flow)
  └── Smoke test: signup, signin, logout, withdraw

Phase 5: Cleanup (Sprint 5+)
  └── Xóa TB_COMM_RFRSH_TKN model
  └── Xóa PASSWD_HASH column
  └── Xóa dependencies: bcryptjs, jose
```

---

## 9. Security

### 9.1 So sánh bảo mật

| Hạng mục | Custom JWT (hiện tại) | Firebase Auth (mới) |
|----------|----------------------|-------------------|
| Password hashing | bcrypt cost 12 | scrypt (Firebase managed) |
| Token type | HS256 JWT | RS256 JWT (Firebase ID Token) |
| Token rotation | Manual (refresh endpoint) | Automatic (Firebase SDK) |
| Brute-force protection | Custom rate-limit (in-memory) | Firebase built-in + custom rate-limit |
| Token revocation | DB lookup (dscdDt) | Firebase Admin revokeRefreshTokens() |
| Session management | Access + Refresh cookies | Session cookie (Firebase Admin) |
| XSS protection | HttpOnly cookies | HttpOnly cookies |

### 9.2 Session Cookie Configuration

```typescript
const sessionCookieOptions = {
  name: '__session',      // Firebase Hosting convention
  maxAge: 5 * 24 * 60 * 60 * 1000,  // 5 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
```

### 9.3 Withdrawal Security

- Server-side xóa (không tin tưởng client)
- Email confirmation match trước khi xóa
- Transaction: DB soft-delete trước → Firebase delete sau
- Nếu Firebase delete fail → DB đã soft-delete, user không thể login
- Audit trail: `withdrawDt`, `deleteDt` lưu trong DB

---

## 10. Cookie Policy

### 10.1 Cookie hiện tại (XÓA)

| Cookie | Action |
|--------|--------|
| `access_token` | Xóa — không dùng nữa |
| `refresh_token` | Xóa — không dùng nữa |

### 10.2 Cookie mới

| Cookie | Giá trị | MaxAge | HttpOnly | Secure | SameSite |
|--------|---------|--------|----------|--------|----------|
| `__session` | Firebase session cookie | 5 days | Yes | Yes (prod) | Lax |

> **Tại sao `__session`?** Firebase Hosting chỉ forward cookie có tên `__session` đến Cloud Functions. Dùng tên này để tương thích nếu deploy lên Firebase Hosting sau này.

---

## 11. Error Handling

### 11.1 Firebase Error Mapping

```typescript
function mapFirebaseError(error: FirebaseError): { status: number; message: string } {
  switch (error.code) {
    // Sign In
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return { status: 401, message: 'Email hoặc mật khẩu không đúng' };
    case 'auth/user-disabled':
      return { status: 403, message: 'Tài khoản đã bị vô hiệu hóa' };
    case 'auth/too-many-requests':
      return { status: 429, message: 'Quá nhiều lần thử. Vui lòng thử lại sau' };

    // Sign Up
    case 'auth/email-already-in-use':
      return { status: 409, message: 'Email đã được sử dụng' };
    case 'auth/weak-password':
      return { status: 400, message: 'Mật khẩu quá yếu. Tối thiểu 6 ký tự' };
    case 'auth/invalid-email':
      return { status: 400, message: 'Email không hợp lệ' };

    // Session
    case 'auth/session-cookie-expired':
      return { status: 401, message: 'Phiên đăng nhập hết hạn' };
    case 'auth/session-cookie-revoked':
      return { status: 401, message: 'Phiên đăng nhập đã bị thu hồi' };

    default:
      return { status: 500, message: 'Đã xảy ra lỗi xác thực' };
  }
}
```

---

## 12. Testing

### 12.1 Firebase Emulator

Dùng Firebase Auth Emulator cho development & testing:

```json
// firebase.json
{
  "emulators": {
    "auth": { "port": 9099 }
  }
}
```

```env
# .env.test
FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
```

### 12.2 Test Cases

| ID | Test Case | Type | Priority |
|----|-----------|------|----------|
| TC-F001 | Sign Up thành công (email + password + terms) | Happy Path | Critical |
| TC-F002 | Sign Up email trùng → error 409 | Error Path | High |
| TC-F003 | Sign Up mật khẩu yếu → Firebase error | Error Path | High |
| TC-F004 | Sign Up thiếu terms bắt buộc → error 400 | Error Path | High |
| TC-F005 | Sign Up server fail → rollback Firebase user | Error Path | Critical |
| TC-F006 | Sign In thành công → session cookie set | Happy Path | Critical |
| TC-F007 | Sign In sai password → error 401 | Error Path | High |
| TC-F008 | Sign In tài khoản WITHDRAWN → error 403 | Error Path | High |
| TC-F009 | Sign In tài khoản SUSPENDED → error 403 | Error Path | High |
| TC-F010 | Logout → cookie cleared + Firebase token revoked | Happy Path | Critical |
| TC-F011 | Withdrawal thành công → DB soft-delete + Firebase delete | Happy Path | Critical |
| TC-F012 | Withdrawal xác nhận email không khớp → block | Error Path | High |
| TC-F013 | Session cookie expired → redirect login | Edge Case | High |
| TC-F014 | Protected route without session → 401 | Security | Critical |
| TC-F015 | Admin route với user role → 403 | Security | High |
| TC-F016 | Migration script: bcrypt hash import thành công | Migration | Critical |

---

## 13. Implementation Plan

### Phase 1: Infrastructure (Prompt 1-2)

| # | Task | File(s) |
|---|------|---------|
| 1.1 | Tạo Firebase project & lấy credentials | Firebase Console |
| 1.2 | Thêm environment variables | `.env`, `.env.example` |
| 1.3 | Prisma migration: thêm `firebaseUid`, nullable `passwdHash` | `prisma/schema.prisma` |
| 1.4 | Setup Firebase Admin SDK | `src/lib/firebase/admin.ts` |
| 1.5 | Setup Firebase Client SDK | `src/lib/firebase/config.ts`, `auth.ts` |
| 1.6 | Install packages: `firebase`, `firebase-admin` | `package.json` |

### Phase 2: Backend API (Prompt 3-5)

| # | Task | File(s) |
|---|------|---------|
| 2.1 | Viết lại auth middleware (session cookie verify) | `src/lib/auth/middleware.ts` |
| 2.2 | Tạo `POST /api/auth/session` | `src/app/api/auth/session/route.ts` |
| 2.3 | Viết lại `POST /api/auth/signup` | `src/app/api/auth/signup/route.ts` |
| 2.4 | Viết lại `POST /api/auth/logout` | `src/app/api/auth/logout/route.ts` |
| 2.5 | Tạo `DELETE /api/auth/withdraw` | `src/app/api/auth/withdraw/route.ts` |
| 2.6 | Cập nhật validation schemas | `src/lib/auth/validation.ts` |
| 2.7 | Xóa `login/route.ts`, `refresh/route.ts` | `src/app/api/auth/` |
| 2.8 | Xóa `jwt.ts`, `password.ts` | `src/lib/auth/` |

### Phase 3: Frontend (Prompt 6-8)

| # | Task | File(s) |
|---|------|---------|
| 3.1 | Cập nhật Auth Context | `src/lib/auth/auth-context.tsx` |
| 3.2 | Viết lại Login page | `src/app/(auth)/login/page.tsx` |
| 3.3 | Viết lại Signup page | `src/app/(auth)/signup/page.tsx` |
| 3.4 | Thêm Withdrawal UI vào Profile | `src/app/(dashboard)/profile/page.tsx` |
| 3.5 | Firebase error mapping (client-side) | `src/lib/firebase/errors.ts` |

### Phase 4: Migration & Testing (Prompt 9-10)

| # | Task | File(s) |
|---|------|---------|
| 4.1 | Viết migration script | `scripts/migrate-to-firebase.ts` |
| 4.2 | Chạy migration trên dev DB | - |
| 4.3 | E2E test: signup → login → logout → withdraw | Browser test |
| 4.4 | Test migration users có thể login | Browser test |

---

## 14. Acceptance Criteria

### Sign Up
- [ ] User tạo tài khoản mới bằng email + password qua Firebase
- [ ] User record được tạo trong DB với `firebaseUid`
- [ ] Session cookie được set sau khi signup thành công
- [ ] Nếu server-side thất bại, Firebase user được rollback (xóa)
- [ ] Terms agreement được ghi nhận
- [ ] Redirect về Dashboard sau signup

### Sign In
- [ ] User đăng nhập bằng email + password qua Firebase
- [ ] Session cookie (5 days) được set
- [ ] `lastLoginDt` cập nhật trong DB
- [ ] Pending required terms được trả về nếu có
- [ ] Error message đúng cho từng loại lỗi (sai password, account disabled, v.v.)

### Withdrawal
- [ ] Dialog xác nhận yêu cầu nhập email
- [ ] Nút "Xóa vĩnh viễn" chỉ enable khi email khớp
- [ ] DB: `sttsCd = 'WITHDRAWN'`, `delYn = 'Y'`, email masked
- [ ] Firebase: user bị xóa hoàn toàn
- [ ] Session cookie cleared
- [ ] Redirect về /login với thông báo

### General
- [ ] Tất cả protected routes vẫn hoạt động với session cookie
- [ ] Admin routes vẫn check role đúng
- [ ] Existing users (migration) có thể login bình thường
- [ ] 0 console errors
- [ ] Rate limiting vẫn hoạt động

---

## 15. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Firebase service outage | Auth không hoạt động | Low | Firebase SLA 99.95%, retry logic |
| Migration script lỗi | User không login được | Medium | Chạy dry-run trước, backup DB |
| Orphan Firebase accounts | Email conflict khi re-register | Medium | Cleanup script, rollback on server error |
| Session cookie expired mid-work | UX gián đoạn | Low | Auto-refresh trước khi hết hạn |
| Firebase pricing tăng | Chi phí vận hành | Low | Free tier: 10K auth/month, đủ cho nội bộ |

---

## 16. References

- [Firebase Auth Web SDK](https://firebase.google.com/docs/auth/web/start)
- [Firebase Admin SDK - Node.js](https://firebase.google.com/docs/admin/setup)
- [Firebase Session Cookies](https://firebase.google.com/docs/auth/admin/manage-cookies)
- [Firebase Import Users (bcrypt)](https://firebase.google.com/docs/auth/admin/import-users#import_users_with_bcrypt_hashed_passwords)
- Blueprint 001-auth: `docs/blueprints/001-auth/blueprint.md`
- Database Design: `docs/database/database-design.md`
