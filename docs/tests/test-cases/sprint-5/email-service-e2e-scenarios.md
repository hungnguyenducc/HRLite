# Email Service E2E Test Scenarios

## Overview
- **Feature**: Email Service (SMTP/AWS SES) — Gửi email thông báo khi phê duyệt/từ chối nghỉ phép
- **Related Modules**: Leave (005), Auth (001/006), Employee (003)
- **API Endpoints**: PATCH /api/leave/[id]/approve, PATCH /api/leave/[id]/reject
- **DB Tables**: TB_LV_REQ (RJCT_RSN mới), TB_EMPL (email), TC_LV_TYPE
- **Blueprint**: docs/blueprints/007-email/blueprint.md
- **Existing Coverage**: Sprint-3 leave-e2e-scenarios.md đã cover approve/reject cơ bản, sprint này bổ sung email notification + reject reason

---

## Scenario Group 1: Email thông báo duyệt nghỉ phép

### E2E-EM001: Duyệt yêu cầu nghỉ phép → nhân viên nhận email thông báo
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**:
  - Đăng nhập ADMIN (liên kết NV-0001, tên "Nguyễn Văn An")
  - Có yêu cầu nghỉ phép PENDING của NV-0002 (tên "Trần Thị Bình", email đã verify trên SES)
  - Loại nghỉ: ANNUAL, từ 2026-03-28 đến 2026-03-30, 3 ngày
  - SMTP env vars đã cấu hình, SES production access hoặc recipient đã verify
- **User Journey**:
  1. Gọi API PATCH /api/leave/[id]/approve (ADMIN)
  2. Kiểm tra response API
  3. Kiểm tra hộp thư email nhân viên NV-0002
- **Expected Results**:
  - API: 200 OK, response chứa `aprvlSttsCd: "APPROVED"`
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'APPROVED', APRVR_ID = NV-0001 id
  - Email: Nhân viên NV-0002 nhận email với:
    - Subject: `[HRLite] Yêu cầu nghỉ phép đã được duyệt — Nghỉ phép năm`
    - Body chứa: tên NV "Trần Thị Bình", loại "Nghỉ phép năm", từ/đến ngày, 3 ngày, người duyệt "Nguyễn Văn An"
    - Header HRLite màu xanh, footer "Email này được gửi tự động..."
  - Server Log: `[Email] Gửi thành công` với messageId
- **Verification Method**: network / server-log / email inbox
- **Test Data**: Leave request PENDING, NV-0002 email = verified SES email

### E2E-EM002: Duyệt nghỉ phép — nhân viên không có email → không gửi, không lỗi
- **Type**: Edge Case
- **Priority**: Medium
- **Preconditions**:
  - Đăng nhập ADMIN
  - Có yêu cầu PENDING của NV-0003 (email = null hoặc "")
- **User Journey**:
  1. Gọi API PATCH /api/leave/[id]/approve
- **Expected Results**:
  - API: 200 OK (approve vẫn thành công)
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'APPROVED'
  - Email: Không gửi email (guard `if (updated.employee.email)` skip)
  - Server Log: Không có `[Email]` log entry
- **Verification Method**: network / server-log
- **Test Data**: NV-0003 với email = null

### E2E-EM003: Duyệt nghỉ phép — SMTP lỗi → approve vẫn thành công
- **Type**: Error Path
- **Priority**: High
- **Preconditions**:
  - Đăng nhập ADMIN
  - SMTP credentials sai (hoặc SMTP_HOST unreachable)
  - Có yêu cầu PENDING
- **User Journey**:
  1. Gọi API PATCH /api/leave/[id]/approve
- **Expected Results**:
  - API: 200 OK (approve vẫn thành công — fire-and-forget)
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'APPROVED'
  - Email: Không gửi được
  - Server Log: `[Email] Gửi thất bại` với error message
- **Verification Method**: network / server-log
- **Test Data**: SMTP credentials không hợp lệ

### E2E-EM004: Duyệt nghỉ phép — dev mode → chỉ log, không gửi email thật
- **Type**: Alternative Path
- **Priority**: Medium
- **Preconditions**:
  - NODE_ENV = "development"
  - Đăng nhập ADMIN, có yêu cầu PENDING
- **User Journey**:
  1. Gọi API PATCH /api/leave/[id]/approve
- **Expected Results**:
  - API: 200 OK
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'APPROVED'
  - Email: Không gửi thật
  - Server Log: `[Email] DEV MODE — không gửi thật` với to + subject
