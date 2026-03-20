# Employee E2E Test Scenarios

## Overview
- **Feature**: Quản lý Nhân viên — CRUD, sinh mã tự động, liên kết User, thống kê
- **Related Modules**: Auth (User), Department (phòng ban)
- **API Endpoints**: GET/POST /api/employees, GET/PATCH/DELETE /api/employees/[id], PATCH /api/employees/[id]/link-user, GET /api/employees/stats
- **DB Tables**: TB_EMPL, TB_DEPT, TB_COMM_USER
- **Blueprint**: docs/blueprints/003-employee/blueprint.md

---

## Scenario Group 1: CRUD Nhân viên

### E2E-E001: Tạo nhân viên mới thành công
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN, phòng ban DEPT-TECH tồn tại
- **User Journey**:
  1. Navigate to `/employees`
  2. Click "Thêm nhân viên"
  3. Nhập Họ tên: "Trần Văn Test"
  4. Nhập Email: "test.tran@hrlite.com"
  5. Nhập SĐT: "0909123456"
  6. Chọn Phòng ban: "Phòng Kỹ thuật"
  7. Nhập Chức vụ: "Intern"
  8. Chọn Ngày vào làm: 2026-03-20
  9. Trạng thái: "Đang làm"
  10. Click "Tạo mới"
- **Expected Results**:
  - UI: Toast "Đã tạo nhân viên", dialog đóng, nhân viên mới hiển thị trong bảng
  - API: POST /api/employees → 201 Created, response chứa `emplNo: "NV-0011"` (tự sinh)
  - DB: TB_EMPL có bản ghi mới, EMPL_NO = 'NV-0011', EMPL_STTS_CD = 'WORKING', CREAT_BY = admin email
- **Verification Method**: snapshot / network
- **Test Data**: `{ emplNm: "Trần Văn Test", email: "test.tran@hrlite.com", joinDt: "2026-03-20" }`

### E2E-E002: Xem danh sách nhân viên với thống kê
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập, seed data 10 nhân viên
- **User Journey**:
  1. Navigate to `/employees`
  2. Kiểm tra thẻ thống kê: Tổng NV, Đang làm, Tạm nghỉ, Đã nghỉ, Mới tháng này
  3. Kiểm tra bảng: Mã NV, Họ tên, Email, Phòng ban, Chức vụ, Trạng thái
- **Expected Results**:
  - UI: 5 thẻ thống kê với số liệu chính xác (Tổng: 10, Đang làm: 9, Tạm nghỉ: 1, Đã nghỉ: 0)
  - API: GET /api/employees/stats → 200 OK; GET /api/employees → 200 OK
- **Verification Method**: snapshot / network

### E2E-E003: Xem chi tiết nhân viên
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập, nhân viên NV-0001 tồn tại
- **User Journey**:
  1. Navigate to `/employees`
  2. Click tên "Nguyễn Văn An" trong bảng
  3. Kiểm tra trang chi tiết `/employees/[id]`
  4. Kiểm tra tab "Thông tin chung": Email, SĐT, Phòng ban, Chức vụ, Ngày vào làm
  5. Click tab "Tài khoản": kiểm tra liên kết với admin@hrlite.com
- **Expected Results**:
  - UI: Trang chi tiết hiển thị avatar chữ cái, họ tên, mã NV, badge trạng thái
  - UI: Tab Thông tin chung: đầy đủ thông tin
  - UI: Tab Tài khoản: "Đã liên kết với tài khoản" admin@hrlite.com
  - API: GET /api/employees/[id] → 200 OK với include department + user
- **Verification Method**: snapshot / network

### E2E-E004: Sửa nhân viên thành công
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, nhân viên NV-0002 tồn tại
- **User Journey**:
  1. Navigate to `/employees`
  2. Click icon sửa (Pencil) ở dòng "Trần Thị Bình"
  3. Thay đổi chức vụ thành "Trưởng nhóm Tuyển dụng"
  4. Click "Cập nhật"
- **Expected Results**:
  - UI: Toast "Đã cập nhật nhân viên", chức vụ mới hiển thị
  - API: PATCH /api/employees/[id] → 200 OK
  - DB: TB_EMPL.POSI_NM cập nhật, UPDT_BY, UPDT_DT populated
