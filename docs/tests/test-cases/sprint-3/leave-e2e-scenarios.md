# Leave E2E Test Scenarios

## Overview
- **Feature**: Quản lý Nghỉ phép — Loại nghỉ, yêu cầu nghỉ, phê duyệt/từ chối/hủy, số phép còn lại, thống kê
- **Related Modules**: Auth (User), Employee (nhân viên)
- **API Endpoints**: GET/POST /api/leave-types, PATCH/DELETE /api/leave-types/[cd], GET/POST /api/leave, PATCH /api/leave/[id]/approve, PATCH /api/leave/[id]/reject, PATCH /api/leave/[id]/cancel, GET /api/leave/balance, GET /api/leave/stats
- **DB Tables**: TC_LV_TYPE, TB_LV_REQ, TB_EMPL, TB_COMM_USER
- **Blueprint**: docs/blueprints/005-leave/blueprint.md

---

## Scenario Group 1: Loại nghỉ phép (Leave Types) — ADMIN

### E2E-L001: Xem danh sách loại nghỉ (7 loại mặc định)
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN, seed data 7 loại nghỉ mặc định (ANNUAL, SICK, MARRIAGE, MATERNITY, PATERNITY, BEREAVEMENT, UNPAID)
- **User Journey**:
  1. Gọi API GET /api/leave-types
  2. Kiểm tra danh sách trả về 7 loại nghỉ
- **Expected Results**:
  - UI: Tab "Loại nghỉ phép" hiển thị bảng 7 dòng, các cột: Mã, Tên loại, Số ngày tối đa, Trạng thái, Hành động
  - API: GET /api/leave-types → 200 OK, data.length = 7
  - DB: TC_LV_TYPE có 7 bản ghi, USE_YN = 'Y'
- **Verification Method**: snapshot / network
- **Test Data**: Seed 7 loại mặc định: `ANNUAL(12), SICK(30), MARRIAGE(3), MATERNITY(180), PATERNITY(5), BEREAVEMENT(3), UNPAID(null)`

### E2E-L002: Tạo loại nghỉ mới thành công
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Navigate to `/leave`
  2. Click tab "Loại nghỉ phép"
  3. Click "Thêm loại nghỉ"
  4. Nhập Mã loại: "TRAINING"
  5. Nhập Tên loại: "Nghỉ đào tạo"
  6. Nhập Số ngày tối đa: 5
  7. Click "Tạo mới"
- **Expected Results**:
  - UI: Toast "Đã tạo loại nghỉ phép", dialog đóng, loại mới hiển thị trong bảng
  - API: POST /api/leave-types → 201 Created, response chứa `lvTypeCd: "TRAINING"`, `lvTypeNm: "Nghỉ đào tạo"`, `maxDays: 5`, `useYn: "Y"`
  - DB: TC_LV_TYPE có bản ghi mới, LV_TYPE_CD = 'TRAINING', USE_YN = 'Y'
- **Verification Method**: snapshot / network
- **Test Data**: `{ lvTypeCd: "TRAINING", lvTypeNm: "Nghỉ đào tạo", maxDays: 5 }`

### E2E-L003: Tạo loại nghỉ mã trùng (409)
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, loại ANNUAL đã tồn tại
- **User Journey**:
  1. Gọi API POST /api/leave-types với body: `{ lvTypeCd: "ANNUAL", lvTypeNm: "Nghỉ phép trùng" }`
- **Expected Results**:
  - UI: Toast lỗi "Mã loại nghỉ phép đã tồn tại"
  - API: POST /api/leave-types → 409 Conflict
  - DB: Không thay đổi
- **Verification Method**: network
- **Test Data**: `{ lvTypeCd: "ANNUAL", lvTypeNm: "Nghỉ phép trùng" }`

### E2E-L004: Sửa loại nghỉ (tên, maxDays, useYn)
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, loại ANNUAL tồn tại
- **User Journey**:
  1. Navigate to `/leave`, click tab "Loại nghỉ phép"
  2. Click icon sửa ở dòng "Nghỉ phép năm"
  3. Thay đổi Tên loại: "Nghỉ phép năm (mới)"
  4. Thay đổi Số ngày tối đa: 15
  5. Click "Cập nhật"
