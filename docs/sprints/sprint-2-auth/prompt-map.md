# Sprint 2: Module Xac thuc (Auth) — Prompt Map

> Ke hoach trien khai chi tiet theo tung tinh nang cho sprint Auth.

## Thong tin sprint

| Hang muc | Chi tiet |
|----------|---------|
| Sprint | 2 |
| Module | 001-Auth |
| Thoi gian | 1 tuan |
| Blueprint | `docs/blueprints/001-auth/blueprint.md` |
| DB Design | `docs/database/database-design.md` |
| Tien do | `docs/sprints/sprint-2-auth/progress.md` |

---

## Feature 1: Ha tang xac thuc (Auth Infrastructure)

### F1-1: Prisma Schema cho module Auth
**Prompt:**
> Tao Prisma schema cho 4 bang auth: TB_COMM_USER, TB_COMM_TRMS, TH_COMM_USER_AGRE, TB_COMM_RFRSH_TKN.
> Tham chieu thiet ke DB tai `docs/database/database-design.md` (muc Module Auth).
> Dat trong file `prisma/schema.prisma`, bo sung vao schema hien co.
> Dam bao: UUID lam PK, quan he FK dung, index cho EML_ADDR (UNIQUE), index cho TKN_HASH.

**File anh huong:**
- `prisma/schema.prisma`

**Tieu chi hoan thanh:**
- [ ] 4 model duoc tao trong Prisma schema
- [ ] Quan he FK dung giua cac bang
- [ ] Migration chay thanh cong

---

### F1-2: JWT Utility
**Prompt:**
> Tao file `src/lib/auth/jwt.ts` su dung thu vien `jose` de tao va xac minh JWT.
> Bao gom: `signAccessToken(userId, role)`, `signRefreshToken(userId)`, `verifyAccessToken(token)`, `verifyRefreshToken(token)`.
> Doc JWT_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES tu bien moi truong.
> Thuat toan: HS256. Payload bao gom: sub (userId), role, type (access/refresh), iat, exp.

**File anh huong:**
- `src/lib/auth/jwt.ts`

**Tieu chi hoan thanh:**
- [ ] 4 ham duoc export
- [ ] Su dung jose (ho tro Edge Runtime)
- [ ] Doc config tu env

---

### F1-3: Password Utility (bcrypt)
**Prompt:**
> Tao file `src/lib/auth/password.ts` su dung `bcryptjs`.
> Bao gom: `hashPassword(plain)` voi cost factor 12, `comparePassword(plain, hash)`.
> Export 2 ham async.

**File anh huong:**
- `src/lib/auth/password.ts`

**Tieu chi hoan thanh:**
- [ ] Hash voi cost factor 12
- [ ] 2 ham async duoc export

---

### F1-4: Zod Validation Schemas
**Prompt:**
> Tao cac file validation schema bang zod:
> - `src/lib/validations/auth.schema.ts`: signupSchema (email, password min 8 ky tu + chu hoa + so + dac biet, name, phone optional, agreedTermsIds), loginSchema (email, password)
> - `src/lib/validations/user.schema.ts`: updateProfileSchema (name, phone, photoUrl — tat ca optional), updateRoleSchema (role: ADMIN | USER)
> - `src/lib/validations/terms.schema.ts`: createTermsSchema (typeCode, version, title, content, required, enforceDate), agreeTermsSchema (termsIds: UUID[])

**File anh huong:**
- `src/lib/validations/auth.schema.ts`
- `src/lib/validations/user.schema.ts`
- `src/lib/validations/terms.schema.ts`

**Tieu chi hoan thanh:**
- [ ] Tat ca schema xac dinh rang buoc chinh xac
- [ ] Password co regex kiem tra do manh
- [ ] Email co kiem tra dinh dang

---

### F1-5: Cookie Utility
**Prompt:**
> Tao file `src/lib/auth/cookies.ts` de quan ly HttpOnly cookies trong Next.js 15.
> Bao gom: `setAuthCookies(response, accessToken, refreshToken)`, `clearAuthCookies(response)`, `getTokenFromCookies(request, tokenName)`.
> Cau hinh cookie: HttpOnly, Secure (production), SameSite=Lax, Path=/.
> Access token cookie ten `access_token`, refresh token cookie ten `refresh_token`.

**File anh huong:**
- `src/lib/auth/cookies.ts`