- **Verification Method**: snapshot / network

### E2E-E005: Xóa nhân viên thành công
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, tạo nhân viên test mới
- **User Journey**:
  1. Tạo nhân viên test mới
  2. Click icon xóa (Trash)
  3. Xác nhận xóa
- **Expected Results**:
  - UI: Toast "Đã xóa nhân viên", nhân viên biến mất khỏi bảng, thống kê cập nhật
  - API: DELETE /api/employees/[id] → 200 OK
  - DB: TB_EMPL.DEL_YN = 'Y', USER_ID = null
- **Verification Method**: snapshot / network

---

## Scenario Group 2: Sinh mã nhân viên tự động

### E2E-E006: Mã NV tự sinh tuần tự
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Seed data có NV-0001 → NV-0010
- **User Journey**:
  1. Tạo nhân viên mới (lần 1)
  2. Kiểm tra mã NV = NV-0011
  3. Tạo nhân viên mới (lần 2)
  4. Kiểm tra mã NV = NV-0012
- **Expected Results**:
  - API: POST /api/employees → response.data.emplNo = "NV-0011", "NV-0012"
  - DB: EMPL_NO tuần tự, không trùng lặp
- **Verification Method**: network

### E2E-E007: Mã NV đầu tiên khi DB trống
- **Type**: Edge Case
- **Priority**: Medium
- **Preconditions**: Xóa hết nhân viên (hoặc test trên DB mới)
- **User Journey**:
  1. Gọi API POST /api/employees khi không có bản ghi NV nào
- **Expected Results**:
  - API: emplNo = "NV-0001"
- **Verification Method**: network

---

## Scenario Group 3: Liên kết User ↔ Employee

### E2E-E008: Liên kết tài khoản User với nhân viên
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, nhân viên chưa liên kết, User chưa liên kết NV khác
- **User Journey**:
  1. Navigate to `/employees/[id]` (nhân viên chưa liên kết)
  2. Click tab "Tài khoản"
  3. Kiểm tra hiển thị "Chưa liên kết tài khoản đăng nhập"
  4. Chọn tài khoản từ dropdown
  5. Click "Liên kết"
- **Expected Results**:
  - UI: Toast thành công, hiển thị "Đã liên kết với tài khoản [email]"
  - API: PATCH /api/employees/[id]/link-user → 200 OK
  - DB: TB_EMPL.USER_ID = selected user ID
- **Verification Method**: snapshot / network

### E2E-E009: Hủy liên kết tài khoản
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Nhân viên NV-0001 đã liên kết với admin@hrlite.com
- **User Journey**:
  1. Navigate to `/employees/[NV-0001-id]`
  2. Click tab "Tài khoản"
  3. Click "Hủy liên kết"
- **Expected Results**:
  - UI: Toast "Đã hủy liên kết tài khoản", hiển thị form chọn tài khoản mới
  - API: PATCH /api/employees/[id]/link-user → 200 OK, body: `{ userId: null }`
  - DB: TB_EMPL.USER_ID = null
- **Verification Method**: snapshot / network

### E2E-E010: Liên kết User đã được liên kết NV khác
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: User A đã liên kết với NV-0001, NV-0002 chưa liên kết
- **User Journey**:
  1. Gọi API PATCH /api/employees/[NV-0002-id]/link-user, body: `{ userId: "[User-A-id]" }`
- **Expected Results**:
  - API: 400 Bad Request, error: "Tài khoản đã được liên kết với nhân viên \"Nguyễn Văn An\"."
  - DB: Không thay đổi
- **Verification Method**: network

### E2E-E011: Liên kết User không tồn tại
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Gọi API PATCH /api/employees/[id]/link-user, body: `{ userId: "non-existent-uuid" }`
- **Expected Results**:
  - API: 400 Bad Request, error: "Tài khoản không tồn tại."
- **Verification Method**: network

---

## Scenario Group 4: Xử lý trạng thái nghỉ việc

