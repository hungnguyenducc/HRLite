# Firebase Auth Migration E2E Test Scenarios

## Overview
- **Feature**: Firebase Authentication — Sign Up, Sign In, Withdrawal (xóa tài khoản)
- **Related Modules**: Auth (Firebase SDK), Profile, Dashboard
- **API Endpoints**: POST /api/auth/session, POST /api/auth/signup, POST /api/auth/logout, DELETE /api/users/me, GET /api/users/me
- **DB Tables**: TB_COMM_USER (+ FIREBASE_UID), TH_COMM_USER_AGRE
- **Blueprint**: docs/blueprints/006-firebase-auth/blueprint.md

---

## Quy ước

- **URL gốc**: `http://localhost:3002`
- **Trình duyệt**: Chrome (qua Playwright MCP)
- **Viewport mặc định**: 1280x720 (Desktop)

### Dữ liệu test chuẩn

| Biến | Giá trị |
|------|---------|
| `TEST_EMAIL` | `e2e-firebase-{timestamp}@hrlite.test` |
| `TEST_PASSWORD` | `Test@2026!Str0ng` |
| `TEST_WEAK_PASSWORD` | `weak` |
| `TEST_NAME` | `Firebase Tester` |
| `ADMIN_EMAIL` | `admin@hrlite.com` |
| `ADMIN_PASSWORD` | `Admin@123456` |
| `EXISTING_EMAIL` | `admin@hrlite.com` |

---

## Scenario Group 1: Sign Up (Đăng ký qua Firebase)

### E2E-F001: Đăng ký thành công với email + password + terms
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Chưa đăng nhập, seed data có 2 required terms
- **User Journey**:
  1. Navigate to `/signup`
  2. Nhập Họ và tên: `Firebase Tester`
  3. Nhập Email: `e2e-firebase-{timestamp}@hrlite.test`
  4. Nhập Mật khẩu: `Test@2026!Str0ng`
  5. Nhập Xác nhận mật khẩu: `Test@2026!Str0ng`
  6. Tick checkbox "Chính sách bảo mật" (bắt buộc)
  7. Tick checkbox "Điều khoản sử dụng" (bắt buộc)
  8. Click nút "Đăng ký"
- **Expected Results**:
  - UI: Redirect về `/dashboard`, hiển thị "Chào buổi sáng, Firebase Tester", role "Người dùng"
  - API: POST /api/auth/signup → 201 Created
  - Network: Cookie `__session` được set (HttpOnly, SameSite=Strict)
  - DB: TB_COMM_USER có bản ghi mới với `FIREBASE_UID` NOT NULL, `PASSWD_HASH` NULL, `STTS_CD = 'ACTIVE'`
  - DB: TH_COMM_USER_AGRE có 2 bản ghi cho user mới
- **Verification Method**: snapshot / network / db-query
- **Test Data**: `{ email: "e2e-firebase-{ts}@hrlite.test", password: "Test@2026!Str0ng", displayName: "Firebase Tester" }`

### E2E-F002: Đăng ký thiếu required terms → bị chặn
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Chưa đăng nhập
- **User Journey**:
  1. Navigate to `/signup`
  2. Nhập email + password hợp lệ
  3. KHÔNG tick checkbox bắt buộc
  4. Click "Đăng ký"
- **Expected Results**:
  - UI: Alert "Vui lòng đồng ý với tất cả điều khoản bắt buộc" hiển thị dưới fieldset
  - API: Không gọi API (validation client-side)
  - DB: Không thay đổi
- **Verification Method**: snapshot
- **Test Data**: Không cần thêm

### E2E-F003: Đăng ký email đã tồn tại → lỗi
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Tài khoản `admin@hrlite.com` đã tồn tại trong Firebase
- **User Journey**:
  1. Navigate to `/signup`
  2. Nhập Email: `admin@hrlite.com`
  3. Nhập password hợp lệ, tick terms
  4. Click "Đăng ký"
- **Expected Results**:
  - UI: Toast lỗi "Email đã được sử dụng" (từ Firebase error code `auth/email-already-in-use`)
  - API: Không gọi /api/auth/signup (Firebase client SDK reject trước)
- **Verification Method**: snapshot / console
- **Test Data**: `{ email: "admin@hrlite.com" }`

### E2E-F004: Đăng ký mật khẩu yếu → lỗi Firebase
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Chưa đăng nhập
- **User Journey**:
  1. Navigate to `/signup`
  2. Nhập email hợp lệ, Nhập mật khẩu: `weak`
  3. Nhập xác nhận: `weak`
  4. Tick terms, Click "Đăng ký"
