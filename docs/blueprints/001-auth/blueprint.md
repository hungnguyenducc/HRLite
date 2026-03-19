# Blueprint 001: Module Xác thực (Auth)

> Tài liệu thiết kế chi tiết cho module xác thực người dùng — HRLite

## 1. Tổng quan

Module Auth cung cấp chức năng xác thực và phân quyền cho hệ thống quản lý nhân sự nội bộ HRLite.

### Đặc điểm chính
- **Tự triển khai** (self-implemented) — không sử dụng Firebase hay dịch vụ bên thứ ba
- **Mã hóa mật khẩu**: bcrypt với cost factor 12
- **Token xác thực**: JWT (access token + refresh token)
- **Lưu trữ token**: HttpOnly cookies (bảo mật phía client)
- **Quản lý điều khoản**: Người dùng phải đồng ý điều khoản sử dụng khi đăng ký

### Phạm vi
- Đăng ký / Đăng nhập / Đăng xuất
- Làm mới token (refresh token rotation)
- Quản lý hồ sơ người dùng
- Phân quyền theo vai trò (ADMIN, USER)
- Quản lý điều khoản sử dụng (CRUD cho ADMIN)

---

## 2. Kiến trúc

```
┌──────────────────────────────────────────────────────┐
│                    Client (Browser)                   │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐             │
│  │ Login   │  │ Signup  │  │ Profile  │   ...        │
│  └────┬────┘  └────┬────┘  └────┬─────┘             │
│       │            │            │                     │
│       └────────────┼────────────┘                     │
│                    │ HttpOnly Cookies (JWT)           │
└────────────────────┼─────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────┐
│              Next.js 15 (App Router)                  │
│                    │                                  │
│  ┌─────────────────┼────────────────────────┐        │
│  │           API Routes (/api/*)            │        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │        │
│  │  │ /auth/*  │ │ /users/* │ │ /terms/* │ │        │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ │        │
│  └───────┼────────────┼────────────┼────────┘        │
│          │            │            │                  │
│  ┌───────┼────────────┼────────────┼────────┐        │
│  │       │    Auth Middleware (JWT verify)   │        │
│  └───────┼────────────┼────────────┼────────┘        │
│          │            │            │                  │
│  ┌───────┴────────────┴────────────┴────────┐        │
│  │          Prisma ORM (Service Layer)       │        │
│  └──────────────────┬───────────────────────┘        │
└─────────────────────┼────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │ PostgreSQL 16 │
              └───────────────┘
```

### Luồng xác thực tổng quan
1. Client gửi thông tin đăng nhập qua API Route
2. Server xác minh mật khẩu bằng bcrypt
3. Server tạo cặp JWT (access + refresh token)
4. Token được lưu trong HttpOnly cookies
5. Mỗi request tiếp theo, middleware trích xuất và xác minh JWT từ cookie
6. Refresh token rotation khi access token hết hạn

---

## 3. Tech Stack

### Dependencies

| Package | Phiên bản | Mục đích |
|---------|----------|----------|
| `jose` | ^5.x | Tạo và xác minh JWT (hỗ trợ Edge Runtime) |
| `bcryptjs` | ^2.x | Mã hóa và xác minh mật khẩu |
| `zod` | ^3.x | Validation schema cho request body |

### Biến môi trường

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hrlite