**Tieu chi hoan thanh:**
- [ ] 3 ham duoc export
- [ ] Cookies co flag bao mat dung

---

## Feature 2: Auth API (Signup, Login, Refresh, Logout)

### F2-1: API Signup
**Prompt:**
> Tao API route `src/app/api/auth/signup/route.ts` (POST).
> Luong: Validate body (zod) → Kiem tra email trung → bcrypt hash password → INSERT TB_COMM_USER → INSERT TH_COMM_USER_AGRE (cho cac dieu khoan da dong y) → Tao JWT cap → INSERT TB_COMM_RFRSH_TKN → Set cookies → Tra ve 201.
> Tham chieu: `docs/blueprints/001-auth/blueprint.md` muc 5.1 va 7.1.
> Response format: `{ success: true, data: { userId, email } }`.

**File anh huong:**
- `src/app/api/auth/signup/route.ts`

**Tieu chi hoan thanh:**
- [ ] Validate input day du
- [ ] Hash password truoc khi luu
- [ ] Ghi nhan dong y dieu khoan
- [ ] Tra ve JWT trong HttpOnly cookies
- [ ] Xu ly loi: email trung (409), validation (400)

---

### F2-2: API Login
**Prompt:**
> Tao API route `src/app/api/auth/login/route.ts` (POST).
> Luong: Validate body → SELECT user by email → bcrypt compare → Tao JWT cap → INSERT TB_COMM_RFRSH_TKN → UPDATE LAST_LOGIN_DT → Set cookies → Tra ve 200.
> Kiem tra: STTS_CD phai la 'ACTIVE', DEL_YN phai la 'N'.
> Tham chieu: blueprint muc 5.1 va 7.2.

**File anh huong:**
- `src/app/api/auth/login/route.ts`

**Tieu chi hoan thanh:**
- [ ] Xac minh mat khau bang bcrypt
- [ ] Kiem tra trang thai tai khoan
- [ ] Cap nhat LAST_LOGIN_DT
- [ ] Xu ly loi: sai thong tin (401), tai khoan bi khoa (403)

---

### F2-3: API Refresh Token
**Prompt:**
> Tao API route `src/app/api/auth/refresh/route.ts` (POST).
> Luong: Doc refresh_token tu cookie → Verify JWT → SELECT TB_COMM_RFRSH_TKN (kiem tra chua thu hoi) → Thu hoi token cu → Tao cap token moi → INSERT token moi → Set cookies moi.
> Ap dung refresh token rotation.
> Tham chieu: blueprint muc 7.3.

**File anh huong:**
- `src/app/api/auth/refresh/route.ts`

**Tieu chi hoan thanh:**
- [ ] Refresh token rotation hoat dong
- [ ] Token cu bi thu hoi
- [ ] Token het han hoac bi thu hoi → 401

---

### F2-4: API Logout
**Prompt:**
> Tao API route `src/app/api/auth/logout/route.ts` (POST).
> Luong: Xac minh access token → Thu hoi tat ca refresh token cua user (UPDATE REVK_YN='Y') → Xoa cookies → Tra ve 200.

**File anh huong:**
- `src/app/api/auth/logout/route.ts`

**Tieu chi hoan thanh:**
- [ ] Thu hoi tat ca refresh token
- [ ] Xoa cookies
- [ ] Tra ve thanh cong

---

### F2-5: Auth Middleware
**Prompt:**
> Tao file `src/lib/auth/middleware.ts`.
> Bao gom: `withAuth(handler)` — wrapper kiem tra access token tu cookie, verify JWT, attach user info vao request.
> `withRole(handler, roles[])` — kiem tra vai tro sau khi xac thuc.
> Neu token khong hop le: tra ve 401. Neu khong du quyen: tra ve 403.

**File anh huong:**
- `src/lib/auth/middleware.ts`

**Tieu chi hoan thanh:**
- [ ] withAuth hoat dong cho cac route can xac thuc
- [ ] withRole kiem tra vai tro chinh xac
- [ ] Tra ve loi 401/403 phu hop

---

## Feature 3: Users & Terms API

### F3-1: API Profile (GET/PATCH/DELETE /api/users/me)
**Prompt:**
> Tao API route `src/app/api/users/me/route.ts`.
> GET: Lay thong tin user hien tai (loai tru PASSWD_HASH).
> PATCH: Cap nhat INDCT_NM, TELNO, PHOTO_URL (validate bang zod).
> DELETE: Soft delete — dat WHDWL_DT, STTS_CD='INACTIVE', DEL_YN='Y'.
> Tat ca can withAuth middleware.