- **Expected Results**:
  - UI: Validation Zod client-side chặn trước: "Mật khẩu phải có ít nhất 8 ký tự"
  - Nếu Zod pass nhưng Firebase reject: Toast "Mật khẩu quá yếu. Tối thiểu 6 ký tự"
- **Verification Method**: snapshot
- **Test Data**: `{ password: "weak" }`

### E2E-F005: Đăng ký server fail → rollback Firebase user
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Firebase signup thành công nhưng server DB fail (ví dụ: required terms invalid)
- **User Journey**:
  1. Navigate to `/signup`
  2. Nhập email + password hợp lệ
  3. Tick terms nhưng gửi agreedTermsIds không hợp lệ (manipulate via console)
  4. Click "Đăng ký"
- **Expected Results**:
  - UI: Toast lỗi từ server
  - Firebase: User vừa tạo bị xóa (rollback)
  - DB: Không tạo bản ghi mới
- **Verification Method**: network / console
- **Test Data**: agreedTermsIds chứa UUID không tồn tại

### E2E-F006: Password strength indicator hiển thị đúng
- **Type**: Alternative Path
- **Priority**: Medium
- **Preconditions**: Đang ở trang signup
- **User Journey**:
  1. Nhập mật khẩu `ab` → indicator "Yếu" (đỏ, 1/3)
  2. Nhập mật khẩu `Abcd1234` → indicator "Trung bình" (vàng, 2/3)
  3. Nhập mật khẩu `Test@2026!Str0ng` → indicator "Mạnh" (xanh, 3/3)
- **Expected Results**:
  - UI: Strength bar + label thay đổi theo từng bước
- **Verification Method**: snapshot

---

## Scenario Group 2: Sign In (Đăng nhập qua Firebase)

### E2E-F010: Đăng nhập thành công → session cookie set
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Tài khoản `admin@hrlite.com` tồn tại trong Firebase + DB, sttsCd='ACTIVE'
- **User Journey**:
  1. Navigate to `/login`
  2. Nhập Email: `admin@hrlite.com`
  3. Nhập Mật khẩu: `Admin@123456`
  4. Click "Đăng nhập"
- **Expected Results**:
  - UI: Redirect về `/dashboard`, hiển thị "Chào buổi sáng, Quản trị viên"
  - API: POST /api/auth/session → 200 OK
  - Network: Cookie `__session` set (HttpOnly, SameSite=Strict, max-age=432000)
  - DB: TB_COMM_USER.LAST_LOGIN_DT cập nhật
- **Verification Method**: snapshot / network
- **Test Data**: `{ email: "admin@hrlite.com", password: "Admin@123456" }`

### E2E-F011: Đăng nhập sai password → lỗi
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Tài khoản tồn tại
- **User Journey**:
  1. Navigate to `/login`
  2. Nhập Email: `admin@hrlite.com`
  3. Nhập Mật khẩu: `WrongPassword123`
  4. Click "Đăng nhập"
- **Expected Results**:
  - UI: Toast lỗi "Email hoặc mật khẩu không đúng"
  - API: Không gọi /api/auth/session (Firebase reject ở client)
  - Cookie: Không set `__session`
- **Verification Method**: snapshot / network
- **Test Data**: `{ password: "WrongPassword123" }`

### E2E-F012: Đăng nhập tài khoản WITHDRAWN → lỗi 403
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Tài khoản đã bị xóa (sttsCd='WITHDRAWN') nhưng vẫn tồn tại trong Firebase (edge case)
- **User Journey**:
  1. Navigate to `/login`
  2. Nhập credentials của tài khoản đã xóa
  3. Click "Đăng nhập"
- **Expected Results**:
  - UI: Toast lỗi "Tài khoản đã bị xóa"
  - API: POST /api/auth/session → 403 Forbidden
- **Verification Method**: network
- **Test Data**: Tài khoản với sttsCd='WITHDRAWN' trong DB

### E2E-F013: Đăng nhập tài khoản SUSPENDED → lỗi 403
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Tài khoản bị đình chỉ (sttsCd='SUSPENDED')
- **User Journey**:
  1. Nhập credentials của tài khoản bị đình chỉ
  2. Click "Đăng nhập"
- **Expected Results**:
  - UI: Toast lỗi "Tài khoản đã bị đình chỉ"
  - API: POST /api/auth/session → 403 Forbidden
- **Verification Method**: network

### E2E-F014: Đăng nhập email không tồn tại → lỗi Firebase
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Email chưa đăng ký
- **User Journey**:
  1. Nhập Email: `nonexistent@hrlite.test`
  2. Nhập password bất kỳ
  3. Click "Đăng nhập"
- **Expected Results**:
  - UI: Toast "Email hoặc mật khẩu không đúng"
- **Verification Method**: snapshot