- **Expected Results**:
  - UI: Toast "Đã cập nhật loại nghỉ phép", dòng ANNUAL cập nhật tên + số ngày
  - API: PATCH /api/leave-types/ANNUAL → 200 OK
  - DB: TC_LV_TYPE (ANNUAL).LV_TYPE_NM = 'Nghỉ phép năm (mới)', MAX_DAYS = 15
- **Verification Method**: snapshot / network
- **Test Data**: `{ lvTypeNm: "Nghỉ phép năm (mới)", maxDays: 15 }`

### E2E-L005: Xóa loại nghỉ không có yêu cầu
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, loại TRAINING tồn tại, không có yêu cầu nào sử dụng loại TRAINING
- **User Journey**:
  1. Navigate to `/leave`, click tab "Loại nghỉ phép"
  2. Click icon xóa ở dòng "Nghỉ đào tạo"
  3. Xác nhận xóa
- **Expected Results**:
  - UI: Toast "Đã xóa loại nghỉ phép", dòng TRAINING biến mất khỏi bảng
  - API: DELETE /api/leave-types/TRAINING → 200 OK
  - DB: TC_LV_TYPE không còn bản ghi TRAINING
- **Verification Method**: snapshot / network
- **Test Data**: Loại TRAINING (không có yêu cầu liên kết)

### E2E-L006: Xóa loại nghỉ đang có yêu cầu (409)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN, loại ANNUAL có ít nhất 1 yêu cầu nghỉ phép trong TB_LV_REQ
- **User Journey**:
  1. Gọi API DELETE /api/leave-types/ANNUAL
- **Expected Results**:
  - UI: Toast lỗi "Không thể xóa loại nghỉ phép đang có yêu cầu sử dụng"
  - API: DELETE /api/leave-types/ANNUAL → 409 Conflict
  - DB: Không thay đổi, TC_LV_TYPE (ANNUAL) vẫn tồn tại
- **Verification Method**: network
- **Test Data**: Loại ANNUAL đã có yêu cầu trong TB_LV_REQ

---

## Scenario Group 2: Tạo yêu cầu nghỉ phép

### E2E-L007: Tạo yêu cầu thành công (tự tính ngày trừ T7/CN)
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập USER (liên kết NV-0001), loại ANNUAL tồn tại và đang hoạt động, số phép còn đủ
- **User Journey**:
  1. Navigate to `/leave`
  2. Click "Tạo yêu cầu nghỉ phép"
  3. Chọn Loại nghỉ: "Nghỉ phép năm"
  4. Chọn Ngày bắt đầu: 2026-03-25 (Thứ Tư)
  5. Chọn Ngày kết thúc: 2026-03-31 (Thứ Ba tuần sau)
  6. Kiểm tra Số ngày hiển thị: 5 (trừ T7 28/3, CN 29/3)
  7. Nhập Lý do: "Việc gia đình"
  8. Click "Gửi yêu cầu"
- **Expected Results**:
  - UI: Toast "Đã tạo yêu cầu nghỉ phép", dialog đóng, yêu cầu mới hiển thị trong bảng với trạng thái PENDING (badge vàng)
  - API: POST /api/leave → 201 Created, response chứa `lvDays: 5`, `aprvlSttsCd: "PENDING"`
  - DB: TB_LV_REQ có bản ghi mới, LV_DAYS = 5, APRVL_STTS_CD = 'PENDING', CREAT_BY = user email
- **Verification Method**: snapshot / network
- **Test Data**: `{ lvTypeCd: "ANNUAL", startDt: "2026-03-25", endDt: "2026-03-31", rsn: "Việc gia đình" }`

### E2E-L008: Tạo yêu cầu ngày quá khứ (USER → 400)
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Đăng nhập USER (liên kết nhân viên)
- **User Journey**:
  1. Gọi API POST /api/leave với body: `{ lvTypeCd: "ANNUAL", startDt: "2026-03-01", endDt: "2026-03-02", rsn: "Test" }`
- **Expected Results**:
  - UI: Toast lỗi "Ngày bắt đầu phải từ hôm nay trở đi."
  - API: POST /api/leave → 400 Bad Request, error: "Ngày bắt đầu phải từ hôm nay trở đi."
  - DB: Không tạo bản ghi mới
- **Verification Method**: network
- **Test Data**: `{ lvTypeCd: "ANNUAL", startDt: "2026-03-01", endDt: "2026-03-02", rsn: "Test" }`