### E2E-E012: Chuyển trạng thái sang RESIGNED — tự điền resignDt
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN, nhân viên đang WORKING
- **User Journey**:
  1. Sửa nhân viên, đổi trạng thái sang "Đã nghỉ"
  2. Không nhập ngày nghỉ việc
  3. Click "Cập nhật"
- **Expected Results**:
  - API: PATCH → 200 OK, response chứa `resignDt` = ngày hôm nay
  - DB: TB_EMPL.EMPL_STTS_CD = 'RESIGNED', RESIGN_DT = today
- **Verification Method**: network

### E2E-E013: Nghỉ việc nhân viên đang là trưởng phòng
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: NV-0003 (Lê Hoàng Cường) là trưởng phòng DEPT-TECH
- **User Journey**:
  1. Gọi API PATCH /api/employees/[NV-0003-id] body: `{ emplSttsCd: "RESIGNED" }`
- **Expected Results**:
  - API: 200 OK
  - DB: TB_EMPL.EMPL_STTS_CD = 'RESIGNED', RESIGN_DT populated
  - DB: TB_DEPT (DEPT-TECH).DEPT_HEAD_ID = null (tự động xóa trưởng phòng)
- **Verification Method**: network / db-query

---

## Scenario Group 5: Xóa nhân viên — dọn dẹp references

### E2E-E014: Xóa nhân viên đang là trưởng phòng
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: NV-0006 là trưởng phòng DEPT-SALES
- **User Journey**:
  1. Gọi API DELETE /api/employees/[NV-0006-id]
- **Expected Results**:
  - API: 200 OK
  - DB: TB_EMPL.DEL_YN = 'Y', USER_ID = null
  - DB: TB_DEPT (DEPT-SALES).DEPT_HEAD_ID = null
- **Verification Method**: network / db-query

### E2E-E015: Xóa nhân viên có liên kết User
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Nhân viên có USER_ID linked
- **User Journey**:
  1. Gọi API DELETE /api/employees/[id]
- **Expected Results**:
  - DB: TB_EMPL.DEL_YN = 'Y', USER_ID = null (hủy liên kết)
  - DB: TB_COMM_USER vẫn còn (không bị xóa)
- **Verification Method**: network / db-query

---

## Scenario Group 6: Validation dữ liệu

### E2E-E016: Tạo nhân viên với email trùng
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: an.nguyen@hrlite.com đã tồn tại
- **User Journey**:
  1. Tạo nhân viên mới với email: "an.nguyen@hrlite.com"
- **Expected Results**:
  - UI: Toast "Email đã được sử dụng bởi nhân viên khác."
  - API: POST → 409 Conflict
- **Verification Method**: network

### E2E-E017: Tạo nhân viên với email không hợp lệ
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Tạo nhân viên với email: "not-an-email"
- **Expected Results**:
  - API: POST → 400 Bad Request, error: "Email không hợp lệ"
- **Verification Method**: network

### E2E-E018: Tạo nhân viên với SĐT không hợp lệ
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Tạo nhân viên với phoneNo: "abc-def"
- **Expected Results**:
  - API: POST → 400 Bad Request, error: "Số điện thoại chỉ chứa số và dấu +"
- **Verification Method**: network

### E2E-E019: Tạo nhân viên với ngày không hợp lệ
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Tạo nhân viên với joinDt: "20-03-2026" (sai format)
- **Expected Results**:
  - API: POST → 400 Bad Request, error: "Ngày vào làm phải có format YYYY-MM-DD"
- **Verification Method**: network

### E2E-E020: Tạo nhân viên với phòng ban không tồn tại
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Tạo nhân viên với deptId: "non-existent-uuid"
- **Expected Results**:
  - API: POST → 400 Bad Request, error: "Phòng ban không tồn tại."
- **Verification Method**: network

---

## Scenario Group 7: Tìm kiếm và lọc

### E2E-E021: Tìm kiếm theo tên nhân viên
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Seed data 10 nhân viên
- **User Journey**:
  1. Navigate to `/employees`
  2. Nhập "Cường" vào ô tìm kiếm
- **Expected Results**:
  - UI: Bảng chỉ hiển thị "Lê Hoàng Cường"
  - API: GET /api/employees?search=Cường → 1 kết quả