# JWT
JWT_SECRET=your-secret-key-at-least-32-characters
JWT_ACCESS_EXPIRES=30m
JWT_REFRESH_EXPIRES=7d
```

| Biến | Bắt buộc | Mô tả |
|------|---------|--------|
| `DATABASE_URL` | Co | Connection string PostgreSQL |
| `JWT_SECRET` | Co | Khoa bi mat ky JWT (toi thieu 32 ky tu) |
| `JWT_ACCESS_EXPIRES` | Co | Thoi han access token (mac dinh: 30m) |
| `JWT_REFRESH_EXPIRES` | Co | Thoi han refresh token (mac dinh: 7d) |

---

## 4. Database Schema

> Chi tiet day du tai `docs/database/database-design.md` — Module Auth.

### 4.1 TB_COMM_USER (Tai khoan nguoi dung)

| Cot | Kieu | Mo ta | Rang buoc |
|-----|------|-------|-----------|
| USER_ID | UUID | ID nguoi dung | PK, DEFAULT gen_random_uuid() |
| EML_ADDR | VARCHAR(255) | Dia chi email | UNIQUE, NOT NULL |
| PASSWD_HASH | VARCHAR(256) | Mat khau da ma hoa (bcrypt) | NOT NULL |
| INDCT_NM | VARCHAR(100) | Ten hien thi | |
| TELNO | VARCHAR(20) | So dien thoai | |
| PHOTO_URL | VARCHAR(500) | URL anh dai dien | |
| ROLE_CD | VARCHAR(20) | Ma vai tro (ADMIN, USER) | NOT NULL, DEFAULT 'USER' |
| STTS_CD | VARCHAR(20) | Ma trang thai (ACTIVE, INACTIVE, SUSPENDED) | NOT NULL, DEFAULT 'ACTIVE' |
| LAST_LOGIN_DT | TIMESTAMP | Thoi gian dang nhap cuoi | |
| WHDWL_DT | TIMESTAMP | Thoi gian rut lui (yeu cau xoa tai khoan) | |
| DEL_DT | TIMESTAMP | Thoi gian xoa | |
| CREAT_DT | TIMESTAMP | Thoi gian tao | NOT NULL, DEFAULT NOW() |
| CREAT_BY | VARCHAR(100) | Nguoi tao | NOT NULL |
| UPDT_DT | TIMESTAMP | Thoi gian cap nhat | |
| UPDT_BY | VARCHAR(100) | Nguoi cap nhat | |
| DEL_YN | CHAR(1) | Da xoa | DEFAULT 'N' |

### 4.2 TB_COMM_TRMS (Dieu khoan su dung)

| Cot | Kieu | Mo ta | Rang buoc |
|-----|------|-------|-----------|
| TRMS_ID | UUID | ID dieu khoan | PK, DEFAULT gen_random_uuid() |
| TY_CD | VARCHAR(20) | Ma loai dieu khoan | NOT NULL |
| VER_NO | INT | So phien ban | NOT NULL |
| TTL | VARCHAR(200) | Tieu de | NOT NULL |
| CN | TEXT | Noi dung | NOT NULL |
| REQD_YN | CHAR(1) | Bat buoc dong y | NOT NULL, DEFAULT 'Y' |
| ENFC_DT | TIMESTAMP | Ngay hieu luc | NOT NULL |
| ACTV_YN | CHAR(1) | Dang hoat dong | DEFAULT 'Y' |
| CREAT_DT | TIMESTAMP | Thoi gian tao | NOT NULL, DEFAULT NOW() |
| CREAT_BY | VARCHAR(100) | Nguoi tao | NOT NULL |
| UPDT_DT | TIMESTAMP | Thoi gian cap nhat | |
| UPDT_BY | VARCHAR(100) | Nguoi cap nhat | |
| DEL_YN | CHAR(1) | Da xoa | DEFAULT 'N' |

### 4.3 TH_COMM_USER_AGRE (Lich su dong y dieu khoan)

| Cot | Kieu | Mo ta | Rang buoc |
|-----|------|-------|-----------|
| AGRE_ID | UUID | ID ban ghi dong y | PK, DEFAULT gen_random_uuid() |
| USER_ID | UUID | ID nguoi dung | FK → TB_COMM_USER, NOT NULL |
| TRMS_ID | UUID | ID dieu khoan | FK → TB_COMM_TRMS, NOT NULL |
| AGRE_YN | CHAR(1) | Da dong y | NOT NULL, DEFAULT 'Y' |
| AGRE_DT | TIMESTAMP | Thoi gian dong y | NOT NULL, DEFAULT NOW() |
| IP_ADDR | VARCHAR(45) | Dia chi IP | |
| CREAT_DT | TIMESTAMP | Thoi gian tao | NOT NULL, DEFAULT NOW() |
| CREAT_BY | VARCHAR(100) | Nguoi tao | NOT NULL |

### 4.4 TB_COMM_RFRSH_TKN (Refresh Token)

| Cot | Kieu | Mo ta | Rang buoc |
|-----|------|-------|-----------|
| TKN_ID | UUID | ID token | PK, DEFAULT gen_random_uuid() |
| USER_ID | UUID | ID nguoi dung | FK → TB_COMM_USER, NOT NULL |
| TKN_HASH | VARCHAR(512) | Hash cua refresh token | NOT NULL |
| EXPR_DT | TIMESTAMP | Thoi gian het han | NOT NULL |
| REVK_YN | CHAR(1) | Da thu hoi | DEFAULT 'N' |
| REVK_DT | TIMESTAMP | Thoi gian thu hoi | |
| USR_AGNT | VARCHAR(500) | User agent cua trinh duyet | |
| IP_ADDR | VARCHAR(45) | Dia chi IP | |
| CREAT_DT | TIMESTAMP | Thoi gian tao | NOT NULL, DEFAULT NOW() |

---

## 5. Thiet ke API

### 5.1 Auth API

#### POST /api/auth/signup
- **Mo ta**: Dang ky tai khoan moi
- **Body**:
  ```json
  {
    "email": "user@company.com",
    "password": "StrongP@ss1",
    "name": "Nguyen Van A",
    "phone": "0901234567",
    "agreedTermsIds": ["uuid-1", "uuid-2"]
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": { "userId": "uuid", "email": "user@company.com" }
  }
  ```
- **Cookies**: Set `access_token`, `refresh_token` (HttpOnly)

#### POST /api/auth/login
- **Mo ta**: Dang nhap bang email/mat khau
- **Body**:
  ```json
  {
    "email": "user@company.com",
    "password": "StrongP@ss1"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": { "userId": "uuid", "email": "user@company.com", "role": "USER" }
  }
  ```
- **Cookies**: Set `access_token`, `refresh_token` (HttpOnly)

#### POST /api/auth/refresh
- **Mo ta**: Lam moi access token bang refresh token
- **Cookies**: Doc `refresh_token` tu cookie
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": { "message": "Token da duoc lam moi" }
  }
  ```