### E2E-L009: Tạo yêu cầu trùng ngày (400)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập USER, đã có yêu cầu PENDING/APPROVED từ 2026-03-25 đến 2026-03-26
- **User Journey**:
  1. Gọi API POST /api/leave với body: `{ lvTypeCd: "SICK", startDt: "2026-03-25", endDt: "2026-03-27", rsn: "Bị ốm" }`
- **Expected Results**:
  - UI: Toast lỗi "Đã có yêu cầu nghỉ phép trùng ngày."
  - API: POST /api/leave → 400 Bad Request, error: "Đã có yêu cầu nghỉ phép trùng ngày."
  - DB: Không tạo bản ghi mới
- **Verification Method**: network
- **Test Data**: `{ lvTypeCd: "SICK", startDt: "2026-03-25", endDt: "2026-03-27", rsn: "Bị ốm" }`

### E2E-L010: Tạo yêu cầu vượt số phép (400)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập USER, loại ANNUAL maxDays = 12, NV-0001 đã dùng 11 ngày (APPROVED + PENDING)
- **User Journey**:
  1. Gọi API POST /api/leave với body: `{ lvTypeCd: "ANNUAL", startDt: "2026-12-01", endDt: "2026-12-05", rsn: "Nghỉ cuối năm" }`
  2. Yêu cầu 5 ngày, chỉ còn 1 ngày
- **Expected Results**:
  - UI: Toast lỗi "Số phép năm còn lại không đủ. Còn 1 ngày, yêu cầu 5 ngày."
  - API: POST /api/leave → 400 Bad Request, error chứa "Số phép năm còn lại không đủ"
  - DB: Không tạo bản ghi mới
- **Verification Method**: network
- **Test Data**: `{ lvTypeCd: "ANNUAL", startDt: "2026-12-01", endDt: "2026-12-05", rsn: "Nghỉ cuối năm" }`

### E2E-L011: Tạo yêu cầu loại không tồn tại (400)
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập USER
- **User Journey**:
  1. Gọi API POST /api/leave với body: `{ lvTypeCd: "NON_EXISTENT", startDt: "2026-04-01", endDt: "2026-04-02", rsn: "Test" }`
- **Expected Results**:
  - API: POST /api/leave → 400 Bad Request, error: "Loại nghỉ phép không tồn tại hoặc đã ngừng sử dụng."
  - DB: Không tạo bản ghi mới
- **Verification Method**: network
- **Test Data**: `{ lvTypeCd: "NON_EXISTENT", startDt: "2026-04-01", endDt: "2026-04-02", rsn: "Test" }`

### E2E-L012: Tạo yêu cầu loại đã ngừng sử dụng (400)
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Đăng nhập USER, loại TRAINING tồn tại với USE_YN = 'N'
- **User Journey**:
  1. Gọi API POST /api/leave với body: `{ lvTypeCd: "TRAINING", startDt: "2026-04-01", endDt: "2026-04-02", rsn: "Đào tạo" }`
- **Expected Results**:
  - API: POST /api/leave → 400 Bad Request, error: "Loại nghỉ phép không tồn tại hoặc đã ngừng sử dụng."
  - DB: Không tạo bản ghi mới
- **Verification Method**: network
- **Test Data**: `{ lvTypeCd: "TRAINING", startDt: "2026-04-01", endDt: "2026-04-02", rsn: "Đào tạo" }`

### E2E-L013: Tạo yêu cầu ngày kết thúc trước ngày bắt đầu (400)
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Đăng nhập USER
- **User Journey**:
  1. Gọi API POST /api/leave với body: `{ lvTypeCd: "ANNUAL", startDt: "2026-04-05", endDt: "2026-04-03", rsn: "Test" }`
- **Expected Results**:
  - API: POST /api/leave → 400 Bad Request, error: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu"
  - DB: Không tạo bản ghi mới
- **Verification Method**: network
- **Test Data**: `{ lvTypeCd: "ANNUAL", startDt: "2026-04-05", endDt: "2026-04-03", rsn: "Test" }`