- **Verification Method**: server-log
- **Test Data**: NODE_ENV=development

---

## Scenario Group 2: Email thông báo từ chối nghỉ phép

### E2E-EM005: Từ chối với lý do → nhân viên nhận email có lý do từ chối
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**:
  - Đăng nhập ADMIN (liên kết NV-0001, tên "Nguyễn Văn An")
  - Có yêu cầu PENDING của NV-0002 (email verified)
  - Loại nghỉ: SICK, từ 2026-04-01 đến 2026-04-02, 2 ngày
- **User Journey**:
  1. Gọi API PATCH /api/leave/[id]/reject với body: `{ "reason": "Thiếu giấy xác nhận y tế" }`
  2. Kiểm tra response API
  3. Kiểm tra hộp thư email nhân viên
- **Expected Results**:
  - API: 200 OK, response chứa `aprvlSttsCd: "REJECTED"`, `rjctRsn: "Thiếu giấy xác nhận y tế"`
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'REJECTED', RJCT_RSN = 'Thiếu giấy xác nhận y tế'
  - Email: Nhân viên nhận email với:
    - Subject: `[HRLite] Yêu cầu nghỉ phép bị từ chối — Nghỉ ốm`
    - Body chứa: tên NV, loại nghỉ, ngày, người xử lý, **lý do từ chối "Thiếu giấy xác nhận y tế"**
    - Banner đỏ: "Yêu cầu nghỉ phép của bạn đã bị từ chối..."
  - Server Log: `[Email] Gửi thành công`
- **Verification Method**: network / server-log / email inbox
- **Test Data**: `{ reason: "Thiếu giấy xác nhận y tế" }`

### E2E-EM006: Từ chối không có lý do → email không hiển thị dòng lý do
- **Type**: Alternative Path
- **Priority**: High
- **Preconditions**:
  - Đăng nhập ADMIN
  - Có yêu cầu PENDING của NV-0002 (email verified)
- **User Journey**:
  1. Gọi API PATCH /api/leave/[id]/reject (body rỗng `{}`)
- **Expected Results**:
  - API: 200 OK, `rjctRsn: null`
  - DB: TB_LV_REQ.RJCT_RSN = null
  - Email: Nhân viên nhận email **không có dòng "Lý do từ chối"** trong bảng
  - Server Log: `[Email] Gửi thành công`
- **Verification Method**: network / server-log / email inbox
- **Test Data**: Body rỗng `{}`

### E2E-EM007: Từ chối với lý do quá dài (>500 ký tự) → validation reject
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN, có yêu cầu PENDING
- **User Journey**:
  1. Gọi API PATCH /api/leave/[id]/reject với body: `{ "reason": "A".repeat(501) }`
- **Expected Results**:
  - API: 200 OK (reason bị bỏ qua vì `safeParse` fail, reject vẫn thành công nhưng `rjctRsn = null`)
  - DB: TB_LV_REQ.RJCT_RSN = null
  - Email: Gửi email không có lý do
- **Verification Method**: network / db-query
- **Test Data**: reason 501 ký tự

### E2E-EM008: Từ chối — SMTP lỗi → reject vẫn thành công
- **Type**: Error Path
- **Priority**: High
- **Preconditions**:
  - Đăng nhập ADMIN, SMTP unreachable
  - Có yêu cầu PENDING
- **User Journey**:
  1. Gọi API PATCH /api/leave/[id]/reject với body: `{ "reason": "Lý do test" }`
- **Expected Results**:
  - API: 200 OK
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'REJECTED', RJCT_RSN = 'Lý do test'
  - Email: Không gửi được
  - Server Log: `[Email] Gửi thất bại`
- **Verification Method**: network / server-log
- **Test Data**: SMTP credentials sai

---

## Scenario Group 3: Race condition & Atomic update

### E2E-EM009: Hai ADMIN cùng approve một yêu cầu → chỉ một thành công
- **Type**: Edge Case
- **Priority**: High
- **Preconditions**:
  - 2 session ADMIN (ADMIN-A và ADMIN-B)
  - Có 1 yêu cầu PENDING
- **User Journey**:
  1. ADMIN-A gọi PATCH /api/leave/[id]/approve
  2. ADMIN-B gọi PATCH /api/leave/[id]/approve (gần đồng thời)