- **Cookies**: Set `access_token`, `refresh_token` moi (rotation)

#### POST /api/auth/logout
- **Mo ta**: Dang xuat, thu hoi refresh token
- **Auth**: Bearer (access token)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": { "message": "Dang xuat thanh cong" }
  }
  ```
- **Cookies**: Xoa `access_token`, `refresh_token`

### 5.2 Users API

#### GET /api/users/me
- **Mo ta**: Lay thong tin ho so nguoi dung hien tai
- **Auth**: Bearer (access token)
- **Response**: `200 OK` — Thong tin user (khong co password)

#### PATCH /api/users/me
- **Mo ta**: Cap nhat ho so ca nhan
- **Auth**: Bearer (access token)
- **Body**: `{ "name": "...", "phone": "...", "photoUrl": "..." }`
- **Response**: `200 OK`

#### DELETE /api/users/me
- **Mo ta**: Yeu cau xoa tai khoan (soft delete, dat WHDWL_DT)
- **Auth**: Bearer (access token)
- **Response**: `200 OK`

#### GET /api/users (ADMIN)
- **Mo ta**: Lay danh sach tat ca nguoi dung
- **Auth**: Bearer (access token, ROLE_CD = 'ADMIN')
- **Query**: `?page=1&limit=20&search=...&status=ACTIVE`
- **Response**: `200 OK` — Danh sach phan trang

#### PATCH /api/users/[id]/role (ADMIN)
- **Mo ta**: Thay doi vai tro nguoi dung
- **Auth**: Bearer (access token, ROLE_CD = 'ADMIN')
- **Body**: `{ "role": "ADMIN" | "USER" }`
- **Response**: `200 OK`

### 5.3 Terms API

#### GET /api/terms/active
- **Mo ta**: Lay danh sach dieu khoan dang hieu luc
- **Auth**: Khong can (public — hien thi khi dang ky)
- **Response**: `200 OK`

#### POST /api/terms/agree
- **Mo ta**: Ghi nhan dong y dieu khoan
- **Auth**: Bearer (access token)
- **Body**: `{ "termsIds": ["uuid-1", "uuid-2"] }`
- **Response**: `201 Created`

#### GET /api/terms/pending
- **Mo ta**: Lay danh sach dieu khoan chua dong y cua nguoi dung hien tai
- **Auth**: Bearer (access token)
- **Response**: `200 OK`

#### GET /api/terms (ADMIN)
- **Mo ta**: Lay tat ca dieu khoan (bao gom khong hoat dong)
- **Auth**: Bearer (ADMIN)

#### POST /api/terms (ADMIN)
- **Mo ta**: Tao dieu khoan moi
- **Auth**: Bearer (ADMIN)
- **Body**: `{ "typeCode": "...", "version": 1, "title": "...", "content": "...", "required": true, "enforceDate": "..." }`

#### PATCH /api/terms/[id] (ADMIN)
- **Mo ta**: Cap nhat dieu khoan
- **Auth**: Bearer (ADMIN)

#### DELETE /api/terms/[id] (ADMIN)
- **Mo ta**: Xoa dieu khoan (soft delete)
- **Auth**: Bearer (ADMIN)

---

## 6. Man hinh

### 6.1 Man hinh cong khai (khong can dang nhap)

| Man hinh | Duong dan | Mo ta |
|----------|----------|-------|
| Dang nhap | `/login` | Form email/mat khau, lien ket "Quen mat khau" |
| Dang ky | `/signup` | Form dang ky + dong y dieu khoan |
| Quen mat khau | `/forgot-password` | Nhap email de dat lai mat khau |

### 6.2 Man hinh nguoi dung (can dang nhap)

| Man hinh | Duong dan | Mo ta |
|----------|----------|-------|
| Ho so ca nhan | `/profile` | Xem va chinh sua thong tin ca nhan |

### 6.3 Man hinh quan tri (ADMIN)

| Man hinh | Duong dan | Mo ta |
|----------|----------|-------|
| Quan ly nguoi dung | `/admin/users` | Danh sach, tim kiem, thay doi vai tro |
| Quan ly dieu khoan | `/admin/terms` | CRUD dieu khoan su dung |

---

## 7. Luong xac thuc

### 7.1 Dang ky (Signup)

```
Client                          Server                         Database
  │                               │                               │
  │  POST /api/auth/signup        │                               │
  │  {email, password, name,      │                               │
  │   agreedTermsIds}             │                               │
  │──────────────────────────────>│                               │
  │                               │  Validate input (zod)         │
  │                               │  Kiem tra email trung lap     │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  bcrypt.hash(password, 12)    │
  │                               │  INSERT TB_COMM_USER          │
  │                               │──────────────────────────────>│
  │                               │  INSERT TH_COMM_USER_AGRE     │
  │                               │──────────────────────────────>│
  │                               │  Tao JWT (access + refresh)   │
  │                               │  INSERT TB_COMM_RFRSH_TKN     │
  │                               │──────────────────────────────>│
  │  Set-Cookie: access_token     │                               │
  │  Set-Cookie: refresh_token    │                               │
  │<──────────────────────────────│                               │