### E2E-L014: ADMIN tạo yêu cầu hộ nhân viên
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, NV-0002 (Trần Thị Bình) tồn tại, loại ANNUAL đang hoạt động, số phép đủ
- **User Journey**:
  1. Navigate to `/leave`
  2. Click "Tạo yêu cầu nghỉ phép"
  3. Chọn Nhân viên: "Trần Thị Bình" (dropdown, chỉ hiện khi ADMIN)
  4. Chọn Loại nghỉ: "Nghỉ phép năm"
  5. Chọn Ngày bắt đầu: 2026-04-06 (Thứ Hai)
  6. Chọn Ngày kết thúc: 2026-04-07 (Thứ Ba)
  7. Nhập Lý do: "ADMIN tạo hộ cho nhân viên"
  8. Click "Gửi yêu cầu"
- **Expected Results**:
  - UI: Toast "Đã tạo yêu cầu nghỉ phép", dialog đóng
  - API: POST /api/leave → 201 Created, response chứa `emplId` = NV-0002 id, `aprvlSttsCd: "PENDING"`
  - DB: TB_LV_REQ có bản ghi mới, EMPL_ID = NV-0002 id, CREAT_BY = admin email
- **Verification Method**: snapshot / network
- **Test Data**: `{ emplId: "[NV-0002-id]", lvTypeCd: "ANNUAL", startDt: "2026-04-06", endDt: "2026-04-07", rsn: "ADMIN tạo hộ cho nhân viên" }`

---

## Scenario Group 3: Phê duyệt/Từ chối/Hủy

### E2E-L015: ADMIN duyệt yêu cầu PENDING thành công
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN (liên kết NV-0001), có yêu cầu PENDING từ NV-0002
- **User Journey**:
  1. Navigate to `/leave`
  2. Tìm yêu cầu PENDING của Trần Thị Bình
  3. Click nút "Duyệt"
  4. Xác nhận phê duyệt
- **Expected Results**:
  - UI: Toast "Đã phê duyệt yêu cầu", badge chuyển từ vàng (PENDING) sang xanh (APPROVED)
  - API: PATCH /api/leave/[id]/approve → 200 OK, response chứa `aprvlSttsCd: "APPROVED"`, `approver` populated, `aprvlDt` populated
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'APPROVED', APRVR_ID = NV-0001 id, APRVL_DT populated
- **Verification Method**: snapshot / network
- **Test Data**: Yêu cầu PENDING id

### E2E-L016: ADMIN từ chối yêu cầu PENDING
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN (liên kết NV-0001), có yêu cầu PENDING
- **User Journey**:
  1. Navigate to `/leave`
  2. Tìm yêu cầu PENDING
  3. Click nút "Từ chối"
  4. Nhập lý do từ chối (tùy chọn): "Không đủ nhân sự thay thế"
  5. Xác nhận từ chối
- **Expected Results**:
  - UI: Toast "Đã từ chối yêu cầu", badge chuyển từ vàng (PENDING) sang đỏ (REJECTED)
  - API: PATCH /api/leave/[id]/reject → 200 OK, response chứa `aprvlSttsCd: "REJECTED"`, `approver` populated, `aprvlDt` populated
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'REJECTED', APRVR_ID = NV-0001 id, APRVL_DT populated
- **Verification Method**: snapshot / network
- **Test Data**: `{ reason: "Không đủ nhân sự thay thế" }`

### E2E-L017: NV hủy yêu cầu PENDING của mình
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập USER (liên kết NV-0002), có yêu cầu PENDING do NV-0002 tạo
- **User Journey**:
  1. Navigate to `/leave`
  2. Tìm yêu cầu PENDING của mình
  3. Click nút "Hủy yêu cầu"
  4. Xác nhận hủy
- **Expected Results**:
  - UI: Toast "Đã hủy yêu cầu", badge chuyển từ vàng (PENDING) sang xám (CANCELLED)
  - API: PATCH /api/leave/[id]/cancel → 200 OK, response chứa `aprvlSttsCd: "CANCELLED"`
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'CANCELLED'
- **Verification Method**: snapshot / network
- **Test Data**: Yêu cầu PENDING của NV-0002

### E2E-L018: Duyệt yêu cầu không phải PENDING (400)
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, có yêu cầu đã APPROVED
- **User Journey**:
  1. Gọi API PATCH /api/leave/[approved-id]/approve
- **Expected Results**:
  - API: PATCH → 400 Bad Request, error: "Chỉ có thể phê duyệt yêu cầu đang chờ duyệt."
  - DB: Không thay đổi
- **Verification Method**: network
- **Test Data**: Yêu cầu có APRVL_STTS_CD = 'APPROVED'