### E2E-F015: Quá nhiều lần thử → Firebase rate limit
- **Type**: Edge Case
- **Priority**: Medium
- **Preconditions**: Đã thử đăng nhập sai nhiều lần liên tiếp
- **User Journey**:
  1. Thử đăng nhập sai 5+ lần liên tiếp
- **Expected Results**:
  - UI: Toast "Quá nhiều lần thử. Vui lòng thử lại sau"
  - Firebase error code: `auth/too-many-requests`
- **Verification Method**: snapshot

---

## Scenario Group 3: Logout (Đăng xuất)

### E2E-F020: Logout thành công
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đã đăng nhập với tài khoản admin
- **User Journey**:
  1. Click user avatar (top-right) → mở menu
  2. Click "Đăng xuất"
- **Expected Results**:
  - UI: Redirect về `/login`
  - API: POST /api/auth/logout → 200 OK
  - Network: Cookie `__session` bị xóa (maxAge=0)
  - Firebase: Refresh tokens bị revoke
- **Verification Method**: snapshot / network

### E2E-F021: Truy cập trang protected sau khi logout → redirect login
- **Type**: Edge Case
- **Priority**: High
- **Preconditions**: Vừa logout
- **User Journey**:
  1. Sau khi logout, navigate trực tiếp đến `/dashboard`
- **Expected Results**:
  - UI: Redirect về `/login` (không hiển thị dashboard data)
  - API: GET /api/users/me → 401
- **Verification Method**: snapshot / network

---

## Scenario Group 4: Session Management

### E2E-F030: Session cookie tự động gửi trong mọi request
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đã đăng nhập
- **User Journey**:
  1. Navigate đến các trang: `/dashboard`, `/employees`, `/departments`, `/attendance`, `/leave`
- **Expected Results**:
  - Mọi trang load thành công (không 401)
  - API calls đều gửi cookie `__session` tự động
  - Không có console error
- **Verification Method**: network / console

### E2E-F031: Session expired → redirect login
- **Type**: Edge Case
- **Priority**: High
- **Preconditions**: Session cookie hết hạn (hoặc bị xóa thủ công)
- **User Journey**:
  1. Xóa cookie `__session` qua DevTools
  2. Refresh trang `/dashboard`
- **Expected Results**:
  - UI: Redirect về `/login`
  - API: GET /api/users/me → 401 "Chưa xác thực"
- **Verification Method**: snapshot / network

### E2E-F032: Admin route kiểm tra phân quyền
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập với USER role (không phải ADMIN)
- **User Journey**:
  1. Đăng nhập tài khoản user thường
  2. Gọi API: GET /api/users (admin-only endpoint)
- **Expected Results**:
  - API: 403 "Bạn không có quyền truy cập tài nguyên này"
- **Verification Method**: network

---

## Scenario Group 5: Withdrawal (Xóa tài khoản)

### E2E-F040: Xóa tài khoản thành công (email xác nhận khớp)
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập với tài khoản test (KHÔNG dùng admin)
- **User Journey**:
  1. Navigate to `/profile`
  2. Click tab "Bảo mật"
  3. Scroll xuống "Vùng nguy hiểm"
  4. Click "Xóa tài khoản"
  5. Dialog mở → nhập email xác nhận (khớp với email hiện tại)
  6. Nút "Xóa vĩnh viễn" enabled
  7. Click "Xóa vĩnh viễn"
- **Expected Results**:
  - UI: Toast "Tài khoản đã được xóa", redirect về `/login`
  - API: DELETE /api/users/me → 200 OK
  - DB: sttsCd='WITHDRAWN', delYn='Y', email masked `withdrawn_{id}@deleted.local`, phone=NULL, photoUrl=NULL
  - Firebase: User bị xóa (`adminAuth.deleteUser`)
  - Cookie: `__session` bị xóa
- **Verification Method**: snapshot / network / db-query
- **Test Data**: Tạo tài khoản test mới trước khi xóa

### E2E-F041: Email xác nhận không khớp → nút disabled
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Đang ở dialog xác nhận xóa tài khoản
- **User Journey**:
  1. Mở dialog xóa tài khoản
  2. Nhập email KHÔNG khớp: `wrong@email.com`
- **Expected Results**:
  - UI: Nút "Xóa vĩnh viễn" vẫn disabled (không thể click)
- **Verification Method**: snapshot

### E2E-F042: Hủy xóa tài khoản → dialog đóng, không thay đổi
- **Type**: Alternative Path
- **Priority**: Medium
- **Preconditions**: Đang ở dialog xác nhận
- **User Journey**:
  1. Mở dialog xóa tài khoản
  2. Nhập email khớp
  3. Click "Hủy"
- **Expected Results**:
  - UI: Dialog đóng, email input reset
  - DB: Không thay đổi
