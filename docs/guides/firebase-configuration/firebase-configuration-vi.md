# Cấu hình Firebase trong dự án HRLite

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Các dịch vụ Firebase sử dụng](#2-các-dịch-vụ-firebase-sử-dụng)
3. [Cài đặt phụ thuộc](#3-cài-đặt-phụ-thuộc)
4. [Biến môi trường](#4-biến-môi-trường)
5. [Cấu hình Client SDK](#5-cấu-hình-client-sdk)
6. [Cấu hình Admin SDK](#6-cấu-hình-admin-sdk)
7. [Tích hợp cơ sở dữ liệu](#7-tích-hợp-cơ-sở-dữ-liệu)
8. [Luồng xác thực](#8-luồng-xác-thực)
9. [API Endpoints](#9-api-endpoints)
10. [Middleware xác thực](#10-middleware-xác-thực)
11. [Xử lý lỗi](#11-xử-lý-lỗi)
12. [Di chuyển dữ liệu](#12-di-chuyển-dữ-liệu)
13. [Cấu trúc file](#13-cấu-trúc-file)
14. [Hướng dẫn thiết lập Firebase Console](#14-hướng-dẫn-thiết-lập-firebase-console)
15. [Xử lý sự cố thường gặp](#15-xử-lý-sự-cố-thường-gặp)

---

## 1. Tổng quan

HRLite sử dụng **Firebase Authentication** làm nhà cung cấp xác thực chính. Firebase xử lý toàn bộ việc quản lý mật khẩu, tạo token và xác thực người dùng, trong khi PostgreSQL lưu trữ dữ liệu nghiệp vụ của người dùng.

### Kiến trúc tổng thể

```
[Client (Next.js)]
       │
       ├── Firebase Client SDK ──→ Firebase Auth (Google Cloud)
       │         │
       │    ID Token
       │         │
       ▼         ▼
[API Routes (Next.js)]
       │
       ├── Firebase Admin SDK ──→ Xác minh Token / Quản lý Session
       │
       ▼
[PostgreSQL] ←── Prisma ORM ──→ Dữ liệu người dùng (firebaseUid liên kết)
```

### Thông tin dự án Firebase

| Thuộc tính | Giá trị |
|-----------|---------|
| Project ID | `hungnd-bb801` |
| Auth Domain | `hungnd-bb801.firebaseapp.com` |
| Phương thức đăng nhập | Email/Password, Google OAuth 2.0 |

---

## 2. Các dịch vụ Firebase sử dụng

| Dịch vụ | Mục đích | SDK |
|---------|---------|-----|
| Authentication | Đăng ký, đăng nhập, quản lý mật khẩu | Client SDK + Admin SDK |
| Google Sign-In | Đăng nhập bằng tài khoản Google | Client SDK |
| Session Cookie | Quản lý phiên đăng nhập phía server | Admin SDK |
| Token Verification | Xác minh ID token từ client | Admin SDK |
| User Management | Xóa tài khoản, thu hồi token | Admin SDK |

---

## 3. Cài đặt phụ thuộc

### Package đã cài đặt

```json
{
  "dependencies": {
    "firebase": "^12.11.0",
    "firebase-admin": "^13.7.0"
  }
}
```

### Cài đặt mới (nếu cần)

```bash
npm install firebase firebase-admin
```

- **firebase**: Client SDK - sử dụng trên trình duyệt (đăng ký, đăng nhập, đổi mật khẩu)
- **firebase-admin**: Admin SDK - sử dụng phía server (xác minh token, quản lý session, xóa user)

---

## 4. Biến môi trường

### File: `.env`

```env
# Firebase Client (Public - hiển thị trên trình duyệt)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Firebase Admin (Private - chỉ phía server)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Session
SESSION_COOKIE_MAX_AGE=432000  # 5 ngày (tính bằng giây)
```

### Lưu ý quan trọng

- Biến có tiền tố `NEXT_PUBLIC_` sẽ được bundle vào client code, đây là thiết kế có chủ đích của Firebase
- `FIREBASE_PRIVATE_KEY` phải được bọc trong dấu ngoặc kép và giữ nguyên ký tự `\n`
- **KHÔNG BAO GIỜ** commit file `.env` vào git

---

## 5. Cấu hình Client SDK

### File: `src/lib/firebase/config.ts`

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Tránh khởi tạo trùng lặp trong Next.js (hot reload)
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const firebaseAuth = getAuth(app);
```

### Giải thích

- `getApps()` kiểm tra xem Firebase đã được khởi tạo chưa, tránh lỗi khi Next.js hot reload
- `firebaseAuth` được export để sử dụng trong các hàm xác thực phía client

---

## 6. Cấu hình Admin SDK

### File: `src/lib/firebase/admin.ts`

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

### Giải thích

- Admin SDK sử dụng **Service Account** để xác thực, có quyền quản lý toàn bộ Firebase Auth
- `privateKey.replace(/\\n/g, '\n')` chuyển đổi ký tự escape trong biến môi trường thành xuống dòng thực
- `adminAuth` được export để xác minh token, tạo session cookie, xóa user

---

## 7. Tích hợp cơ sở dữ liệu

### Prisma Schema

```prisma
model User {
  id          String    @id @default(uuid()) @map("USER_ID")
  firebaseUid String?   @unique @map("FIREBASE_UID") @db.VarChar(128)
  email       String    @unique @map("EML_ADDR")
  passwdHash  String?   @map("PASSWD_HASH")  // Nullable cho user Firebase
  // ... các trường khác
}
```

### Mối quan hệ Firebase - PostgreSQL

| Firebase Auth | PostgreSQL (TB_COMM_USER) | Mô tả |
|--------------|--------------------------|-------|
| uid | FIREBASE_UID | Mã định danh Firebase |
| email | EML_ADDR | Địa chỉ email |
| (managed by Firebase) | PASSWD_HASH | Null cho user Firebase |
| (no equivalent) | ROLE_CD | Vai trò người dùng |
| (no equivalent) | DEPT_CD | Mã phòng ban |

- Firebase quản lý xác thực (mật khẩu, token)
- PostgreSQL quản lý dữ liệu nghiệp vụ (vai trò, phòng ban, thông tin cá nhân)

---

## 8. Luồng xác thực

### 8.1 Đăng ký bằng Email/Password

```
1. Client: firebaseSignUp(email, password)
   └→ Firebase tạo user → Trả về ID Token

2. Client: POST /api/auth/signup (gửi ID Token)
   └→ Server: adminAuth.verifyIdToken(token)
   └→ Server: Tạo user trong PostgreSQL (với firebaseUid)
   └→ Server: adminAuth.createSessionCookie(token)
   └→ Server: Set cookie → Trả về user data

3. Nếu tạo user trong DB thất bại:
   └→ Client: Xóa user Firebase (rollback)
```

### 8.2 Đăng nhập bằng Email/Password

```
1. Client: firebaseSignIn(email, password)
   └→ Firebase xác minh → Trả về ID Token

2. Client: POST /api/auth/session (gửi ID Token)
   └→ Server: adminAuth.verifyIdToken(token)
   └→ Server: Tìm user trong DB bằng firebaseUid
   └→ Server: adminAuth.createSessionCookie(token)
   └→ Server: Set cookie → Trả về user data
```

### 8.3 Đăng nhập bằng Google

```
1. Client: firebaseGoogleSignIn()
   └→ Popup Google OAuth → Firebase nhận credential → ID Token

2. Client: POST /api/auth/session (gửi ID Token)
   └→ Server: adminAuth.verifyIdToken(token)
   └→ Server: Tìm user trong DB bằng firebaseUid
      ├── Đã có: Đăng nhập bình thường
      └── Chưa có: Tự động đăng ký (nếu đã đồng ý điều khoản)
```

### 8.4 Đăng xuất

```
1. Client: POST /api/auth/logout
   └→ Server: adminAuth.revokeRefreshTokens(uid)
   └→ Server: Xóa session cookie

2. Client: firebaseSignOut()
   └→ Xóa state phía client
```

---

## 9. API Endpoints

| Method | Endpoint | Mô tả | Firebase SDK |
|--------|----------|-------|-------------|
| POST | `/api/auth/signup` | Đăng ký tài khoản mới | `verifyIdToken`, `createSessionCookie` |
| POST | `/api/auth/session` | Tạo session (đăng nhập) | `verifyIdToken`, `createSessionCookie` |
| POST | `/api/auth/logout` | Đăng xuất | `revokeRefreshTokens` |
| GET | `/api/users/me` | Lấy thông tin user hiện tại | `verifySessionCookie` |
| DELETE | `/api/users/me` | Xóa tài khoản | `deleteUser`, `revokeRefreshTokens` |

---

## 10. Middleware xác thực

### File: `src/lib/auth/middleware.ts`

```typescript
// Xác thực user từ session cookie
export async function withAuth(handler) {
  // 1. Lấy session cookie từ request
  // 2. adminAuth.verifySessionCookie(sessionCookie, true)
  // 3. Tìm user trong DB bằng firebaseUid
  // 4. Gọi handler với thông tin user
}

// Kiểm tra vai trò
export async function withRole(roles, handler) {
  // 1. Gọi withAuth trước
  // 2. Kiểm tra user.role có trong danh sách roles
  // 3. Trả về 403 nếu không đủ quyền
}
```

---

## 11. Xử lý lỗi

### File: `src/lib/firebase/errors.ts`

Firebase trả về mã lỗi dạng `auth/error-code`. File này ánh xạ sang thông báo tiếng Việt.

| Mã lỗi Firebase | Thông báo tiếng Việt |
|-----------------|---------------------|
| `auth/email-already-in-use` | Email đã được sử dụng |
| `auth/invalid-credential` | Thông tin đăng nhập không hợp lệ |
| `auth/user-not-found` | Không tìm thấy tài khoản |
| `auth/wrong-password` | Mật khẩu không đúng |
| `auth/too-many-requests` | Quá nhiều yêu cầu, vui lòng thử lại sau |
| `auth/network-request-failed` | Lỗi kết nối mạng |
| `auth/popup-closed-by-user` | Cửa sổ đăng nhập đã bị đóng |
| `auth/weak-password` | Mật khẩu quá yếu (tối thiểu 6 ký tự) |

---

## 12. Di chuyển dữ liệu

### Script: `scripts/migrate-to-firebase.ts`

Script này di chuyển user hiện có (có mật khẩu bcrypt) sang Firebase Auth.

```bash
# Chạy thử (không thay đổi dữ liệu)
npx tsx scripts/migrate-to-firebase.ts --dry-run

# Chạy thật
npx tsx scripts/migrate-to-firebase.ts
```

### Quy trình di chuyển

1. Đọc tất cả user từ PostgreSQL (có `passwdHash`, chưa có `firebaseUid`)
2. Import từng batch (100 user/batch) vào Firebase Auth với password hash
3. Cập nhật `firebaseUid` trong PostgreSQL
4. Báo cáo kết quả (thành công/thất bại)

---

## 13. Cấu trúc file

```
src/lib/firebase/
├── config.ts          # Cấu hình Client SDK (firebaseAuth)
├── admin.ts           # Cấu hình Admin SDK (adminAuth)
├── auth.ts            # Hàm xác thực (signUp, signIn, signOut, ...)
└── errors.ts          # Ánh xạ mã lỗi Firebase → tiếng Việt

src/lib/auth/
├── middleware.ts       # withAuth(), withRole() middleware
└── auth-context.tsx    # React Context cho trạng thái xác thực

src/app/api/auth/
├── signup/route.ts     # API đăng ký
├── session/route.ts    # API tạo session
└── logout/route.ts     # API đăng xuất

scripts/
└── migrate-to-firebase.ts  # Script di chuyển dữ liệu
```

---

## 14. Hướng dẫn thiết lập Firebase Console

### Bước 1: Tạo dự án Firebase

1. Truy cập [Firebase Console](https://console.firebase.google.com)
2. Nhấn **"Add project"** → Nhập tên dự án → Tạo

### Bước 2: Bật phương thức xác thực

1. Vào **Authentication** → **Sign-in method**
2. Bật **Email/Password**
3. Bật **Google** → Cấu hình OAuth consent screen

### Bước 3: Lấy cấu hình Client

1. Vào **Project Settings** → **General**
2. Trong phần **"Your apps"**, nhấn biểu tượng Web (`</>`)
3. Copy các giá trị `apiKey`, `authDomain`, `projectId` vào `.env`

### Bước 4: Tạo Service Account

1. Vào **Project Settings** → **Service accounts**
2. Nhấn **"Generate new private key"**
3. Copy `project_id`, `client_email`, `private_key` vào `.env`

---

## 15. Xử lý sự cố thường gặp

### Lỗi: `auth/configuration-not-found`

**Nguyên nhân**: Biến môi trường `NEXT_PUBLIC_FIREBASE_*` chưa được cấu hình.
**Giải pháp**: Kiểm tra file `.env` và khởi động lại server.

### Lỗi: `Firebase Admin SDK initialization failed`

**Nguyên nhân**: `FIREBASE_PRIVATE_KEY` sai định dạng.
**Giải pháp**: Đảm bảo private key được bọc trong dấu ngoặc kép và chứa `\n`.

### Lỗi: `auth/session-cookie-expired`

**Nguyên nhân**: Session cookie đã hết hạn.
**Giải pháp**: Điều chỉnh `SESSION_COOKIE_MAX_AGE` hoặc redirect về trang đăng nhập.

### Lỗi: `Cannot create user - Firebase user already exists`

**Nguyên nhân**: Email đã đăng ký trên Firebase nhưng chưa có trong PostgreSQL.
**Giải pháp**: Kiểm tra và đồng bộ dữ liệu giữa Firebase Auth và PostgreSQL.

### Lỗi: Google Sign-In popup bị chặn

**Nguyên nhân**: Trình duyệt chặn popup.
**Giải pháp**: Cho phép popup từ domain ứng dụng hoặc chuyển sang `signInWithRedirect`.