### E2E-L019: NV hủy yêu cầu của người khác (403)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập USER (liên kết NV-0003), có yêu cầu PENDING do NV-0002 tạo
- **User Journey**:
  1. Gọi API PATCH /api/leave/[nv0002-request-id]/cancel
- **Expected Results**:
  - API: PATCH → 403 Forbidden, error: "Bạn không có quyền hủy yêu cầu này."
  - DB: Không thay đổi, yêu cầu vẫn ở trạng thái PENDING
- **Verification Method**: network
- **Test Data**: Yêu cầu PENDING của NV-0002, đăng nhập bằng NV-0003

---

## Scenario Group 4: Số phép còn lại (Balance)

### E2E-L020: Xem balance đúng (APPROVED + PENDING tính vào used)
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập USER (liên kết NV-0001), NV-0001 có: ANNUAL — 2 yêu cầu APPROVED (tổng 3 ngày), 1 yêu cầu PENDING (2 ngày); SICK — 1 yêu cầu APPROVED (1 ngày)
- **User Journey**:
  1. Gọi API GET /api/leave/balance
- **Expected Results**:
  - API: GET /api/leave/balance → 200 OK
  - Data: `balances` chứa:
    - ANNUAL: `maxDays: 12, usedDays: 3.0, pendingDays: 2.0, remainingDays: 7.0`
    - SICK: `maxDays: 30, usedDays: 1.0, pendingDays: 0, remainingDays: 29.0`
  - DB: Tổng LV_DAYS trong TB_LV_REQ khớp (APPROVED + PENDING)
- **Verification Method**: network
- **Test Data**: NV-0001 với các yêu cầu đã seed sẵn

### E2E-L021: Balance theo năm
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập USER, NV-0001 có yêu cầu nghỉ phép năm 2025 (APPROVED, 5 ngày) và năm 2026 (APPROVED, 3 ngày)
- **User Journey**:
  1. Gọi API GET /api/leave/balance?year=2025
  2. Gọi API GET /api/leave/balance?year=2026
- **Expected Results**:
  - API (year=2025): ANNUAL usedDays = 5.0, remainingDays = 7.0
  - API (year=2026): ANNUAL usedDays = 3.0, remainingDays = 9.0
  - Data: year field trong response khớp query param
- **Verification Method**: network
- **Test Data**: NV-0001 với yêu cầu APPROVED ở cả 2 năm

### E2E-L022: USER chỉ xem balance của mình
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập USER (liên kết NV-0002)
- **User Journey**:
  1. Gọi API GET /api/leave/balance (không truyền emplId)
  2. Gọi API GET /api/leave/balance?emplId=[NV-0001-id] (cố xem balance NV khác)
- **Expected Results**:
  - API (1): 200 OK, data chứa `emplNo: "NV-0002"` — balance của chính mình
  - API (2): Hệ thống bỏ qua emplId param, trả về balance của NV-0002 (hoặc 403 Forbidden)
  - DB: Query chỉ lấy TB_LV_REQ có EMPL_ID = NV-0002
- **Verification Method**: network
- **Test Data**: Đăng nhập NV-0002, thử xem balance NV-0001

---

## Scenario Group 5: Danh sách và lọc

### E2E-L023: Danh sách yêu cầu (phân trang)
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN, seed 25 yêu cầu nghỉ phép (đa trạng thái, đa loại, đa nhân viên)
- **User Journey**:
  1. Gọi API GET /api/leave?page=1&limit=20
  2. Gọi API GET /api/leave?page=2&limit=20
- **Expected Results**:
  - API (page 1): 200 OK, data.length = 20, meta: `{ total: 25, page: 1, limit: 20, totalPages: 2 }`
  - API (page 2): 200 OK, data.length = 5, meta: `{ total: 25, page: 2, limit: 20, totalPages: 2 }`
  - UI: Bảng hiển thị 20 dòng, phân trang 2 trang
- **Verification Method**: snapshot / network
- **Test Data**: Seed 25 yêu cầu nghỉ phép

### E2E-L024: Lọc theo trạng thái
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, seed data có 5 PENDING, 3 APPROVED, 2 REJECTED
- **User Journey**:
  1. Navigate to `/leave`
  2. Chọn filter trạng thái: "Chờ duyệt"
- **Expected Results**:
  - UI: Bảng chỉ hiển thị yêu cầu PENDING (badge vàng)
  - API: GET /api/leave?status=PENDING → 200 OK, tất cả data có `aprvlSttsCd: "PENDING"`