```

### 7.2 Dang nhap (Login)

```
Client                          Server                         Database
  │                               │                               │
  │  POST /api/auth/login         │                               │
  │  {email, password}            │                               │
  │──────────────────────────────>│                               │
  │                               │  Validate input (zod)         │
  │                               │  SELECT TB_COMM_USER          │
  │                               │  WHERE EML_ADDR = email       │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  bcrypt.compare(password,     │
  │                               │    user.PASSWD_HASH)          │
  │                               │  Tao JWT (access + refresh)   │
  │                               │  INSERT TB_COMM_RFRSH_TKN     │
  │                               │──────────────────────────────>│
  │                               │  UPDATE LAST_LOGIN_DT         │
  │                               │──────────────────────────────>│
  │  Set-Cookie: access_token     │                               │
  │  Set-Cookie: refresh_token    │                               │
  │<──────────────────────────────│                               │
```

### 7.3 Lam moi Token (Refresh Token Rotation)

```
Client                          Server                         Database
  │                               │                               │
  │  POST /api/auth/refresh       │                               │
  │  Cookie: refresh_token        │                               │
  │──────────────────────────────>│                               │
  │                               │  Verify JWT refresh token     │
  │                               │  SELECT TB_COMM_RFRSH_TKN     │
  │                               │  WHERE TKN_HASH = hash(token) │
  │                               │  AND REVK_YN = 'N'            │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  Thu hoi token cu (REVK_YN='Y')│
  │                               │──────────────────────────────>│
  │                               │  Tao cap token moi            │
  │                               │  INSERT TB_COMM_RFRSH_TKN moi │
  │                               │──────────────────────────────>│
  │  Set-Cookie: access_token moi │                               │
  │  Set-Cookie: refresh_token moi│                               │
  │<──────────────────────────────│                               │
