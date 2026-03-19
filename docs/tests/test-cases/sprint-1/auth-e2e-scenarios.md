# Kịch bản kiểm thử E2E: Module Auth

| Thông tin | Chi tiết |
|-----------|---------|
| **Module** | Auth (Đăng ký, Đăng nhập, Phiên, Hồ sơ, Quản trị) |
| **Sprint** | Sprint 1 |
| **Blueprint** | `docs/blueprints/001-auth/blueprint.md` |
| **Ngày tạo** | 2026-03-19 |
| **Công cụ** | Chrome MCP (via `/test-run`) |
| **Môi trường** | Staging (PostgreSQL staging) |
| **Tham chiếu** | `docs/tests/test-strategy.md` |

> Tài liệu này mô tả các kịch bản E2E **từ góc nhìn trình duyệt** — tập trung vào hành trình người dùng hoàn chỉnh.
> Các test case API (unit/integration) đã được bao phủ tại `auth-api-test-cases.md`.
> Các test case UI riêng lẻ đã được bao phủ tại `auth-ui-test-cases.md`.

---

## Mục lục

- [1. Đăng ký & Đăng nhập](#1-đăng-ký--đăng-nhập)
- [2. Quản lý phiên (Session Management)](#2-quản-lý-phiên-session-management)
- [3. Hồ sơ cá nhân (Profile Management)](#3-hồ-sơ-cá-nhân-profile-management)
- [4. Quản trị người dùng (Admin User Management)](#4-quản-trị-người-dùng-admin-user-management)
- [5. Quản trị điều khoản (Admin Terms Management)](#5-quản-trị-điều-khoản-admin-terms-management)
- [6. Bảo mật (Security)](#6-bảo-mật-security)
- [7. Responsive & Accessibility](#7-responsive--accessibility)
- [Bảng tổng hợp](#bảng-tổng-hợp)

---

## Quy ước

- **URL gốc**: `http://localhost:3000` (staging: `https://staging.hrlite.vn`)
- **Trình duyệt**: Chrome (qua Chrome MCP)
- **Viewport mặc định**: 1440x900 (Desktop)
- **Viewport mobile**: 375x812 (iPhone 14)

### Dữ liệu test chuẩn

| Biến | Giá trị |
|------|---------|
| `TEST_EMAIL` | `e2e-user-{timestamp}@hrlite.test` |
| `TEST_PASSWORD` | `Test@2026!Str0ng` |
| `TEST_WEAK_PASSWORD` | `weak` |
| `TEST_NAME` | `Nguyễn Văn E2E` |
| `TEST_PHONE` | `0901234567` |
| `ADMIN_EMAIL` | `admin@hrlite.test` |
| `ADMIN_PASSWORD` | `Admin@2026!Str0ng` |
| `EXISTING_EMAIL` | `existing@hrlite.test` |

---

## 1. Đăng ký & Đăng nhập

### E2E-001: Đăng ký hoàn chỉnh → tự động đăng nhập → xem dashboard

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-001 |
| **Loại** | Happy Path |
| **Ưu tiên** | Critical |

**Điều kiện tiên quyết**:
- Database đã seed điều khoản bắt buộc (TOS, Privacy) và tùy chọn (Marketing)
- Email `TEST_EMAIL` chưa tồn tại trong hệ thống
- Trình duyệt không có cookie xác thực

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Mở trình duyệt, truy cập trang đăng ký | — | `/signup` |
| 2 | Xác nhận trang tải thành công | Form đăng ký hiển thị: trường email, mật khẩu, tên, số điện thoại, danh sách điều khoản | `/signup` |
| 3 | Nhập email `TEST_EMAIL` | `input[name="email"]` | — |
| 4 | Nhập mật khẩu `TEST_PASSWORD` | `input[name="password"]` | — |
| 5 | Nhập tên `TEST_NAME` | `input[name="name"]` | — |
| 6 | Nhập số điện thoại `TEST_PHONE` | `input[name="phone"]` | — |
| 7 | Tích checkbox đồng ý TOS (bắt buộc) | `input[data-terms-id="tos"]` | — |
| 8 | Tích checkbox đồng ý Privacy (bắt buộc) | `input[data-terms-id="privacy"]` | — |
| 9 | Tích checkbox đồng ý Marketing (tùy chọn) | `input[data-terms-id="marketing"]` | — |
| 10 | Nhấn nút "Đăng ký" | `button[type="submit"]` | — |
| 11 | Chờ chuyển hướng | Loading indicator | — |
| 12 | Xác nhận đã chuyển đến dashboard | Trang dashboard hiển thị tên `TEST_NAME` | `/` |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Chuyển hướng đến `/`, hiển thị tên người dùng `TEST_NAME` trên header/sidebar, không có thông báo lỗi |
| **API** | `POST /api/auth/signup` trả về status `201`, body chứa `success: true`, `data.userId`, `data.email` |
| **DB** | Bản ghi mới trong `TB_COMM_USER` với `EML_ADDR = TEST_EMAIL`, `ROLE_CD = 'USER'`, `STTS_CD = 'ACTIVE'`; 3 bản ghi trong `TH_COMM_USER_AGRE` với `AGRE_YN = 'Y'`; 1 bản ghi trong `TB_COMM_RFRSH_TKN` với `REVK_YN = 'N'` |
| **Server Log** | Log ghi nhận sự kiện đăng ký thành công với IP và user agent |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`, `TEST_NAME`, `TEST_PHONE`

---

### E2E-002: Đăng ký chỉ đồng ý điều khoản bắt buộc

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-002 |
| **Loại** | Happy Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Database đã seed điều khoản bắt buộc (TOS, Privacy) và tùy chọn (Marketing)
- Email mới chưa tồn tại

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng ký | — | `/signup` |
| 2 | Nhập email, mật khẩu hợp lệ, tên | Các trường input tương ứng | — |
| 3 | Tích checkbox TOS (bắt buộc) | `input[data-terms-id="tos"]` | — |
| 4 | Tích checkbox Privacy (bắt buộc) | `input[data-terms-id="privacy"]` | — |
| 5 | **Không** tích checkbox Marketing (tùy chọn) | `input[data-terms-id="marketing"]` — bỏ trống | — |
| 6 | Nhấn "Đăng ký" | `button[type="submit"]` | — |
| 7 | Chờ chuyển hướng | — | — |
| 8 | Xác nhận đã chuyển đến dashboard | — | `/` |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Đăng ký thành công, chuyển hướng đến `/`, không có thông báo lỗi |
| **API** | `POST /api/auth/signup` trả về status `201` |
| **DB** | 2 bản ghi trong `TH_COMM_USER_AGRE` (chỉ TOS và Privacy), không có bản ghi cho Marketing |
| **Server Log** | Log ghi nhận đăng ký thành công |

**Phương pháp xác minh**: `network`, `db-query`

**Dữ liệu test**: Email mới ngẫu nhiên, `TEST_PASSWORD`

---

### E2E-003: Đăng ký với email trùng → hiển thị lỗi

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-003 |
| **Loại** | Error Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Tài khoản `EXISTING_EMAIL` đã tồn tại trong hệ thống

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng ký | — | `/signup` |
| 2 | Nhập email `EXISTING_EMAIL` | `input[name="email"]` | — |
| 3 | Nhập mật khẩu hợp lệ, tên, đồng ý tất cả điều khoản bắt buộc | Các trường input | — |
| 4 | Nhấn "Đăng ký" | `button[type="submit"]` | — |
| 5 | Chờ phản hồi | — | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Hiển thị thông báo lỗi "Email đã được sử dụng" (toast hoặc inline error), vẫn ở trang `/signup`, form không bị reset |
| **API** | `POST /api/auth/signup` trả về status `409`, `success: false` |
| **DB** | Không có bản ghi mới trong `TB_COMM_USER` |
| **Server Log** | Log ghi nhận lỗi email trùng |

**Phương pháp xác minh**: `snapshot`, `network`, `console`

**Dữ liệu test**: `EXISTING_EMAIL`, `TEST_PASSWORD`

---

### E2E-004: Đăng ký với mật khẩu yếu → phản hồi validation

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-004 |
| **Loại** | Error Path |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- Trình duyệt ở trang `/signup`

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng ký | — | `/signup` |
| 2 | Nhập email hợp lệ | `input[name="email"]` | — |
| 3 | Nhập mật khẩu `TEST_WEAK_PASSWORD` | `input[name="password"]` | — |
| 4 | Di chuyển focus ra khỏi trường mật khẩu (blur) | — | — |
| 5 | Quan sát thông báo validation | Thông báo lỗi dưới trường mật khẩu | — |
| 6 | (Tùy chọn) Nhấn "Đăng ký" mà không sửa | `button[type="submit"]` | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Hiển thị thông báo inline: "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt". Nút "Đăng ký" bị disabled hoặc submit bị chặn |
| **API** | Không gửi request đến server (validation phía client) hoặc server trả về status `400` nếu submit được |
| **DB** | Không có thay đổi |
| **Server Log** | Không có log (nếu chặn phía client) |

**Phương pháp xác minh**: `snapshot`, `network`

**Dữ liệu test**: Email ngẫu nhiên, `TEST_WEAK_PASSWORD`

---

### E2E-005: Đăng ký thiếu điều khoản bắt buộc → bị chặn

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-005 |
| **Loại** | Error Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Database có điều khoản bắt buộc (TOS, Privacy)
- Trình duyệt ở trang `/signup`

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng ký | — | `/signup` |
| 2 | Nhập email, mật khẩu hợp lệ, tên | Các trường input | — |
| 3 | **Không** tích bất kỳ checkbox điều khoản nào | Tất cả checkbox bỏ trống | — |
| 4 | Nhấn "Đăng ký" | `button[type="submit"]` | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Hiển thị thông báo lỗi yêu cầu đồng ý điều khoản bắt buộc, checkbox bắt buộc được highlight (border đỏ hoặc icon cảnh báo), vẫn ở trang `/signup` |
| **API** | Không gửi request (client validation) hoặc server trả về status `400` với error chứa "điều khoản bắt buộc" |
| **DB** | Không có thay đổi |
| **Server Log** | — |

**Phương pháp xác minh**: `snapshot`, `network`

**Dữ liệu test**: Email ngẫu nhiên, `TEST_PASSWORD`

---

### E2E-006: Đăng nhập thành công → chuyển hướng dashboard

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-006 |
| **Loại** | Happy Path |
| **Ưu tiên** | Critical |

**Điều kiện tiên quyết**:
- Tài khoản `TEST_EMAIL` đã đăng ký thành công, đã đồng ý tất cả điều khoản bắt buộc
- Trình duyệt không có cookie xác thực

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng nhập | — | `/login` |
| 2 | Xác nhận form hiển thị đúng | Trường email, mật khẩu, nút "Đăng nhập", liên kết "Quên mật khẩu", liên kết "Đăng ký" | `/login` |
| 3 | Nhập email `TEST_EMAIL` | `input[name="email"]` | — |
| 4 | Nhập mật khẩu `TEST_PASSWORD` | `input[name="password"]` | — |
| 5 | Nhấn "Đăng nhập" | `button[type="submit"]` | — |
| 6 | Chờ chuyển hướng | Loading indicator | — |
| 7 | Xác nhận dashboard hiển thị | Tên người dùng trên header, sidebar navigation | `/` |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Chuyển hướng đến `/`, header hiển thị tên người dùng, sidebar hiển thị menu chức năng |
| **API** | `POST /api/auth/login` trả về status `200`, `success: true`, `data.user.email`, `data.user.role`, không có `pendingTerms` |
| **DB** | `LAST_LOGIN_DT` được cập nhật trong `TB_COMM_USER`; bản ghi mới trong `TB_COMM_RFRSH_TKN` |
| **Server Log** | Log ghi nhận đăng nhập thành công với IP và user agent |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`, `server-log`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`

---

### E2E-007: Đăng nhập sai thông tin → hiển thị toast lỗi

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-007 |
| **Loại** | Error Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Trình duyệt ở trang `/login`

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng nhập | — | `/login` |
| 2 | Nhập email `TEST_EMAIL` | `input[name="email"]` | — |
| 3 | Nhập mật khẩu sai `wrongpassword123` | `input[name="password"]` | — |
| 4 | Nhấn "Đăng nhập" | `button[type="submit"]` | — |
| 5 | Chờ phản hồi | — | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Hiển thị toast hoặc thông báo lỗi "Email hoặc mật khẩu không chính xác", vẫn ở trang `/login`, trường mật khẩu được xóa trắng, trường email giữ nguyên giá trị |
| **API** | `POST /api/auth/login` trả về status `401`, `success: false` |
| **DB** | Không có thay đổi, `LAST_LOGIN_DT` không cập nhật |
| **Server Log** | Log ghi nhận đăng nhập thất bại |

**Phương pháp xác minh**: `snapshot`, `network`, `console`

**Dữ liệu test**: `TEST_EMAIL`, `wrongpassword123`

---

### E2E-008: Đăng nhập → có điều khoản chờ → đồng ý → tiếp tục

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-008 |
| **Loại** | Alternative Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Tài khoản `TEST_EMAIL` tồn tại, đã đăng ký trước đó
- Admin đã tạo điều khoản bắt buộc mới mà user chưa đồng ý (pendingTerms)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng nhập | — | `/login` |
| 2 | Nhập email `TEST_EMAIL`, mật khẩu đúng | Các trường input | — |
| 3 | Nhấn "Đăng nhập" | `button[type="submit"]` | — |
| 4 | Chờ phản hồi — dialog/trang điều khoản hiển thị | Dialog hoặc trang riêng hiển thị danh sách điều khoản chờ đồng ý | — |
| 5 | Đọc nội dung điều khoản (cuộn xuống) | Nội dung điều khoản dạng text | — |
| 6 | Tích checkbox đồng ý điều khoản mới | `input[type="checkbox"]` cho từng điều khoản bắt buộc | — |
| 7 | Nhấn "Đồng ý và tiếp tục" | `button[data-action="agree"]` | — |
| 8 | Chờ chuyển hướng | — | — |
| 9 | Xác nhận dashboard hiển thị | — | `/` |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Sau đăng nhập, dialog/trang điều khoản hiển thị. Sau khi đồng ý, chuyển hướng đến `/`. Không thể bỏ qua dialog (không có nút đóng nếu điều khoản bắt buộc) |
| **API** | `POST /api/auth/login` trả về `pendingTerms` không rỗng; `POST /api/terms/agree` trả về `201` |
| **DB** | Bản ghi mới trong `TH_COMM_USER_AGRE` cho điều khoản vừa đồng ý |
| **Server Log** | Log ghi nhận đồng ý điều khoản mới |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`, ID điều khoản mới

---

### E2E-009: Quên mật khẩu → gửi email thành công

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-009 |
| **Loại** | Happy Path |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- Tài khoản `TEST_EMAIL` tồn tại trong hệ thống
- Trình duyệt không có cookie xác thực

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng nhập | — | `/login` |
| 2 | Nhấn liên kết "Quên mật khẩu" | `a[href="/forgot-password"]` | — |
| 3 | Xác nhận chuyển đến trang quên mật khẩu | Form nhập email | `/forgot-password` |
| 4 | Nhập email `TEST_EMAIL` | `input[name="email"]` | — |
| 5 | Nhấn "Gửi email đặt lại mật khẩu" | `button[type="submit"]` | — |
| 6 | Chờ phản hồi | — | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Hiển thị thông báo thành công "Email đặt lại mật khẩu đã được gửi", hiển thị liên kết quay lại trang đăng nhập |
| **API** | `POST /api/auth/forgot-password` trả về status `200`, `success: true` |
| **DB** | — (tùy triển khai: có thể lưu token đặt lại mật khẩu) |
| **Server Log** | Log ghi nhận yêu cầu đặt lại mật khẩu |

**Phương pháp xác minh**: `snapshot`, `network`

**Dữ liệu test**: `TEST_EMAIL`

---

## 2. Quản lý phiên (Session Management)

### E2E-010: Tự động làm mới token khi access token hết hạn

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-010 |
| **Loại** | Happy Path |
| **Ưu tiên** | Critical |

**Điều kiện tiên quyết**:
- User đã đăng nhập thành công
- Access token sắp hoặc đã hết hạn (mô phỏng bằng cách chờ hoặc thay đổi thời hạn token trong môi trường test)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đăng nhập thành công | — | `/` |
| 2 | Chờ access token hết hạn (hoặc xóa thủ công cookie `access_token` qua DevTools) | — | — |
| 3 | Thực hiện thao tác cần xác thực (ví dụ: truy cập `/profile`) | Menu "Hồ sơ" hoặc nhập URL trực tiếp | `/profile` |
| 4 | Quan sát hành vi tự động làm mới | — | — |
| 5 | Xác nhận trang `/profile` hiển thị bình thường | Thông tin hồ sơ | `/profile` |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Trang `/profile` hiển thị bình thường, người dùng không bị chuyển hướng về `/login`, không có thông báo lỗi |
| **API** | Request đầu tiên thất bại (401) → tự động gọi `POST /api/auth/refresh` → nhận token mới → gọi lại request gốc thành công |
| **DB** | Token cũ bị thu hồi (`REVK_YN = 'Y'`), token mới được tạo trong `TB_COMM_RFRSH_TKN` |
| **Server Log** | Log ghi nhận refresh token thành công |

**Phương pháp xác minh**: `network`, `db-query`, `console`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`

---

### E2E-011: Đăng xuất → chuyển hướng login → không truy cập được trang bảo vệ

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-011 |
| **Loại** | Happy Path |
| **Ưu tiên** | Critical |

**Điều kiện tiên quyết**:
- User đã đăng nhập, đang ở trang dashboard

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đăng nhập thành công, ở dashboard | — | `/` |
| 2 | Nhấn nút/menu "Đăng xuất" | `button[data-action="logout"]` hoặc menu dropdown | — |
| 3 | Chờ chuyển hướng | — | — |
| 4 | Xác nhận ở trang đăng nhập | Form đăng nhập | `/login` |
| 5 | Nhập URL `/profile` trực tiếp vào thanh địa chỉ | — | `/profile` |
| 6 | Xác nhận bị chuyển hướng về login | — | `/login` |
| 7 | Nhập URL `/admin/users` trực tiếp | — | `/admin/users` |
| 8 | Xác nhận bị chuyển hướng về login | — | `/login` |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Sau đăng xuất, chuyển về `/login`. Mọi URL bảo vệ (`/profile`, `/admin/*`) đều redirect về `/login` |
| **API** | `POST /api/auth/logout` trả về `200`; các request tiếp theo không có cookie → `401` |
| **DB** | Refresh token bị thu hồi (`REVK_YN = 'Y'`) |
| **Server Log** | Log ghi nhận đăng xuất thành công |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`

---

### E2E-012: Truy cập trang bảo vệ khi chưa đăng nhập → redirect login

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-012 |
| **Loại** | Error Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Trình duyệt không có cookie xác thực (chưa đăng nhập)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trực tiếp `/profile` | — | `/profile` |
| 2 | Xác nhận bị chuyển hướng | — | `/login` |
| 3 | Truy cập trực tiếp `/admin/users` | — | `/admin/users` |
| 4 | Xác nhận bị chuyển hướng | — | `/login` |
| 5 | Truy cập trực tiếp `/admin/terms` | — | `/admin/terms` |
| 6 | Xác nhận bị chuyển hướng | — | `/login` |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Tất cả URL bảo vệ redirect về `/login`, có thể hiển thị thông báo "Vui lòng đăng nhập để tiếp tục" |
| **API** | Không có API call xác thực thành công |
| **DB** | Không có thay đổi |
| **Server Log** | — |

**Phương pháp xác minh**: `snapshot`, `network`

**Dữ liệu test**: Không cần

---

### E2E-013: Đăng nhập với tài khoản bị vô hiệu hóa → hiển thị lỗi

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-013 |
| **Loại** | Error Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Tài khoản `suspended@hrlite.test` tồn tại với `STTS_CD = 'SUSPENDED'`

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng nhập | — | `/login` |
| 2 | Nhập email `suspended@hrlite.test` | `input[name="email"]` | — |
| 3 | Nhập mật khẩu đúng | `input[name="password"]` | — |
| 4 | Nhấn "Đăng nhập" | `button[type="submit"]` | — |
| 5 | Chờ phản hồi | — | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Hiển thị thông báo lỗi "Tài khoản đã bị vô hiệu hóa", vẫn ở trang `/login` |
| **API** | `POST /api/auth/login` trả về status `401`, error chứa "vô hiệu hóa" |
| **DB** | `LAST_LOGIN_DT` không cập nhật, không tạo refresh token |
| **Server Log** | Log ghi nhận đăng nhập bị chặn — tài khoản SUSPENDED |

**Phương pháp xác minh**: `snapshot`, `network`, `server-log`

**Dữ liệu test**: `suspended@hrlite.test`, mật khẩu tương ứng

---

## 3. Hồ sơ cá nhân (Profile Management)

### E2E-014: Xem hồ sơ → chỉnh sửa tên/SĐT → lưu → xác nhận thay đổi

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-014 |
| **Loại** | Happy Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- User đã đăng nhập thành công

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đăng nhập thành công | — | `/` |
| 2 | Nhấn vào tên/avatar trên header → chọn "Hồ sơ" | Menu dropdown hoặc liên kết | — |
| 3 | Xác nhận trang hồ sơ hiển thị | Thông tin: email (readonly), tên, SĐT, ảnh đại diện | `/profile` |
| 4 | Ghi nhận tên hiện tại: `TEST_NAME` | — | — |
| 5 | Xóa trường tên, nhập tên mới `Trần Thị E2E` | `input[name="name"]` | — |
| 6 | Xóa trường SĐT, nhập SĐT mới `0987654321` | `input[name="phone"]` | — |
| 7 | Nhấn "Lưu" | `button[data-action="save"]` | — |
| 8 | Chờ phản hồi | — | — |
| 9 | Xác nhận thông báo thành công | Toast "Cập nhật thành công" | — |
| 10 | Tải lại trang `/profile` (F5) | — | `/profile` |
| 11 | Xác nhận tên và SĐT đã thay đổi | Tên hiển thị `Trần Thị E2E`, SĐT `0987654321` | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Thông báo "Cập nhật thành công", dữ liệu mới hiển thị sau khi tải lại trang, header cũng cập nhật tên mới |
| **API** | `PATCH /api/users/me` trả về status `200`, `success: true` |
| **DB** | `INDCT_NM = 'Trần Thị E2E'`, `TELNO = '0987654321'`, `UPDT_DT` được cập nhật |
| **Server Log** | Log ghi nhận cập nhật hồ sơ |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`

**Dữ liệu test**: `TEST_EMAIL`, tên mới `Trần Thị E2E`, SĐT `0987654321`

---

### E2E-015: Đổi mật khẩu → đăng nhập lại bằng mật khẩu mới

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-015 |
| **Loại** | Happy Path |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- User đã đăng nhập thành công

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đăng nhập, truy cập trang hồ sơ | — | `/profile` |
| 2 | Chuyển sang tab "Bảo mật" | Tab hoặc liên kết "Bảo mật" | `/profile` (tab security) |
| 3 | Nhập mật khẩu hiện tại `TEST_PASSWORD` | `input[name="currentPassword"]` | — |
| 4 | Nhập mật khẩu mới `NewP@ss2026!` | `input[name="newPassword"]` | — |
| 5 | Nhập xác nhận mật khẩu mới `NewP@ss2026!` | `input[name="confirmPassword"]` | — |
| 6 | Nhấn "Đổi mật khẩu" | `button[data-action="change-password"]` | — |
| 7 | Xác nhận thông báo thành công | Toast thành công | — |
| 8 | Đăng xuất | Nút "Đăng xuất" | — |
| 9 | Đăng nhập bằng mật khẩu cũ `TEST_PASSWORD` | — | `/login` |
| 10 | Xác nhận đăng nhập thất bại | Thông báo lỗi | — |
| 11 | Đăng nhập bằng mật khẩu mới `NewP@ss2026!` | — | `/login` |
| 12 | Xác nhận đăng nhập thành công | Dashboard hiển thị | `/` |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Đổi mật khẩu thành công → đăng xuất → mật khẩu cũ bị từ chối → mật khẩu mới đăng nhập thành công |
| **API** | `PATCH /api/users/me` (hoặc endpoint đổi mật khẩu riêng) trả về `200`; login với mật khẩu cũ trả về `401`; login với mật khẩu mới trả về `200` |
| **DB** | `PASSWD_HASH` được cập nhật, hash mới khác hash cũ |
| **Server Log** | Log ghi nhận thay đổi mật khẩu |

**Phương pháp xác minh**: `network`, `db-query`, `server-log`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`, `NewP@ss2026!`

---

### E2E-016: Xóa tài khoản → dialog xác nhận → redirect login

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-016 |
| **Loại** | Happy Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Tài khoản test dành riêng cho việc xóa đã đăng nhập

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đăng nhập, truy cập trang hồ sơ | — | `/profile` |
| 2 | Cuộn xuống phần "Vùng nguy hiểm" hoặc tab tương ứng | Section "Xóa tài khoản" | — |
| 3 | Nhấn "Xóa tài khoản" | `button[data-action="delete-account"]` | — |
| 4 | Dialog xác nhận hiển thị | Dialog với nội dung cảnh báo, nút "Xác nhận xóa" và "Hủy" | — |
| 5 | Nhấn "Xác nhận xóa" | `button[data-action="confirm-delete"]` | — |
| 6 | Chờ chuyển hướng | — | — |
| 7 | Xác nhận ở trang đăng nhập | Form đăng nhập | `/login` |
| 8 | Đăng nhập bằng tài khoản vừa xóa | — | `/login` |
| 9 | Xác nhận đăng nhập thất bại | Thông báo "Tài khoản đã bị xóa" | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Dialog xác nhận hiển thị với cảnh báo rõ ràng. Sau xác nhận, redirect về `/login`. Đăng nhập lại bị từ chối |
| **API** | `DELETE /api/users/me` trả về `200`; `POST /api/auth/login` trả về `401` với "Tài khoản đã bị xóa" |
| **DB** | `WHDWL_DT` được đặt, `DEL_YN = 'Y'` (soft delete), cookies bị xóa |
| **Server Log** | Log ghi nhận yêu cầu xóa tài khoản |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`, `server-log`

**Dữ liệu test**: Tài khoản test riêng cho kịch bản xóa

---

### E2E-017: Điều hướng tab hồ sơ (Thông tin, Bảo mật, Điều khoản)

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-017 |
| **Loại** | Happy Path |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- User đã đăng nhập, ở trang `/profile`

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang hồ sơ | — | `/profile` |
| 2 | Xác nhận tab "Thông tin" đang active | Tab "Thông tin" được highlight | — |
| 3 | Xác nhận nội dung tab Thông tin | Email, tên, SĐT, ảnh | — |
| 4 | Nhấn tab "Bảo mật" | Tab "Bảo mật" | — |
| 5 | Xác nhận nội dung tab Bảo mật | Form đổi mật khẩu, phần xóa tài khoản | — |
| 6 | Nhấn tab "Điều khoản" | Tab "Điều khoản" | — |
| 7 | Xác nhận nội dung tab Điều khoản | Danh sách điều khoản đã đồng ý, ngày đồng ý | — |
| 8 | Nhấn quay lại tab "Thông tin" | Tab "Thông tin" | — |
| 9 | Xác nhận dữ liệu vẫn hiển thị đúng | — | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Chuyển đổi tab mượt mà, nội dung tương ứng hiển thị đúng, tab active được highlight, không tải lại trang |
| **API** | `GET /api/users/me` khi tải trang; có thể gọi thêm API điều khoản khi chuyển sang tab "Điều khoản" |
| **DB** | — |
| **Server Log** | — |

**Phương pháp xác minh**: `snapshot`, `network`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`

---

## 4. Quản trị người dùng (Admin User Management)

### E2E-018: Admin đăng nhập → xem danh sách user → phân trang

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-018 |
| **Loại** | Happy Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Tài khoản admin `ADMIN_EMAIL` tồn tại với `ROLE_CD = 'ADMIN'`
- Database có ít nhất 25 user (để test phân trang với limit 20)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đăng nhập bằng `ADMIN_EMAIL` | — | `/login` |
| 2 | Chuyển hướng đến dashboard | — | `/` |
| 3 | Nhấn menu "Quản lý người dùng" trên sidebar | `a[href="/admin/users"]` | — |
| 4 | Xác nhận trang quản lý hiển thị | Bảng danh sách user, cột: Email, Tên, Vai trò, Trạng thái, Ngày tạo | `/admin/users` |
| 5 | Xác nhận trang 1 hiển thị 20 bản ghi | Bảng có 20 dòng | — |
| 6 | Xác nhận hiển thị thông tin phân trang | "Trang 1 / 2" hoặc tương tự | — |
| 7 | Nhấn nút "Trang tiếp" | `button[data-action="next-page"]` | — |
| 8 | Xác nhận trang 2 hiển thị các bản ghi còn lại | Bảng có >=5 dòng | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Bảng danh sách hiển thị đúng cấu trúc, phân trang hoạt động, không hiển thị cột mật khẩu |
| **API** | `GET /api/users?page=1&limit=20` trả về `200` với dữ liệu phân trang; `GET /api/users?page=2&limit=20` cho trang tiếp |
| **DB** | — |
| **Server Log** | — |

**Phương pháp xác minh**: `snapshot`, `network`

**Dữ liệu test**: `ADMIN_EMAIL`, `ADMIN_PASSWORD`

---

### E2E-019: Admin tìm kiếm user theo tên/email

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-019 |
| **Loại** | Happy Path |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- Đăng nhập admin, ở trang `/admin/users`
- Database có user với tên `Nguyễn`

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Ở trang quản lý người dùng | — | `/admin/users` |
| 2 | Nhập `Nguyễn` vào ô tìm kiếm | `input[name="search"]` | — |
| 3 | Nhấn Enter hoặc nút tìm kiếm | — | — |
| 4 | Xác nhận kết quả lọc | Chỉ hiển thị user có tên hoặc email chứa "Nguyễn" | — |
| 5 | Xóa ô tìm kiếm, nhập email `test@hrlite.test` | `input[name="search"]` | — |
| 6 | Nhấn Enter | — | — |
| 7 | Xác nhận kết quả lọc theo email | Chỉ hiển thị user có email khớp | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Bảng chỉ hiển thị kết quả phù hợp, cập nhật thông tin phân trang |
| **API** | `GET /api/users?search=Nguyễn` trả về `200` với kết quả lọc |
| **DB** | — |
| **Server Log** | — |

**Phương pháp xác minh**: `snapshot`, `network`

**Dữ liệu test**: `ADMIN_EMAIL`, từ khóa `Nguyễn`

---

### E2E-020: Admin thay đổi vai trò user → xác nhận cập nhật

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-020 |
| **Loại** | Happy Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Đăng nhập admin, ở trang `/admin/users`
- Có user mục tiêu với `ROLE_CD = 'USER'`

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Ở trang quản lý người dùng | — | `/admin/users` |
| 2 | Tìm user mục tiêu trong danh sách | Dòng trong bảng | — |
| 3 | Nhấn nút thay đổi vai trò (hoặc dropdown vai trò) | `select[data-action="change-role"]` hoặc nút "Chỉnh sửa" | — |
| 4 | Chọn vai trò mới: `ADMIN` | Option `ADMIN` | — |
| 5 | Xác nhận thay đổi (nếu có dialog) | Nút "Xác nhận" | — |
| 6 | Chờ phản hồi | — | — |
| 7 | Xác nhận vai trò đã cập nhật trên bảng | Cột "Vai trò" hiển thị `ADMIN` | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Toast "Cập nhật vai trò thành công", bảng hiển thị vai trò mới `ADMIN` |
| **API** | `PATCH /api/users/{id}/role` với body `{ "role": "ADMIN" }` trả về `200` |
| **DB** | `ROLE_CD = 'ADMIN'` cho user mục tiêu, `UPDT_DT` và `UPDT_BY` được cập nhật |
| **Server Log** | Log ghi nhận thay đổi vai trò (hành động nhạy cảm) |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`, `server-log`

**Dữ liệu test**: `ADMIN_EMAIL`, user ID mục tiêu

---

### E2E-021: Admin bật/tắt trạng thái user (active/suspended)

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-021 |
| **Loại** | Happy Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Đăng nhập admin, ở trang `/admin/users`
- Có user mục tiêu với `STTS_CD = 'ACTIVE'`

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Ở trang quản lý người dùng | — | `/admin/users` |
| 2 | Tìm user mục tiêu với trạng thái ACTIVE | Dòng trong bảng | — |
| 3 | Nhấn nút "Vô hiệu hóa" (hoặc toggle switch) | `button[data-action="toggle-status"]` | — |
| 4 | Xác nhận trong dialog (nếu có) | Nút "Xác nhận" | — |
| 5 | Chờ phản hồi | — | — |
| 6 | Xác nhận trạng thái đã thay đổi | Cột "Trạng thái" hiển thị `SUSPENDED` (badge đỏ) | — |
| 7 | Nhấn nút "Kích hoạt lại" cho cùng user | `button[data-action="toggle-status"]` | — |
| 8 | Xác nhận trạng thái quay về ACTIVE | Cột "Trạng thái" hiển thị `ACTIVE` (badge xanh) | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Trạng thái chuyển đổi ACTIVE ↔ SUSPENDED, badge màu thay đổi tương ứng, toast thông báo thành công |
| **API** | `PATCH /api/users/{id}/status` (hoặc endpoint tương ứng) trả về `200` |
| **DB** | `STTS_CD` chuyển đổi giữa `'ACTIVE'` và `'SUSPENDED'` |
| **Server Log** | Log ghi nhận thay đổi trạng thái tài khoản |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`, `server-log`

**Dữ liệu test**: `ADMIN_EMAIL`, user ID mục tiêu

---

### E2E-022: User thường không truy cập được trang admin

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-022 |
| **Loại** | Error Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Đăng nhập bằng tài khoản `TEST_EMAIL` với `ROLE_CD = 'USER'`

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đăng nhập bằng tài khoản USER thường | — | `/login` |
| 2 | Xác nhận sidebar **không** hiển thị menu "Quản lý người dùng" và "Quản lý điều khoản" | Sidebar navigation | `/` |
| 3 | Nhập URL `/admin/users` trực tiếp | — | `/admin/users` |
| 4 | Xác nhận bị chặn | Trang 403 "Không có quyền truy cập" hoặc redirect về `/` | — |
| 5 | Nhập URL `/admin/terms` trực tiếp | — | `/admin/terms` |
| 6 | Xác nhận bị chặn | Trang 403 hoặc redirect về `/` | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Menu admin ẩn trong sidebar. Truy cập trực tiếp URL admin hiển thị 403 hoặc redirect |
| **API** | `GET /api/users` trả về `403` khi gọi từ tài khoản USER |
| **DB** | Không có thay đổi |
| **Server Log** | Log ghi nhận truy cập trái phép |

**Phương pháp xác minh**: `snapshot`, `network`, `server-log`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`

---

## 5. Quản trị điều khoản (Admin Terms Management)

### E2E-023: Admin tạo điều khoản mới → xác nhận trong danh sách

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-023 |
| **Loại** | Happy Path |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Đăng nhập admin

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang quản trị điều khoản | Menu sidebar | `/admin/terms` |
| 2 | Xác nhận danh sách điều khoản hiện tại | Bảng điều khoản | — |
| 3 | Nhấn "Tạo mới" | `button[data-action="create-term"]` | — |
| 4 | Form/dialog tạo mới hiển thị | Form với trường: mã loại, phiên bản, tiêu đề, nội dung, bắt buộc, ngày hiệu lực | — |
| 5 | Nhập mã loại `COOKIE_POLICY` | `input[name="typeCode"]` | — |
| 6 | Nhập phiên bản `1` | `input[name="version"]` | — |
| 7 | Nhập tiêu đề "Chính sách Cookie" | `input[name="title"]` | — |
| 8 | Nhập nội dung điều khoản | `textarea[name="content"]` | — |
| 9 | Chọn "Không bắt buộc" | `select[name="required"]` hoặc toggle | — |
| 10 | Chọn ngày hiệu lực: ngày hôm nay | `input[name="enforceDate"]` | — |
| 11 | Nhấn "Lưu" | `button[type="submit"]` | — |
| 12 | Xác nhận thông báo thành công | Toast "Tạo điều khoản thành công" | — |
| 13 | Xác nhận điều khoản mới xuất hiện trong danh sách | Dòng mới với tiêu đề "Chính sách Cookie", trạng thái Active | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Điều khoản mới xuất hiện trong danh sách, trạng thái "Active", toast thành công |
| **API** | `POST /api/terms` trả về `201` |
| **DB** | Bản ghi mới trong `TB_COMM_TRMS` với `TY_CD = 'COOKIE_POLICY'`, `TTL = 'Chính sách Cookie'`, `REQD_YN = 'N'`, `ACTV_YN = 'Y'` |
| **Server Log** | Log ghi nhận tạo điều khoản mới |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`

**Dữ liệu test**: `ADMIN_EMAIL`, thông tin điều khoản mới

---

### E2E-024: Admin chỉnh sửa điều khoản → xác nhận thay đổi

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-024 |
| **Loại** | Happy Path |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- Đăng nhập admin, ở trang `/admin/terms`
- Có ít nhất 1 điều khoản trong danh sách

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Ở trang quản trị điều khoản | — | `/admin/terms` |
| 2 | Nhấn nút "Chỉnh sửa" trên điều khoản đầu tiên | `button[data-action="edit-term"]` | — |
| 3 | Form chỉnh sửa hiển thị với dữ liệu hiện tại | — | — |
| 4 | Thay đổi tiêu đề thành "Điều khoản sử dụng (Cập nhật)" | `input[name="title"]` | — |
| 5 | Nhấn "Lưu" | `button[type="submit"]` | — |
| 6 | Xác nhận thông báo thành công | Toast "Cập nhật thành công" | — |
| 7 | Xác nhận tiêu đề mới trong danh sách | Dòng hiển thị "Điều khoản sử dụng (Cập nhật)" | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Tiêu đề cập nhật trong danh sách, toast thành công |
| **API** | `PATCH /api/terms/{id}` trả về `200` |
| **DB** | `TTL` được cập nhật, `UPDT_DT` và `UPDT_BY` được đặt |
| **Server Log** | Log ghi nhận chỉnh sửa điều khoản |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`

**Dữ liệu test**: `ADMIN_EMAIL`, ID điều khoản mục tiêu

---

### E2E-025: Admin vô hiệu hóa điều khoản → xác nhận trạng thái

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-025 |
| **Loại** | Happy Path |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- Đăng nhập admin, ở trang `/admin/terms`
- Có điều khoản tùy chọn đang active (không phải TOS/Privacy bắt buộc)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Ở trang quản trị điều khoản | — | `/admin/terms` |
| 2 | Tìm điều khoản tùy chọn đang active | Dòng có trạng thái "Active" | — |
| 3 | Nhấn nút "Vô hiệu hóa" hoặc "Xóa" | `button[data-action="deactivate-term"]` | — |
| 4 | Xác nhận trong dialog | Nút "Xác nhận" | — |
| 5 | Xác nhận trạng thái thay đổi | Badge chuyển sang "Inactive" (màu xám) | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Trạng thái chuyển sang "Inactive", badge màu xám, toast thành công |
| **API** | `DELETE /api/terms/{id}` (soft delete) trả về `200` |
| **DB** | `ACTV_YN = 'N'` hoặc `DEL_YN = 'Y'` |
| **Server Log** | Log ghi nhận vô hiệu hóa điều khoản |

**Phương pháp xác minh**: `snapshot`, `network`, `db-query`

**Dữ liệu test**: `ADMIN_EMAIL`, ID điều khoản tùy chọn

---

### E2E-026: Đăng ký mới hiển thị danh sách điều khoản đã cập nhật

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-026 |
| **Loại** | Alternative Path |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- Admin vừa tạo điều khoản mới "Chính sách Cookie" (E2E-023)
- Admin vừa vô hiệu hóa điều khoản tùy chọn cũ (E2E-025)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đăng xuất khỏi tài khoản admin | — | — |
| 2 | Truy cập trang đăng ký | — | `/signup` |
| 3 | Xác nhận danh sách điều khoản hiển thị | Danh sách checkbox điều khoản | — |
| 4 | Kiểm tra điều khoản mới "Chính sách Cookie" có xuất hiện | Checkbox mới | — |
| 5 | Kiểm tra điều khoản đã vô hiệu hóa **không** xuất hiện | — | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Trang đăng ký hiển thị điều khoản mới, không hiển thị điều khoản đã inactive |
| **API** | `GET /api/terms/active` trả về danh sách chỉ gồm điều khoản active |
| **DB** | — |
| **Server Log** | — |

**Phương pháp xác minh**: `snapshot`, `network`

**Dữ liệu test**: Không cần đăng nhập

---

## 6. Bảo mật (Security)

### E2E-027: Rate limit đăng nhập → 429 sau 5 lần thất bại

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-027 |
| **Loại** | Edge Case |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- Trình duyệt ở trang `/login`
- Rate limit counter đã reset (chờ đủ thời gian hoặc reset thủ công)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng nhập | — | `/login` |
| 2 | Nhập email và mật khẩu sai, nhấn "Đăng nhập" (lần 1) | — | — |
| 3 | Xác nhận thông báo lỗi thông thường | "Email hoặc mật khẩu không chính xác" | — |
| 4 | Lặp lại bước 2 (lần 2, 3, 4, 5) | — | — |
| 5 | Nhập email và mật khẩu, nhấn "Đăng nhập" (lần 6) | — | — |
| 6 | Xác nhận bị chặn | — | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Thông báo "Quá nhiều yêu cầu. Vui lòng thử lại sau." hoặc tương tự, nút "Đăng nhập" có thể bị disabled tạm thời |
| **API** | Request thứ 6 trả về status `429 Too Many Requests` |
| **DB** | Không có thay đổi |
| **Server Log** | Log ghi nhận rate limit triggered cho IP |

**Phương pháp xác minh**: `network`, `console`, `server-log`

**Dữ liệu test**: Email bất kỳ, mật khẩu sai

---

### E2E-028: Rate limit đăng ký → 429 sau 3 lần

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-028 |
| **Loại** | Edge Case |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- Trình duyệt ở trang `/signup`
- Rate limit counter đã reset

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng ký | — | `/signup` |
| 2 | Điền form với email trùng (để tạo lỗi nhưng vẫn gửi request), nhấn "Đăng ký" (lần 1) | — | — |
| 3 | Xác nhận lỗi thông thường (409 email trùng) | — | — |
| 4 | Lặp lại bước 2 (lần 2, 3) | — | — |
| 5 | Điền form, nhấn "Đăng ký" (lần 4) | — | — |
| 6 | Xác nhận bị chặn rate limit | — | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Thông báo "Quá nhiều yêu cầu. Vui lòng thử lại sau." |
| **API** | Request thứ 4 trả về status `429` |
| **DB** | Không có bản ghi mới |
| **Server Log** | Log ghi nhận rate limit triggered |

**Phương pháp xác minh**: `network`, `server-log`

**Dữ liệu test**: `EXISTING_EMAIL`, `TEST_PASSWORD`

---

### E2E-029: Token không truy cập được qua JavaScript (HttpOnly cookies)

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-029 |
| **Loại** | Edge Case |
| **Ưu tiên** | High |

**Điều kiện tiên quyết**:
- User đã đăng nhập thành công (cookies đã được set)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đăng nhập thành công | — | `/` |
| 2 | Mở DevTools Console | — | — |
| 3 | Chạy `document.cookie` trong console | — | — |
| 4 | Kiểm tra kết quả | — | — |
| 5 | Mở tab Application > Cookies trong DevTools | — | — |
| 6 | Kiểm tra thuộc tính HttpOnly, Secure, SameSite của `access_token` và `refresh_token` | — | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | — |
| **API** | — |
| **DB** | — |
| **Server Log** | — |
| **Console** | `document.cookie` trả về chuỗi **không** chứa `access_token` và `refresh_token` (vì HttpOnly). Trong tab Application, cookies `access_token` và `refresh_token` có flag: `HttpOnly = true`, `SameSite = Lax` (production: `Secure = true`) |

**Phương pháp xác minh**: `console`, `network` (kiểm tra Set-Cookie headers)

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`

---

## 7. Responsive & Accessibility

### E2E-030: Trang đăng nhập responsive trên mobile

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-030 |
| **Loại** | Edge Case |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- Viewport: 375x812 (iPhone 14)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đặt viewport 375x812 | — | — |
| 2 | Truy cập trang đăng nhập | — | `/login` |
| 3 | Kiểm tra form hiển thị đầy đủ, không bị cắt | Form email, mật khẩu, nút đăng nhập | — |
| 4 | Kiểm tra các trường input có chiều rộng phù hợp | Trường input chiếm ~100% chiều rộng container | — |
| 5 | Kiểm tra nút "Đăng nhập" có kích thước bấm đủ lớn | Nút có chiều cao >= 44px (Apple HIG) | — |
| 6 | Nhập email, mật khẩu và nhấn "Đăng nhập" | — | — |
| 7 | Xác nhận chức năng hoạt động bình thường trên mobile | Đăng nhập thành công | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Form hiển thị đầy đủ, không có thanh cuộn ngang, nút bấm đủ lớn, text đọc được (font-size >= 16px để tránh zoom trên iOS) |
| **API** | Hoạt động bình thường |
| **DB** | — |
| **Server Log** | — |

**Phương pháp xác minh**: `snapshot`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`

---

### E2E-031: Trang đăng ký responsive trên mobile

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-031 |
| **Loại** | Edge Case |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- Viewport: 375x812 (iPhone 14)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đặt viewport 375x812 | — | — |
| 2 | Truy cập trang đăng ký | — | `/signup` |
| 3 | Kiểm tra form hiển thị đầy đủ | Form với tất cả trường: email, mật khẩu, tên, SĐT, điều khoản | — |
| 4 | Cuộn xuống kiểm tra danh sách điều khoản | Checkbox và label điều khoản | — |
| 5 | Kiểm tra checkbox bấm được dễ dàng (touch target >= 44x44) | Checkbox + label | — |
| 6 | Kiểm tra nút "Đăng ký" hiển thị đúng | Nút có chiều rộng phù hợp | — |
| 7 | Thực hiện đăng ký trên mobile | — | — |
| 8 | Xác nhận hoạt động bình thường | — | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Form hiển thị đầy đủ, cuộn dọc mượt, checkbox đủ lớn để bấm, không có thanh cuộn ngang |
| **API** | Hoạt động bình thường |
| **DB** | — |
| **Server Log** | — |

**Phương pháp xác minh**: `snapshot`

**Dữ liệu test**: Email ngẫu nhiên, `TEST_PASSWORD`

---

### E2E-032: Dashboard sidebar thu gọn trên mobile

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-032 |
| **Loại** | Edge Case |
| **Ưu tiên** | Medium |

**Điều kiện tiên quyết**:
- User đã đăng nhập
- Viewport: 375x812 (iPhone 14)

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Đăng nhập thành công | — | — |
| 2 | Đặt viewport 375x812 | — | — |
| 3 | Xác nhận sidebar bị ẩn mặc định | Sidebar không hiển thị, có nút hamburger menu | `/` |
| 4 | Nhấn nút hamburger menu | `button[data-action="toggle-sidebar"]` | — |
| 5 | Xác nhận sidebar hiển thị (overlay hoặc slide-in) | Sidebar với menu navigation | — |
| 6 | Nhấn menu item "Hồ sơ" | `a[href="/profile"]` | — |
| 7 | Xác nhận chuyển trang và sidebar tự đóng | Trang profile, sidebar ẩn | `/profile` |
| 8 | Thay đổi viewport về 1440x900 | — | — |
| 9 | Xác nhận sidebar hiển thị cố định | Sidebar luôn visible | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Mobile: sidebar ẩn + hamburger menu. Mở sidebar qua hamburger, đóng khi chọn menu item. Desktop: sidebar luôn hiển thị |
| **API** | — |
| **DB** | — |
| **Server Log** | — |

**Phương pháp xác minh**: `snapshot`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`

---

### E2E-033: Điều hướng bàn phím trên form đăng nhập

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | E2E-033 |
| **Loại** | Edge Case |
| **Ưu tiên** | Low |

**Điều kiện tiên quyết**:
- Trình duyệt ở trang `/login`
- Không sử dụng chuột

**Hành trình người dùng**:

| Bước | Hành động | Phần tử UI | URL |
|------|----------|------------|-----|
| 1 | Truy cập trang đăng nhập | — | `/login` |
| 2 | Nhấn Tab → focus vào trường email | `input[name="email"]` — focus ring hiển thị | — |
| 3 | Nhập email | — | — |
| 4 | Nhấn Tab → focus vào trường mật khẩu | `input[name="password"]` — focus ring hiển thị | — |
| 5 | Nhập mật khẩu | — | — |
| 6 | Nhấn Tab → focus vào nút "Đăng nhập" | `button[type="submit"]` — focus ring hiển thị | — |
| 7 | Nhấn Enter → submit form | — | — |
| 8 | Xác nhận form được submit | — | — |
| 9 | Nhấn Tab → focus vào liên kết "Quên mật khẩu" | `a[href="/forgot-password"]` | — |
| 10 | Nhấn Tab → focus vào liên kết "Đăng ký" | `a[href="/signup"]` | — |

**Kết quả mong đợi**:

| Tầng | Kết quả |
|------|---------|
| **UI** | Thứ tự Tab logic: email → mật khẩu → nút đăng nhập → liên kết quên mật khẩu → liên kết đăng ký. Focus ring hiển thị rõ ràng (outline visible) trên mỗi phần tử. Enter trên nút submit gửi form |
| **API** | Form submit hoạt động bình thường qua keyboard |
| **DB** | — |
| **Server Log** | — |

**Phương pháp xác minh**: `snapshot`

**Dữ liệu test**: `TEST_EMAIL`, `TEST_PASSWORD`

---

## Bảng tổng hợp

### Theo nhóm kịch bản

| Nhóm | Số kịch bản | IDs |
|------|------------|-----|
| Đăng ký & Đăng nhập | 9 | E2E-001 ~ E2E-009 |
| Quản lý phiên | 4 | E2E-010 ~ E2E-013 |
| Hồ sơ cá nhân | 4 | E2E-014 ~ E2E-017 |
| Quản trị người dùng | 5 | E2E-018 ~ E2E-022 |
| Quản trị điều khoản | 4 | E2E-023 ~ E2E-026 |
| Bảo mật | 3 | E2E-027 ~ E2E-029 |
| Responsive & Accessibility | 4 | E2E-030 ~ E2E-033 |
| **Tổng cộng** | **33** | |

### Theo loại kịch bản

| Loại | Số lượng | Tỷ lệ |
|------|---------|--------|
| Happy Path | 16 | 48.5% |
| Error Path | 7 | 21.2% |
| Alternative Path | 2 | 6.1% |
| Edge Case | 8 | 24.2% |
| **Tổng cộng** | **33** | **100%** |

### Theo mức ưu tiên

| Ưu tiên | Số lượng | Tỷ lệ |
|---------|---------|--------|
| Critical | 4 | 12.1% |
| High | 17 | 51.5% |
| Medium | 11 | 33.3% |
| Low | 1 | 3.0% |
| **Tổng cộng** | **33** | **100%** |

### Ma trận bao phủ tính năng

| Tính năng | Kịch bản E2E | Liên quan test API | Liên quan test UI |
|-----------|-------------|-------------------|-------------------|
| Đăng ký | E2E-001~005 | TC-AUTH-001~008 | TC-UI-007~011 |
| Đăng nhập | E2E-006~008 | TC-AUTH-009~015 | TC-UI-001~006 |
| Quên mật khẩu | E2E-009 | — | — |
| Refresh token | E2E-010 | TC-AUTH-016~021 | — |
| Đăng xuất | E2E-011 | TC-AUTH-022~024 | — |
| Bảo vệ route | E2E-012 | TC-AUTH-025~032 | TC-UI-015 |
| Tài khoản bị khóa | E2E-013 | TC-AUTH-014 | TC-UI-006 |
| Hồ sơ cá nhân | E2E-014~017 | — | TC-UI-012~014 |
| Admin - User | E2E-018~022 | — | TC-UI-016~019 |
| Admin - Terms | E2E-023~026 | — | TC-UI-020~023 |
| Rate limiting | E2E-027~028 | TC-AUTH-008, TC-AUTH-015 | — |
| HttpOnly cookies | E2E-029 | — | — |
| Responsive | E2E-030~032 | — | — |
| Accessibility | E2E-033 | — | — |