- **Verification Method**: snapshot / network
- **Test Data**: Seed data đa trạng thái

### E2E-L025: Lọc theo loại nghỉ
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, seed data có yêu cầu ANNUAL và SICK
- **User Journey**:
  1. Navigate to `/leave`
  2. Chọn filter loại nghỉ: "Nghỉ ốm"
- **Expected Results**:
  - UI: Bảng chỉ hiển thị yêu cầu loại SICK
  - API: GET /api/leave?lvTypeCd=SICK → 200 OK, tất cả data có `leaveType.lvTypeCd: "SICK"`
- **Verification Method**: snapshot / network
- **Test Data**: Seed data đa loại nghỉ

### E2E-L026: Lọc theo năm
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN, có yêu cầu năm 2025 và 2026
- **User Journey**:
  1. Chọn filter năm: 2025
- **Expected Results**:
  - UI: Bảng chỉ hiển thị yêu cầu của năm 2025
  - API: GET /api/leave?year=2025 → 200 OK, tất cả data có startDt trong năm 2025
- **Verification Method**: network
- **Test Data**: Seed data đa năm

### E2E-L027: USER chỉ xem yêu cầu của mình
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập USER (liên kết NV-0002), seed data có yêu cầu của nhiều nhân viên
- **User Journey**:
  1. Navigate to `/leave`
  2. Kiểm tra bảng chỉ hiển thị yêu cầu của NV-0002
  3. Gọi API GET /api/leave → kiểm tra data chỉ chứa yêu cầu của NV-0002
- **Expected Results**:
  - UI: Bảng chỉ hiển thị yêu cầu của "Trần Thị Bình"
  - API: GET /api/leave → 200 OK, tất cả data có `employee.emplNo: "NV-0002"`
  - DB: Query tự lọc EMPL_ID = NV-0002 id khi role = USER
- **Verification Method**: snapshot / network
- **Test Data**: Đăng nhập NV-0002

---

## Scenario Group 6: Thống kê

### E2E-L028: Thống kê dashboard (nghỉ hôm nay, chờ duyệt, sắp nghỉ)
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, seed data: 2 NV nghỉ hôm nay (APPROVED, startDt <= today <= endDt), 5 yêu cầu PENDING, 8 yêu cầu APPROVED trong tháng, 3 yêu cầu sắp nghỉ (startDt > today)
- **User Journey**:
  1. Gọi API GET /api/leave/stats
- **Expected Results**:
  - API: GET /api/leave/stats → 200 OK
  - Data:
    - `onLeaveToday: 2` (số NV đang nghỉ hôm nay)
    - `pendingRequests: 5` (số yêu cầu chờ duyệt)
    - `approvedThisMonth: 8` (số yêu cầu đã duyệt tháng này)
    - `upcomingLeaves`: danh sách NV sắp nghỉ, mỗi item chứa `emplNm`, `lvTypeNm`, `startDt`, `endDt`, `lvDays`
  - UI: 4 thẻ thống kê hiển thị đúng số liệu trên tab "Yêu cầu nghỉ phép"
- **Verification Method**: snapshot / network
- **Test Data**: Seed data phù hợp với thống kê mong đợi

---

## Scenario Group 7: Phân quyền

### E2E-L029: USER không tạo/sửa/xóa loại nghỉ (403)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập USER
- **User Journey**:
  1. Gọi API POST /api/leave-types với body: `{ lvTypeCd: "TEST", lvTypeNm: "Test" }`
  2. Gọi API PATCH /api/leave-types/ANNUAL với body: `{ lvTypeNm: "Hack" }`
  3. Gọi API DELETE /api/leave-types/ANNUAL
- **Expected Results**:
  - API (1): POST → 403 Forbidden
  - API (2): PATCH → 403 Forbidden
  - API (3): DELETE → 403 Forbidden
  - DB: Không thay đổi
- **Verification Method**: network
- **Test Data**: Đăng nhập với tài khoản USER

### E2E-L030: USER không duyệt/từ chối yêu cầu (403)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập USER, có yêu cầu PENDING
- **User Journey**:
  1. Gọi API PATCH /api/leave/[id]/approve
  2. Gọi API PATCH /api/leave/[id]/reject