- **Verification Method**: snapshot / network

### E2E-E022: Lọc theo phòng ban
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Seed data
- **User Journey**:
  1. Chọn filter phòng ban: "Phòng Kỹ thuật"
- **Expected Results**:
  - UI: Bảng chỉ hiển thị nhân viên thuộc Phòng Kỹ thuật (4 người)
  - API: GET /api/employees?deptId=[DEPT-TECH-id]
- **Verification Method**: network

### E2E-E023: Lọc theo trạng thái
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Seed data có 1 nhân viên ON_LEAVE (Mai Thanh Khoa)
- **User Journey**:
  1. Chọn filter trạng thái: "Tạm nghỉ"
- **Expected Results**:
  - UI: Bảng chỉ hiển thị "Mai Thanh Khoa"
  - API: GET /api/employees?status=ON_LEAVE → 1 kết quả
- **Verification Method**: network

### E2E-E024: Kết hợp nhiều bộ lọc
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Seed data
- **User Journey**:
  1. Chọn phòng ban: "Phòng Kỹ thuật" + trạng thái: "Đang làm"
- **Expected Results**:
  - UI: Chỉ hiển thị nhân viên Phòng KT đang làm việc
  - API: GET /api/employees?deptId=...&status=WORKING
- **Verification Method**: network

---

## Scenario Group 8: Phân quyền

### E2E-E025: User thường chỉ xem, không sửa/xóa
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập với tài khoản USER
- **User Journey**:
  1. Navigate to `/employees`
  2. Kiểm tra không có nút "Thêm nhân viên"
  3. Kiểm tra không có icon sửa/xóa ở mỗi dòng
  4. Click tên nhân viên → xem chi tiết (cho phép)
- **Expected Results**:
  - UI: Hiển thị bảng read-only, có thể xem chi tiết
- **Verification Method**: snapshot

### E2E-E026: User thường không tạo NV qua API
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Đăng nhập USER
- **User Journey**:
  1. Gọi API POST /api/employees
- **Expected Results**:
  - API: 403 Forbidden
- **Verification Method**: network

---

## Scenario Group 9: Thống kê

### E2E-E027: API thống kê chính xác
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Seed data: 10 NV (9 WORKING, 1 ON_LEAVE)
- **User Journey**:
  1. Gọi API GET /api/employees/stats
- **Expected Results**:
  - API: 200 OK
  - Data: total=10, working=9, onLeave=1, resigned=0
  - byDepartment: Nhân sự=3, Kỹ thuật=4, Kinh doanh=3
- **Verification Method**: network

### E2E-E028: Thống kê nhân viên mới tháng này
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Tạo nhân viên mới trong tháng hiện tại
- **User Journey**:
  1. Tạo 2 nhân viên mới
  2. Gọi API GET /api/employees/stats
- **Expected Results**:
  - Data: newThisMonth bao gồm nhân viên vừa tạo
- **Verification Method**: network

---

## Scenario Group 10: Tabs placeholder

### E2E-E029: Tab Chấm công hiển thị placeholder
- **Type**: Happy Path
- **Priority**: Low
- **Preconditions**: Đăng nhập, xem chi tiết nhân viên
- **User Journey**:
  1. Navigate to `/employees/[id]`
  2. Click tab "Chấm công"
- **Expected Results**:
  - UI: Hiển thị icon Clock + "Tính năng sẽ được triển khai ở sprint tiếp theo"
- **Verification Method**: snapshot

### E2E-E030: Tab Nghỉ phép hiển thị placeholder
- **Type**: Happy Path
- **Priority**: Low
- **Preconditions**: Đăng nhập, xem chi tiết nhân viên
- **User Journey**:
  1. Navigate to `/employees/[id]`
  2. Click tab "Nghỉ phép"
- **Expected Results**:
  - UI: Hiển thị icon CalendarDays + "Tính năng sẽ được triển khai ở sprint tiếp theo"
- **Verification Method**: snapshot

---

## Summary
| Type | Count |
|------|-------|
| Happy Path | 18 |
| Alternative Path | 0 |
| Edge Case | 1 |
| Error Path | 11 |
| **Total** | **30** |