- **Verification Method**: snapshot

### E2E-F043: Tài khoản đã xóa không thể đăng nhập lại
- **Type**: Edge Case
- **Priority**: Critical
- **Preconditions**: Tài khoản vừa bị xóa ở E2E-F040
- **User Journey**:
  1. Navigate to `/login`
  2. Nhập credentials của tài khoản đã xóa
  3. Click "Đăng nhập"
- **Expected Results**:
  - UI: Toast lỗi (Firebase: user not found hoặc Server: tài khoản đã bị xóa)
  - Không thể truy cập hệ thống
- **Verification Method**: snapshot / network

---

## Scenario Group 6: Password Change (Đổi mật khẩu qua Firebase)

### E2E-F050: Đổi mật khẩu thành công
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập, đang ở trang profile tab Bảo mật
- **User Journey**:
  1. Navigate to `/profile` → tab "Bảo mật"
  2. Nhập Mật khẩu hiện tại: `Test@2026!Str0ng`
  3. Nhập Mật khẩu mới: `NewPass@2026!`
  4. Nhập Xác nhận mật khẩu mới: `NewPass@2026!`
  5. Click "Đổi mật khẩu"
- **Expected Results**:
  - UI: Toast "Đã đổi mật khẩu thành công", form reset
  - Firebase: Password cập nhật (via `reauthenticateWithCredential` + `updatePassword`)
  - Đăng nhập lại với mật khẩu mới thành công
- **Verification Method**: snapshot

### E2E-F051: Đổi mật khẩu sai mật khẩu hiện tại → lỗi
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Đăng nhập
- **User Journey**:
  1. Nhập Mật khẩu hiện tại: `WrongOldPassword`
  2. Nhập mật khẩu mới hợp lệ
  3. Click "Đổi mật khẩu"
- **Expected Results**:
  - UI: Toast "Email hoặc mật khẩu không đúng" (Firebase re-auth fail)
  - Firebase: Password KHÔNG thay đổi
- **Verification Method**: snapshot

### E2E-F052: Đổi mật khẩu xác nhận không khớp → validation
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đang ở form đổi mật khẩu
- **User Journey**:
  1. Nhập mật khẩu hiện tại hợp lệ
  2. Nhập mật khẩu mới: `NewPass@2026!`
  3. Nhập xác nhận: `DifferentPass@2026!`
  4. Click "Đổi mật khẩu"
- **Expected Results**:
  - UI: Hiển thị lỗi "Mật khẩu mới không khớp" dưới input xác nhận
  - Firebase: Không gọi API (validation client-side)
- **Verification Method**: snapshot

---

## Scenario Group 7: Full User Journey (End-to-End)

### E2E-F060: Sign Up → Dashboard → Profile → Logout → Sign In → Withdraw
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Không có session, seed data available
- **User Journey**:
  1. Navigate to `/signup`
  2. Đăng ký tài khoản mới (email + password + terms)
  3. Verify redirect về `/dashboard` → thấy user info
  4. Navigate to `/profile` → verify thông tin cá nhân hiển thị đúng
  5. Click Đăng xuất → verify redirect về `/login`
  6. Đăng nhập lại bằng cùng credentials
  7. Verify dashboard load đúng
  8. Navigate to `/profile` → tab "Bảo mật"
  9. Thực hiện xóa tài khoản (nhập email xác nhận)
  10. Verify redirect về `/login`
  11. Thử đăng nhập lại → verify lỗi
- **Expected Results**:
  - Toàn bộ flow chạy không lỗi
  - 0 console errors
  - Tất cả API calls trả về 200/201
  - Cuối cùng: tài khoản không thể login
- **Verification Method**: snapshot / network / console / db-query

### E2E-F061: Migration user login → hoạt động bình thường
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: User đã được migrate từ bcrypt sang Firebase (có FIREBASE_UID trong DB)
- **User Journey**:
  1. Navigate to `/login`
  2. Đăng nhập bằng credentials của user đã migrate (admin@hrlite.com)
  3. Verify dashboard load thành công
  4. Navigate qua các trang: employees, departments, leave
  5. Verify không có lỗi
- **Expected Results**:
  - Session cookie set
  - Dashboard + tất cả trang hoạt động
  - DB: lastLoginDt cập nhật
- **Verification Method**: snapshot / network

---

## Summary

| Type | Count |
|------|-------|
| Happy Path | 8 |
| Alternative Path | 2 |
| Edge Case | 4 |
| Error Path | 9 |
| **Total** | **23** |

### Priority Distribution

| Priority | Count |
|----------|-------|
| Critical | 8 |
| High | 10 |
| Medium | 5 |
| **Total** | **23** |
