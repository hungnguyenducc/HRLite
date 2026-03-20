# Cross-feature E2E Test Scenarios — Sprint 2

## Overview
- **Features**: Department + Employee + Auth (tích hợp)
- **Mục tiêu**: Kiểm tra luồng nghiệp vụ xuyên suốt nhiều module

---

## Scenario Group 1: Luồng tạo cơ cấu tổ chức hoàn chỉnh

### E2E-X001: Tạo phòng ban → Tạo nhân viên → Gán trưởng phòng
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Navigate to `/departments`, tạo phòng ban mới "DEPT-QA" / "Phòng QA"
  2. Navigate to `/employees`, tạo nhân viên "Nguyễn QA Lead", email "qa.lead@hrlite.com", phòng ban "Phòng QA"
  3. Quay lại `/departments`, sửa phòng ban "Phòng QA" → chọn trưởng phòng: "Nguyễn QA Lead"
  4. Kiểm tra cây tổ chức: "Phòng QA" hiển thị trưởng phòng + 1 NV
- **Expected Results**:
  - UI: Phòng ban hiển thị trưởng phòng + số NV chính xác
  - DB: TB_DEPT.DEPT_HEAD_ID = employee ID, TB_EMPL.DEPT_ID = dept ID
- **Verification Method**: snapshot / network / db-query

### E2E-X002: Đăng ký User → Liên kết với nhân viên → Xem profile
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Tạo nhân viên "Phạm Mới" email "moi.pham@hrlite.com"
  2. Đăng ký tài khoản User mới (signup) với email khác "moi.user@hrlite.com"
  3. ADMIN navigate `/employees/[id]` → tab Tài khoản → liên kết tài khoản vừa tạo
  4. Đăng nhập bằng tài khoản User mới → vào dashboard
  5. Navigate `/employees` → xem danh sách (chỉ read-only)
- **Expected Results**:
  - User mới đăng nhập thành công, xem được danh sách nhân viên nhưng không có nút CUD
  - DB: TB_EMPL.USER_ID = new User ID
- **Verification Method**: snapshot / network

---

## Scenario Group 2: Luồng vòng đời nhân viên

### E2E-X003: Nhân viên → Trưởng phòng → Nghỉ việc → Dọn dẹp
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN, phòng ban DEPT-HR tồn tại
- **User Journey**:
  1. Tạo nhân viên "Trần Senior", phòng ban DEPT-HR, chức vụ "Senior"
  2. Sửa DEPT-HR → gán trưởng phòng = "Trần Senior"
  3. Xác nhận DEPT-HR hiển thị trưởng phòng đúng
  4. Sửa nhân viên "Trần Senior" → trạng thái "Đã nghỉ"
  5. Kiểm tra DEPT-HR: trưởng phòng = null (tự động hủy)
  6. Kiểm tra nhân viên: resignDt = ngày hôm nay
- **Expected Results**:
  - Luồng: Gán trưởng phòng → Nghỉ việc → Tự động hủy chức trưởng phòng + điền ngày nghỉ
  - DB: TB_DEPT.DEPT_HEAD_ID = null, TB_EMPL.RESIGN_DT populated
- **Verification Method**: network / db-query

### E2E-X004: Xóa nhân viên → Hủy liên kết User + Hủy trưởng phòng
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Nhân viên là trưởng phòng + có liên kết User
- **User Journey**:
  1. Tạo User mới + nhân viên mới + liên kết
  2. Gán nhân viên làm trưởng phòng 1 PB
  3. Xóa nhân viên
  4. Kiểm tra: User vẫn tồn tại, PB không còn trưởng phòng
- **Expected Results**:
  - DB: TB_EMPL.DEL_YN = 'Y', USER_ID = null
  - DB: TB_DEPT.DEPT_HEAD_ID = null
  - DB: TB_COMM_USER vẫn ACTIVE (không bị ảnh hưởng)
- **Verification Method**: network / db-query

---

## Scenario Group 3: Dashboard tích hợp

### E2E-X005: Dashboard stats phản ánh đúng dữ liệu
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập, seed data
- **User Journey**:
  1. Navigate to `/dashboard`
  2. Kiểm tra: Tổng nhân viên, Nhân viên đang làm, Nghỉ phép hôm nay, Số phòng ban
  3. Tạo thêm 1 nhân viên mới
  4. Refresh dashboard
  5. Kiểm tra số liệu cập nhật (+1 tổng NV)
- **Expected Results**:
  - API: GET /api/dashboard/stats → số liệu chính xác
  - UI: Stats cards phản ánh đúng thay đổi
- **Verification Method**: snapshot / network

### E2E-X006: Sidebar navigation giữa các module
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập
- **User Journey**:
  1. Click "Dashboard" trong sidebar → `/dashboard`
  2. Click "Nhân viên" → `/employees` (bảng hiển thị)
  3. Click "Phòng ban" → `/departments` (bảng hiển thị)
  4. Click "Cài đặt" (ADMIN) → `/admin/users`
  5. Kiểm tra active state sidebar đúng ở mỗi trang
- **Expected Results**:
  - UI: Sidebar active state highlight đúng trang hiện tại
  - Các trang load thành công, không lỗi console
- **Verification Method**: snapshot / console

---

## Scenario Group 4: Edge cases tích hợp

### E2E-X007: Xóa phòng ban → Nhân viên mất phòng ban
- **Type**: Edge Case
- **Priority**: High
- **Preconditions**: Phòng ban test có nhân viên
- **User Journey**:
  1. Thử xóa phòng ban đang có nhân viên → expect lỗi 409
  2. Chuyển tất cả nhân viên sang phòng ban khác
  3. Xóa phòng ban trống → thành công
  4. Kiểm tra nhân viên đã chuyển hiển thị phòng ban mới
- **Expected Results**:
  - Luồng: Không cho xóa PB có NV → Chuyển NV → Xóa PB
- **Verification Method**: network

### E2E-X008: Tạo nhân viên đồng thời tạo phòng ban mới
- **Type**: Alternative Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Tạo phòng ban "DEPT-DESIGN" / "Phòng Thiết kế"
  2. Ngay sau đó tạo nhân viên và chọn phòng ban vừa tạo
  3. Kiểm tra dropdown phòng ban trong form nhân viên hiển thị PB mới
- **Expected Results**:
  - UI: Phòng ban mới xuất hiện trong dropdown khi mở form nhân viên
  - DB: Nhân viên mới có DEPT_ID = PB vừa tạo
- **Verification Method**: snapshot / network

---

## Summary
| Type | Count |
|------|-------|
| Happy Path | 6 |
| Alternative Path | 1 |
| Edge Case | 1 |
| Error Path | 0 |
| **Total** | **8** |