**File anh huong:**
- `src/app/api/users/me/route.ts`

**Tieu chi hoan thanh:**
- [ ] GET tra ve profile khong co mat khau
- [ ] PATCH validate va cap nhat
- [ ] DELETE la soft delete

---

### F3-2: API Quan ly nguoi dung (ADMIN)
**Prompt:**
> Tao API route `src/app/api/users/route.ts` (GET — danh sach user, ADMIN).
> Ho tro phan trang: page, limit (mac dinh 20). Ho tro tim kiem theo email hoac ten. Ho tro loc theo STTS_CD.
> Tao API route `src/app/api/users/[id]/role/route.ts` (PATCH — thay doi vai tro, ADMIN).
> Tat ca can withAuth + withRole(['ADMIN']).

**File anh huong:**
- `src/app/api/users/route.ts`
- `src/app/api/users/[id]/role/route.ts`

**Tieu chi hoan thanh:**
- [ ] Phan trang hoat dong
- [ ] Tim kiem hoat dong
- [ ] Chi ADMIN truy cap duoc

---

### F3-3: API Dieu khoan su dung
**Prompt:**
> Tao cac API route cho dieu khoan:
> - `src/app/api/terms/active/route.ts` (GET — public, lay dieu khoan dang hieu luc)
> - `src/app/api/terms/agree/route.ts` (POST — ghi nhan dong y, can auth)
> - `src/app/api/terms/pending/route.ts` (GET — dieu khoan chua dong y, can auth)
> - `src/app/api/terms/route.ts` (GET/POST — ADMIN)
> - `src/app/api/terms/[id]/route.ts` (PATCH/DELETE — ADMIN)
> Tham chieu: blueprint muc 5.3.

**File anh huong:**
- `src/app/api/terms/active/route.ts`
- `src/app/api/terms/agree/route.ts`
- `src/app/api/terms/pending/route.ts`
- `src/app/api/terms/route.ts`
- `src/app/api/terms/[id]/route.ts`

**Tieu chi hoan thanh:**
- [ ] Public endpoint khong can auth
- [ ] Endpoint can auth co middleware
- [ ] CRUD dieu khoan cho ADMIN day du

---

## Feature 4: Giao dien nguoi dung (Auth UI)

### F4-1: Trang Dang nhap
**Prompt:**
> Tao trang dang nhap tai `src/app/(auth)/login/page.tsx`.
> Form gom: email, mat khau, nut "Dang nhap", lien ket "Quen mat khau", lien ket "Dang ky".
> Goi POST /api/auth/login. Hien thi loi neu that bai.
> Sau khi thanh cong, chuyen huong den trang chinh.
> Su dung Server Component + Client Component cho form.
> Tuan thu design token tai `src/styles/design-tokens.css`.