- **Expected Results**:
  - Một request trả 200 OK, request còn lại trả 400 "Chỉ có thể phê duyệt yêu cầu đang chờ duyệt."
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'APPROVED' (chỉ 1 lần)
  - Email: Chỉ gửi 1 email thông báo (không duplicate)
- **Verification Method**: network / db-query / server-log
- **Test Data**: 1 yêu cầu PENDING, 2 concurrent requests

### E2E-EM010: Approve yêu cầu không tồn tại → 404
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Gọi API PATCH /api/leave/non-existent-uuid/approve
- **Expected Results**:
  - API: 404 Not Found, `error: "Yêu cầu nghỉ phép không tồn tại."`
  - Email: Không gửi
- **Verification Method**: network
- **Test Data**: UUID không tồn tại

### E2E-EM011: Approve yêu cầu đã REJECTED → 400
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN, có yêu cầu đã REJECTED
- **User Journey**:
  1. Gọi API PATCH /api/leave/[rejected-id]/approve
- **Expected Results**:
  - API: 400, `error: "Chỉ có thể phê duyệt yêu cầu đang chờ duyệt."`
  - DB: Không thay đổi
  - Email: Không gửi
- **Verification Method**: network
- **Test Data**: Yêu cầu có APRVL_STTS_CD = 'REJECTED'

---

## Scenario Group 4: Email template & XSS

### E2E-EM012: Template email hiển thị đúng thông tin tiếng Việt
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**:
  - ADMIN approve yêu cầu của NV có tên "Nguyễn Thị Hương Giang"
  - Loại nghỉ "Nghỉ phép năm", 2 ngày
- **User Journey**:
  1. Gọi API PATCH /api/leave/[id]/approve
  2. Kiểm tra email nhận được
- **Expected Results**:
  - Email HTML hiển thị đúng ký tự tiếng Việt (UTF-8)
  - Ngày format "dd/mm/yyyy" (vi-VN locale)
  - Bảng thông tin đầy đủ: Loại nghỉ, Từ ngày, Đến ngày, Số ngày, Người duyệt
  - Header "HRLite" nền xanh, footer disclaimer
- **Verification Method**: email inbox / snapshot
- **Test Data**: NV tên tiếng Việt có dấu

### E2E-EM013: Tên nhân viên chứa ký tự HTML → escape đúng (XSS prevention)
- **Type**: Edge Case
- **Priority**: High
- **Preconditions**:
  - NV có tên `<script>alert('xss')</script>` (lưu trong DB)
  - Có yêu cầu PENDING của NV này
- **User Journey**:
  1. ADMIN approve yêu cầu
  2. Kiểm tra nội dung email HTML
- **Expected Results**:
  - Email HTML chứa `&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;` (đã escape)
  - Không thực thi script trong email client
  - Server Log: `[Email] Gửi thành công`
- **Verification Method**: email inbox (view source)
- **Test Data**: NV tên chứa HTML tags

---

## Scenario Group 5: SMTP Configuration

### E2E-EM014: SMTP_FROM_EMAIL chưa cấu hình → email không gửi, log error
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**:
  - SMTP_FROM_EMAIL = undefined (không set trong env)
  - Có yêu cầu PENDING
- **User Journey**:
  1. ADMIN approve yêu cầu
- **Expected Results**:
  - API: 200 OK (approve thành công)
  - Email: Không gửi
  - Server Log: `[Email] SMTP_FROM_EMAIL chưa được cấu hình`
- **Verification Method**: server-log
- **Test Data**: SMTP_FROM_EMAIL không được set

### E2E-EM015: SMTP credentials chưa cấu hình → warn khi khởi tạo, email không gửi
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**:
  - SMTP_HOST, SMTP_USER, SMTP_PASS = undefined
- **User Journey**:
  1. Khởi động server
  2. ADMIN approve yêu cầu
- **Expected Results**:
  - Server startup log: `[SMTP] SMTP_HOST, SMTP_USER hoặc SMTP_PASS chưa được cấu hình`
  - API: 200 OK
  - Email: Gửi thất bại (transporter lỗi)
  - Server Log: `[Email] Gửi thất bại`
- **Verification Method**: server-log
- **Test Data**: Không set SMTP env vars

---

## Summary
| Type | Count |
|------|-------|
| Happy Path | 4 |
| Alternative Path | 2 |
| Edge Case | 3 |
| Error Path | 6 |
| **Total** | **15** |