- **Expected Results**:
  - API (1): PATCH → 403 Forbidden
  - API (2): PATCH → 403 Forbidden
  - DB: Yêu cầu vẫn ở trạng thái PENDING
- **Verification Method**: network
- **Test Data**: Đăng nhập với tài khoản USER, yêu cầu PENDING

### E2E-L031: API không có token (401)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Không đăng nhập (không gửi header Authorization)
- **User Journey**:
  1. Gọi API GET /api/leave-types (không có token)
  2. Gọi API GET /api/leave (không có token)
  3. Gọi API POST /api/leave (không có token)
  4. Gọi API GET /api/leave/balance (không có token)
  5. Gọi API GET /api/leave/stats (không có token)
- **Expected Results**:
  - API (tất cả): 401 Unauthorized
  - DB: Không thay đổi
- **Verification Method**: network
- **Test Data**: Không gửi header Authorization

---

## Scenario Group 8: UI — Trang /leave

### E2E-L032: Tab Yêu cầu hiển thị bảng + thống kê
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN, seed data yêu cầu nghỉ phép đa trạng thái
- **User Journey**:
  1. Navigate to `/leave`
  2. Kiểm tra tab "Yêu cầu nghỉ phép" mặc định active
  3. Kiểm tra 4 thẻ thống kê: Chờ duyệt | Đã duyệt tháng này | Nghỉ hôm nay | Sắp nghỉ
  4. Kiểm tra bộ lọc: Trạng thái | Loại nghỉ | Phòng ban | Năm
  5. Kiểm tra bảng: Mã NV | Họ tên | Loại | Từ ngày | Đến ngày | Số ngày | Lý do | Trạng thái | Hành động
  6. Kiểm tra badge màu: PENDING (vàng), APPROVED (xanh), REJECTED (đỏ), CANCELLED (xám)
- **Expected Results**:
  - UI: 4 thẻ thống kê hiển thị số liệu chính xác
  - UI: Bảng có đầy đủ cột, phân trang hoạt động
  - UI: Badge trạng thái đúng màu sắc
  - API: GET /api/leave/stats → 200 OK; GET /api/leave → 200 OK
- **Verification Method**: snapshot / network
- **Test Data**: Seed data đa trạng thái

### E2E-L033: Tab Loại nghỉ hiển thị (ADMIN only)
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Navigate to `/leave`
  2. Click tab "Loại nghỉ phép"
  3. Kiểm tra bảng: Mã | Tên loại | Số ngày tối đa | Trạng thái | Hành động (Sửa/Xóa)
  4. Kiểm tra nút "Thêm loại nghỉ" hiển thị
  5. Đăng nhập USER
  6. Kiểm tra tab "Loại nghỉ phép" ẩn hoặc không có nút Sửa/Xóa
- **Expected Results**:
  - UI (ADMIN): Tab "Loại nghỉ phép" hiển thị, bảng 7 dòng, nút "Thêm loại nghỉ" visible, icon Sửa/Xóa mỗi dòng
  - UI (USER): Tab "Loại nghỉ phép" ẩn hoặc không có hành động quản lý
- **Verification Method**: snapshot
- **Test Data**: ADMIN và USER account

### E2E-L034: Dialog tạo yêu cầu (tính ngày tự động)
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập USER (liên kết nhân viên)
- **User Journey**:
  1. Navigate to `/leave`
  2. Click "Tạo yêu cầu nghỉ phép"
  3. Kiểm tra dialog hiển thị:
     - Nhân viên: tự điền (disabled)
     - Dropdown loại nghỉ: chỉ hiển thị loại đang hoạt động (useYn = 'Y')
     - Date picker ngày bắt đầu: disabled ngày quá khứ
     - Date picker ngày kết thúc: disabled ngày trước ngày bắt đầu
  4. Chọn loại nghỉ: "Nghỉ phép năm"
  5. Chọn ngày bắt đầu: 2026-03-25 (Thứ Tư)
  6. Chọn ngày kết thúc: 2026-03-31 (Thứ Ba)
  7. Kiểm tra Số ngày hiển thị: 5 (tự tính, trừ T7/CN)
  8. Kiểm tra hiển thị "Còn N ngày" phép còn lại
- **Expected Results**:
  - UI: Dialog form hiển thị đầy đủ các trường theo thiết kế
  - UI: Số ngày tự động tính = 5 (25, 26, 27, 30, 31 — trừ T7 28, CN 29)
  - UI: Hiển thị info phép còn lại theo loại nghỉ đã chọn
  - UI: Textarea lý do bắt buộc, tối đa 500 ký tự