**File anh huong:**
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/layout.tsx`

**Tieu chi hoan thanh:**
- [ ] Form validation phia client
- [ ] Hien thi thong bao loi
- [ ] Redirect sau dang nhap
- [ ] Responsive (mobile/tablet/desktop)

---

### F4-2: Trang Dang ky
**Prompt:**
> Tao trang dang ky tai `src/app/(auth)/signup/page.tsx`.
> Form gom: email, mat khau, xac nhan mat khau, ten, so dien thoai (optional), checkbox dong y dieu khoan.
> Hien thi danh sach dieu khoan tu GET /api/terms/active.
> Goi POST /api/auth/signup. Sau khi thanh cong, chuyen huong den trang chinh.

**File anh huong:**
- `src/app/(auth)/signup/page.tsx`

**Tieu chi hoan thanh:**
- [ ] Hien thi dieu khoan tu API
- [ ] Kiem tra mat khau khop
- [ ] Redirect sau dang ky

---

### F4-3: Trang Ho so ca nhan
**Prompt:**
> Tao trang ho so tai `src/app/(protected)/profile/page.tsx`.
> Hien thi thong tin tu GET /api/users/me. Form chinh sua: ten, so dien thoai, anh dai dien.
> Nut "Luu thay doi" goi PATCH /api/users/me.
> Nut "Xoa tai khoan" voi xac nhan truoc khi goi DELETE /api/users/me.

**File anh huong:**
- `src/app/(protected)/profile/page.tsx`
- `src/app/(protected)/layout.tsx`

**Tieu chi hoan thanh:**
- [ ] Load va hien thi du lieu tu API
- [ ] Cap nhat thanh cong
- [ ] Xac nhan truoc khi xoa

---

### F4-4: Trang Quan tri (ADMIN)
**Prompt:**
> Tao trang quan ly nguoi dung tai `src/app/(protected)/admin/users/page.tsx`.
> Bang danh sach nguoi dung voi phan trang, tim kiem, loc trang thai.
> Chuc nang thay doi vai tro (dropdown ADMIN/USER).
> Tao trang quan ly dieu khoan tai `src/app/(protected)/admin/terms/page.tsx`.
> CRUD dieu khoan: tao moi, chinh sua, xoa (voi xac nhan).
> Chi hien thi khi nguoi dung co ROLE_CD = 'ADMIN'.

**File anh huong:**
- `src/app/(protected)/admin/users/page.tsx`
- `src/app/(protected)/admin/terms/page.tsx`
- `src/app/(protected)/admin/layout.tsx`

**Tieu chi hoan thanh:**
- [ ] Bang danh sach voi phan trang
- [ ] Tim kiem va loc hoat dong
- [ ] CRUD dieu khoan day du
- [ ] Kiem tra quyen ADMIN

---

## Feature 5: Tich hop & Bao mat

### F5-1: Rate Limiting
**Prompt:**
> Tao file `src/lib/auth/rate-limit.ts`.
> Su dung in-memory store (Map) voi sliding window.
> Cau hinh: login 5 lan/phut/IP, signup 3 lan/phut/IP, refresh 10 lan/phut/user.
> Tra ve 429 Too Many Requests khi vuot gioi han, bao gom header `Retry-After`.
> Tich hop vao cac auth API route.

**File anh huong:**
- `src/lib/auth/rate-limit.ts`
- Cap nhat cac file route auth de tich hop rate limit

**Tieu chi hoan thanh:**
- [ ] Rate limit hoat dong cho 3 endpoint
- [ ] Tra ve 429 voi Retry-After header
- [ ] Khong anh huong den hieu nang binh thuong

---

### F5-2: Xu ly loi tap trung
**Prompt:**
> Tao file `src/lib/errors.ts` dinh nghia cac lop loi tuong minh:
> - `AuthError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `ValidationError` (400), `RateLimitError` (429).
> Tao helper `handleApiError(error)` tra ve NextResponse voi format chuan: `{ success: false, error: string }`.
> Cap nhat cac API route de su dung error classes.

**File anh huong:**
- `src/lib/errors.ts`
- Cap nhat tat ca API routes

**Tieu chi hoan thanh:**
- [ ] Cac lop loi duoc dinh nghia
- [ ] Response loi nhat quan
- [ ] Khong lo thong tin nhay cam trong response loi

---

### F5-3: Seed Data
**Prompt:**
> Tao file `prisma/seed.ts` de tao du lieu mac dinh:
> - Tai khoan admin: admin@hrlite.com / Admin@123456 (bcrypt hash)
> - 2 dieu khoan mau: "Dieu khoan su dung" (bat buoc), "Chinh sach bao mat" (bat buoc)
> Cap nhat `package.json` de them script `prisma:seed`.

**File anh huong:**
- `prisma/seed.ts`
- `package.json`

**Tieu chi hoan thanh:**
- [ ] Seed chay thanh cong
- [ ] Admin co the dang nhap voi thong tin mac dinh
- [ ] 2 dieu khoan duoc tao

---

## Tom tat

| Feature | So prompt | Uu tien | Phu thuoc |
|---------|----------|---------|-----------|
| F1: Ha tang | 5 | Cao | Khong |
| F2: Auth API | 5 | Cao | F1 |
| F3: Users/Terms API | 3 | Cao | F1, F2 |
| F4: Auth UI | 4 | Trung binh | F2, F3 |
| F5: Tich hop/Bao mat | 3 | Trung binh | F2, F3 |
| **Tong** | **20** | | |

### Thu tu thuc hien khuyen nghi
```
F1-1 → F1-2 → F1-3 → F1-4 → F1-5
                                  ↓
F2-1 → F2-2 → F2-3 → F2-4 → F2-5
                                  ↓
              F3-1 → F3-2 → F3-3
                              ↓
              F4-1 → F4-2 → F4-3 → F4-4
                                      ↓
                      F5-1 → F5-2 → F5-3
```