```

---

## 8. Bao mat

### 8.1 Mat khau
- **bcrypt** voi cost factor **12** (can bang giua bao mat va hieu nang)
- Yeu cau mat khau toi thieu 8 ky tu, bao gom chu hoa, chu thuong, so va ky tu dac biet
- Khong luu mat khau goc (plain text) o bat ky dau

### 8.2 JWT
- Thuat toan: **HS256** (HMAC-SHA256)
- Access token: thoi han **30 phut**
- Refresh token: thoi han **7 ngay**
- Refresh token rotation — moi lan lam moi se tao token moi va thu hoi token cu
- Token bi thu hoi se khong the su dung lai

### 8.3 Cookies
- **HttpOnly**: Ngan JavaScript truy cap token
- **Secure**: Chi gui qua HTTPS (trong production)
- **SameSite=Lax**: Chong CSRF co ban
- **Path=/**: Token kha dung tren toan ung dung

### 8.4 Rate Limiting
- Dang nhap: Toi da **5 lan/phut** theo IP
- Dang ky: Toi da **3 lan/phut** theo IP
- Refresh token: Toi da **10 lan/phut** theo user
- Tra ve HTTP `429 Too Many Requests` khi vuot gioi han

### 8.5 Cac bien phap bo sung
- Validation input nghiem ngat bang **zod** cho moi endpoint
- Khong tra ve thong tin nhay cam trong response (mat khau, token hash)
- Soft delete — khong xoa hoan toan du lieu nguoi dung
- Log cac hanh dong nhay cam (dang nhap, thay doi vai tro, xoa tai khoan)

---

## 9. Cau truc thu muc

```
src/
├── app/
│   ├── (auth)/                     # Route group cho cac trang auth
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (protected)/                # Route group cho trang can dang nhap
│   │   ├── profile/page.tsx
│   │   └── admin/
│   │       ├── users/page.tsx
│   │       └── terms/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── signup/route.ts
│       │   ├── login/route.ts
│       │   ├── refresh/route.ts
│       │   └── logout/route.ts
│       ├── users/
│       │   ├── me/route.ts
│       │   ├── route.ts            # GET danh sach (ADMIN)
│       │   └── [id]/
│       │       └── role/route.ts   # PATCH vai tro (ADMIN)
│       └── terms/
│           ├── active/route.ts
│           ├── agree/route.ts
│           ├── pending/route.ts
│           ├── route.ts            # GET/POST (ADMIN)
│           └── [id]/route.ts       # PATCH/DELETE (ADMIN)
├── lib/
│   ├── auth/
│   │   ├── jwt.ts                  # Tao va xac minh JWT (jose)
│   │   ├── password.ts             # Hash va compare mat khau (bcryptjs)
│   │   ├── middleware.ts           # Auth middleware cho API routes
│   │   ├── cookies.ts              # Quan ly HttpOnly cookies
│   │   └── rate-limit.ts           # Rate limiting
│   ├── validations/
│   │   ├── auth.schema.ts          # Zod schema cho auth
│   │   ├── user.schema.ts          # Zod schema cho user
│   │   └── terms.schema.ts         # Zod schema cho terms
│   └── prisma.ts                   # Prisma client singleton
├── prisma/
│   ├── schema.prisma               # Prisma schema (bao gom auth models)
│   └── seed.ts                     # Seed data (admin user, dieu khoan mac dinh)
└── types/
    └── auth.ts                     # Type definitions cho auth module
```

---

## 10. Thu tu trien khai

### Phase 1: Ha tang co ban
- [ ] Cau hinh bien moi truong (.env)
- [ ] Cai dat dependencies (jose, bcryptjs, zod)
- [ ] Tao Prisma schema cho 4 bang auth
- [ ] Chay migration
- [ ] Tao JWT utility (jwt.ts)
- [ ] Tao password utility (password.ts)
- [ ] Tao Zod validation schemas

### Phase 2: Auth API
- [ ] POST /api/auth/signup
- [ ] POST /api/auth/login
- [ ] POST /api/auth/refresh
- [ ] POST /api/auth/logout
- [ ] Auth middleware (xac minh JWT tu cookie)
- [ ] Role-based access control middleware

### Phase 3: Users & Terms API
- [ ] GET/PATCH/DELETE /api/users/me
- [ ] GET /api/users (ADMIN)
- [ ] PATCH /api/users/[id]/role (ADMIN)
- [ ] GET /api/terms/active
- [ ] POST /api/terms/agree
- [ ] GET /api/terms/pending
- [ ] CRUD /api/terms (ADMIN)

### Phase 4: Giao dien nguoi dung
- [ ] Trang dang nhap (`/login`)
- [ ] Trang dang ky (`/signup`)
- [ ] Trang quen mat khau (`/forgot-password`)
- [ ] Trang ho so ca nhan (`/profile`)
- [ ] Trang quan ly nguoi dung (`/admin/users`)
- [ ] Trang quan ly dieu khoan (`/admin/terms`)

### Phase 5: Tich hop & Bao mat
- [ ] Rate limiting cho auth endpoints
- [ ] Xu ly loi tap trung (error handling)
- [ ] Seed data (tai khoan admin mac dinh, dieu khoan mau)
- [ ] Kiem thu tich hop (integration testing)
- [ ] Review bao mat tong the

---

## Tai lieu tham chieu

- `docs/database/database-design.md` — Thiet ke DB chi tiet (SSoT)
- `docs/sprints/sprint-1-auth/prompt-map.md` — Ke hoach sprint
- `docs/sprints/sprint-1-auth/progress.md` — Tien do sprint