- **Verification Method**: snapshot
- **Test Data**: Ngày 2026-03-25 → 2026-03-31 (Thứ Tư → Thứ Ba)

### E2E-L035: Nút Duyệt/Từ chối chỉ hiển thị khi PENDING + ADMIN
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, seed data có yêu cầu PENDING và APPROVED
- **User Journey**:
  1. Navigate to `/leave`
  2. Kiểm tra dòng PENDING: hiển thị nút "Duyệt" + "Từ chối"
  3. Kiểm tra dòng APPROVED: không có nút "Duyệt" / "Từ chối"
  4. Kiểm tra dòng REJECTED: không có nút "Duyệt" / "Từ chối"
  5. Kiểm tra dòng CANCELLED: không có nút "Duyệt" / "Từ chối"
  6. Đăng nhập USER
  7. Kiểm tra: không hiển thị nút "Duyệt" / "Từ chối" ở bất kỳ dòng nào
- **Expected Results**:
  - UI (ADMIN): Chỉ dòng PENDING có nút Duyệt/Từ chối
  - UI (USER): Không có nút Duyệt/Từ chối, chỉ có nút "Hủy" cho yêu cầu PENDING của mình
- **Verification Method**: snapshot
- **Test Data**: Yêu cầu đa trạng thái, ADMIN và USER account

---

## Scenario Group 9: UI — Tab Nghỉ phép trong chi tiết NV

### E2E-L036: Hiển thị balance cards + lịch sử yêu cầu
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập, nhân viên NV-0001 tồn tại, có yêu cầu nghỉ phép với nhiều loại + nhiều trạng thái
- **User Journey**:
  1. Navigate to `/employees/[NV-0001-id]`
  2. Click tab "Nghỉ phép"
  3. Kiểm tra thẻ số phép còn lại:
     - Dạng progress bar cho từng loại nghỉ (ANNUAL, SICK, v.v.)
     - Hiển thị: "Đã dùng X / Tổng Y ngày" cho mỗi loại
  4. Kiểm tra nút "Tạo yêu cầu nghỉ phép"
  5. Kiểm tra bảng lịch sử yêu cầu: Loại | Từ-Đến | Số ngày | Trạng thái | Ngày tạo
- **Expected Results**:
  - UI: Balance cards hiển thị progress bar cho từng loại nghỉ, số liệu khớp API /api/leave/balance
  - UI: Nút "Tạo yêu cầu nghỉ phép" hiển thị (cả USER và ADMIN)
  - UI: Bảng lịch sử hiển thị yêu cầu nghỉ phép của NV-0001, sắp xếp theo ngày tạo giảm dần
  - API: GET /api/leave/balance?emplId=[NV-0001-id] → 200 OK; GET /api/leave?emplId=[NV-0001-id] → 200 OK
- **Verification Method**: snapshot / network
- **Test Data**: NV-0001 với yêu cầu nghỉ phép đa loại, đa trạng thái

---

## Summary

| Type | Count |
|------|-------|
| Happy Path | 20 |
| Error Path | 16 |
| **Total** | **36** |

| Priority | Count |
|----------|-------|
| Critical | 14 |
| High | 17 |
| Medium | 5 |
| Low | 0 |
| **Total** | **36** |

| Scenario Group | Scenarios | IDs |
|----------------|-----------|-----|
| 1. Loại nghỉ phép (Leave Types) — ADMIN | 6 | E2E-L001 ~ E2E-L006 |
| 2. Tạo yêu cầu nghỉ phép | 8 | E2E-L007 ~ E2E-L014 |
| 3. Phê duyệt/Từ chối/Hủy | 5 | E2E-L015 ~ E2E-L019 |
| 4. Số phép còn lại (Balance) | 3 | E2E-L020 ~ E2E-L022 |
| 5. Danh sách và lọc | 5 | E2E-L023 ~ E2E-L027 |
| 6. Thống kê | 1 | E2E-L028 |
| 7. Phân quyền | 3 | E2E-L029 ~ E2E-L031 |
| 8. UI — Trang /leave | 4 | E2E-L032 ~ E2E-L035 |
| 9. UI — Tab Nghỉ phép trong chi tiết NV | 1 | E2E-L036 |
