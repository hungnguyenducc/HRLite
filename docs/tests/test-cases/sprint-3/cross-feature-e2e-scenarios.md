# Cross-feature E2E Test Scenarios — Sprint 3

## Overview
- **Features**: Attendance + Leave + Employee + Dashboard (tích hợp)
- **Mục tiêu**: Kiểm tra luồng nghiệp vụ xuyên suốt nhiều module Sprint 3

---

## Scenario Group 1: Luồng chấm công hàng ngày hoàn chỉnh

### E2E-X001: Check-in → Làm việc → Check-out → Xem lịch sử
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập với tài khoản user có liên kết Employee (admin@hrlite.com → NV-0001)
- **User Journey**:
  1. Gọi API GET /api/attendance/today → data = null (chưa check-in)
  2. Gọi API POST /api/attendance/check-in → 201, atndSttsCd = "PRESENT"
  3. Gọi API GET /api/attendance/today → data có chkInTm, chkOutTm = null
  4. Gọi API POST /api/attendance/check-out → 200, workHour > 0
  5. Navigate /employees/[NV-0001-id] → tab "Chấm công" → kiểm tra bản ghi hôm nay hiển thị
- **Expected Results**:
  - API: Check-in 201, check-out 200, today trả đúng trạng thái
  - DB: TH_ATND có 1 bản ghi cho hôm nay với cả chkInTm và chkOutTm
  - UI: Tab Chấm công hiển thị bản ghi với giờ vào/ra và số giờ làm
- **Verification Method**: network / snapshot

### E2E-X002: Dashboard stats phản ánh đúng chấm công hôm nay
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, đã có seed attendance data
- **User Journey**:
  1. Gọi API GET /api/attendance/stats → ghi nhận checkedIn ban đầu
  2. Tạo chấm công check-in (POST /api/attendance/check-in)
  3. Gọi lại GET /api/attendance/stats → checkedIn tăng 1
  4. Gọi GET /api/dashboard/stats → kiểm tra checkedInToday
- **Expected Results**:
  - API: attendance/stats.checkedIn tăng 1 sau check-in
  - API: dashboard/stats.checkedInToday phản ánh đúng
- **Verification Method**: network

---

## Scenario Group 2: Luồng nghỉ phép hoàn chỉnh

### E2E-X003: Tạo yêu cầu → ADMIN duyệt → Balance cập nhật
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN, NV-0001 có liên kết user
- **User Journey**:
  1. Gọi GET /api/leave/balance?emplId=[NV-0001-id] → ghi nhận remainingDays ban đầu cho ANNUAL
  2. Gọi POST /api/leave với {lvTypeCd: "ANNUAL", startDt: "+5d", endDt: "+6d", rsn: "Nghỉ phép test"}
  3. Kiểm tra response: 201, aprvlSttsCd = "PENDING", lvDays tự tính
  4. Gọi GET /api/leave/balance → pendingDays tăng, remainingDays giảm
  5. Gọi PATCH /api/leave/[id]/approve → 200, APPROVED
  6. Gọi GET /api/leave/balance → usedDays tăng, pendingDays giảm
  7. Navigate /employees/[NV-0001-id] → tab "Nghỉ phép" → kiểm tra yêu cầu hiển thị "Đã duyệt"
- **Expected Results**:
  - API: Balance thay đổi chính xác khi PENDING → APPROVED
  - DB: TB_LV_REQ.APRVL_STTS_CD = 'APPROVED', APRVR_ID populated
  - UI: Tab Nghỉ phép hiển thị badge "Đã duyệt" cho yêu cầu
- **Verification Method**: network / snapshot

### E2E-X004: Tạo yêu cầu → NV hủy → Balance phục hồi
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập user có Employee liên kết
- **User Journey**:
  1. Gọi GET /api/leave/balance → ghi nhận remaining ban đầu
  2. Gọi POST /api/leave → 201 PENDING
  3. Gọi GET /api/leave/balance → remaining giảm (do pending)
  4. Gọi PATCH /api/leave/[id]/cancel → 200 CANCELLED
  5. Gọi GET /api/leave/balance → remaining phục hồi về ban đầu
- **Expected Results**:
  - Balance phục hồi chính xác sau hủy
- **Verification Method**: network

---

## Scenario Group 3: Tích hợp Attendance + Leave + Dashboard

### E2E-X005: Dashboard hiển thị đúng thống kê nghỉ phép
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, có leave requests seed data
- **User Journey**:
  1. Gọi GET /api/leave/stats → ghi nhận pendingRequests
  2. Gọi GET /api/dashboard/stats → kiểm tra pendingLeaves = leave/stats.pendingRequests
  3. Tạo yêu cầu mới PENDING
  4. Gọi lại cả 2 API → pendingRequests tăng 1
- **Expected Results**:
  - dashboard/stats.pendingLeaves = leave/stats.pendingRequests (nhất quán)
- **Verification Method**: network

### E2E-X006: Sidebar navigation — Chấm công và Nghỉ phép
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập
- **User Journey**:
  1. Click "Chấm công" trong sidebar → /attendance (trang load, có bảng)
  2. Click "Nghỉ phép" trong sidebar → /leave (trang load, có tabs)
  3. Kiểm tra active state sidebar đúng ở mỗi trang
- **Expected Results**:
  - UI: Trang /attendance load thành công, sidebar highlight "Chấm công"
  - UI: Trang /leave load thành công, sidebar highlight "Nghỉ phép"
  - Không có console errors
- **Verification Method**: snapshot / console

---

## Scenario Group 4: Edge cases tích hợp

### E2E-X007: NV nghỉ việc → Không check-in được + Không tạo yêu cầu nghỉ được
- **Type**: Edge Case
- **Priority**: High
- **Preconditions**: NV có trạng thái RESIGNED + liên kết User
- **User Journey**:
  1. Gọi POST /api/attendance/check-in với token NV RESIGNED → 400
  2. Gọi POST /api/leave với emplId = NV RESIGNED → 400
- **Expected Results**:
  - API: Cả 2 trả 400 "Nhân viên không ở trạng thái đang làm việc"
- **Verification Method**: network

### E2E-X008: Attendance summary + Leave balance cho cùng 1 NV
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN, NV-0003 có dữ liệu chấm công + nghỉ phép
- **User Journey**:
  1. Navigate /employees/[NV-0003-id]
  2. Click tab "Chấm công" → kiểm tra bảng hiển thị (có mặt, đi trễ, tổng giờ)
  3. Click tab "Nghỉ phép" → kiểm tra balance cards + lịch sử yêu cầu
- **Expected Results**:
  - Tab Chấm công: Hiển thị thống kê tháng + bảng chi tiết
  - Tab Nghỉ phép: Hiển thị balance cards theo loại + danh sách yêu cầu
- **Verification Method**: snapshot

---

## Summary
| Type | Count |
|------|-------|
| Happy Path | 6 |
| Alternative Path | 0 |
| Edge Case | 2 |
| Error Path | 0 |
| **Total** | **8** |
