# Department E2E Test Scenarios

## Overview
- **Feature**: Quản lý Phòng ban — CRUD, cây tổ chức, sắp xếp
- **Related Modules**: Auth (xác thực), Employee (trưởng phòng)
- **API Endpoints**: GET/POST /api/departments, GET /api/departments/tree, GET/PATCH/DELETE /api/departments/[id], PATCH /api/departments/sort
- **DB Tables**: TB_DEPT
- **Blueprint**: docs/blueprints/002-department/blueprint.md

---

## Scenario Group 1: CRUD Phòng ban

### E2E-D001: Tạo phòng ban mới thành công
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập với tài khoản ADMIN
- **User Journey**:
  1. Navigate to `/departments`
  2. Click nút "Thêm phòng ban"
  3. Nhập mã phòng ban: `DEPT-TEST`
  4. Nhập tên phòng ban: `Phòng Kiểm thử`
  5. Chọn phòng ban cấp trên: `Công ty HRLite`
  6. Để trạng thái mặc định: `Đang dùng`
  7. Click "Tạo mới"
- **Expected Results**:
  - UI: Toast thành công "Đã tạo phòng ban", dialog đóng, phòng ban mới xuất hiện trong bảng
  - API: POST /api/departments → 201 Created, response chứa `deptCd: "DEPT-TEST"`
  - DB: TB_DEPT có bản ghi mới với `DEPT_CD = 'DEPT-TEST'`, `DEL_YN = 'N'`, `CREAT_BY = admin email`
- **Verification Method**: snapshot / network
- **Test Data**: `{ deptCd: "DEPT-TEST", deptNm: "Phòng Kiểm thử" }`

### E2E-D002: Xem danh sách phòng ban
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập, có ít nhất 6 phòng ban từ seed data
- **User Journey**:
  1. Navigate to `/departments`
  2. Kiểm tra bảng hiển thị danh sách phòng ban
  3. Xác nhận các cột: Mã PB, Tên phòng ban, Phòng ban cha, Trưởng phòng, Số NV, Trạng thái
- **Expected Results**:
  - UI: Bảng hiển thị phòng ban với đầy đủ thông tin, seed data (COMPANY, DEPT-HR, DEPT-TECH, DEPT-SALES, TEAM-BE, TEAM-FE)
  - API: GET /api/departments → 200 OK với `data` array và `meta` pagination
- **Verification Method**: snapshot / network
- **Test Data**: Seed data (6 phòng ban)

### E2E-D003: Sửa phòng ban thành công
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, phòng ban `DEPT-HR` tồn tại
- **User Journey**:
  1. Navigate to `/departments`
  2. Click icon sửa (Pencil) ở dòng "Phòng Nhân sự"
  3. Thay đổi tên thành "Phòng Nhân sự & Hành chính"
  4. Click "Cập nhật"
- **Expected Results**:
  - UI: Toast "Đã cập nhật phòng ban", tên mới hiển thị trong bảng
  - API: PATCH /api/departments/[id] → 200 OK
  - DB: TB_DEPT.DEPT_NM cập nhật, UPDT_BY = admin email, UPDT_DT populated
- **Verification Method**: snapshot / network
- **Test Data**: `{ deptNm: "Phòng Nhân sự & Hành chính" }`

### E2E-D004: Xóa phòng ban không có nhân viên
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, tạo phòng ban trống mới
- **User Journey**:
  1. Tạo phòng ban mới `DEPT-EMPTY` (không có nhân viên, không có phòng ban con)
  2. Click icon xóa (Trash) ở dòng phòng ban vừa tạo
  3. Xác nhận xóa trong dialog
- **Expected Results**:
  - UI: Toast "Đã xóa phòng ban", phòng ban biến mất khỏi bảng
  - API: DELETE /api/departments/[id] → 200 OK
  - DB: TB_DEPT.DEL_YN = 'Y'
- **Verification Method**: snapshot / network

### E2E-D005: Tạo phòng ban với mã trùng lặp
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Đăng nhập ADMIN, phòng ban `DEPT-HR` đã tồn tại
- **User Journey**:
  1. Click "Thêm phòng ban"
  2. Nhập mã: `DEPT-HR` (đã tồn tại)
  3. Nhập tên: `Phòng HR mới`
  4. Click "Tạo mới"
- **Expected Results**:
  - UI: Toast lỗi "Mã phòng ban đã tồn tại."
  - API: POST /api/departments → 409 Conflict
- **Verification Method**: network
- **Test Data**: `{ deptCd: "DEPT-HR", deptNm: "Phòng HR mới" }`

### E2E-D006: Tạo phòng ban với mã không hợp lệ
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Click "Thêm phòng ban"
  2. Nhập mã: `dept hr` (chữ thường, có khoảng trắng)
  3. Nhập tên: `Test`
  4. Click "Tạo mới"
- **Expected Results**:
  - UI: Toast lỗi "Mã phòng ban chỉ chứa chữ hoa, số và dấu gạch ngang"
  - API: POST /api/departments → 400 Bad Request
- **Verification Method**: network

### E2E-D007: Tạo phòng ban với tên trống
- **Type**: Error Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN
- **User Journey**:
  1. Click "Thêm phòng ban"
  2. Nhập mã: `DEPT-NEW`
  3. Để tên trống
  4. Click "Tạo mới"
- **Expected Results**:
  - UI: Toast lỗi "Tên phòng ban không được trống"
  - API: POST /api/departments → 400 Bad Request
- **Verification Method**: network

---

## Scenario Group 2: Cây tổ chức

### E2E-D008: Xem cây tổ chức
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập, seed data gồm 6 phòng ban 3 cấp
- **User Journey**:
  1. Navigate to `/departments`
  2. Click icon toggle chế độ cây (Network icon)
  3. Kiểm tra cấu trúc cây hiển thị
- **Expected Results**:
  - UI: Cây hiển thị 3 cấp:
    - Công ty HRLite
      - Phòng Nhân sự (Trưởng: Nguyễn Văn An, 3 NV)
      - Phòng Kỹ thuật (Trưởng: Lê Hoàng Cường, 4 NV)
        - Tổ Backend
        - Tổ Frontend
      - Phòng Kinh doanh (Trưởng: Võ Đức Phú, 3 NV)
  - API: GET /api/departments/tree → 200 OK với nested structure
- **Verification Method**: snapshot / network

### E2E-D009: Expand/Collapse node trong cây
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Đang ở chế độ xem cây
- **User Journey**:
  1. Click vào node "Phòng Kỹ thuật" (có icon mũi tên)
  2. Kiểm tra Tổ Backend, Tổ Frontend ẩn/hiện
  3. Click lại để toggle
- **Expected Results**:
  - UI: Node con ẩn khi collapse, hiện khi expand. Icon chuyển đổi ChevronRight ↔ ChevronDown
- **Verification Method**: snapshot

### E2E-D010: Chuyển đổi giữa bảng và cây
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập
- **User Journey**:
  1. Navigate to `/departments` (mặc định bảng)
  2. Click icon cây → chuyển sang tree view
  3. Click icon bảng → chuyển lại table view
- **Expected Results**:
  - UI: View toggle hoạt động mượt, dữ liệu hiển thị đúng cả 2 chế độ
- **Verification Method**: snapshot

---

## Scenario Group 3: Kiểm tra vòng lặp cây tổ chức

### E2E-D011: Đặt phòng ban cha là chính mình
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Đăng nhập ADMIN, phòng ban `DEPT-TECH` tồn tại
- **User Journey**:
  1. Gọi API PATCH /api/departments/[DEPT-TECH-id] với body `{ upperDeptId: "[DEPT-TECH-id]" }`
- **Expected Results**:
  - API: 400 Bad Request, error: "Phòng ban không thể là cấp trên của chính mình."
  - DB: Không thay đổi
- **Verification Method**: network
- **Test Data**: `{ upperDeptId: "<same-id>" }`

### E2E-D012: Đặt phòng ban cha là phòng ban con (vòng lặp)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Cây: COMPANY → DEPT-TECH → TEAM-BE
- **User Journey**:
  1. Gọi API PATCH /api/departments/[COMPANY-id] với body `{ upperDeptId: "[TEAM-BE-id]" }`
- **Expected Results**:
  - API: 400 Bad Request, error: "Không thể đặt phòng ban con làm phòng ban cấp trên (vòng lặp)."
  - DB: Không thay đổi
- **Verification Method**: network
- **Test Data**: COMPANY.upperDeptId = TEAM-BE.id

### E2E-D013: Di chuyển phòng ban sang nhánh khác (hợp lệ)
- **Type**: Alternative Path
- **Priority**: High
- **Preconditions**: Cây có DEPT-TECH → TEAM-BE và DEPT-SALES
- **User Journey**:
  1. Sửa TEAM-BE, đổi phòng ban cha từ DEPT-TECH sang DEPT-SALES
  2. Click "Cập nhật"
- **Expected Results**:
  - UI: Toast thành công
  - API: PATCH → 200 OK
  - DB: TEAM-BE.UPPER_DEPT_ID = DEPT-SALES.ID
  - Cây: TEAM-BE hiển thị dưới DEPT-SALES thay vì DEPT-TECH
- **Verification Method**: network / snapshot

---

## Scenario Group 4: Ràng buộc xóa phòng ban

### E2E-D014: Xóa phòng ban đang có nhân viên
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: DEPT-HR có 3 nhân viên
- **User Journey**:
  1. Click icon xóa ở dòng "Phòng Nhân sự"
  2. Xác nhận xóa
- **Expected Results**:
  - UI: Toast lỗi "Phòng ban đang có 3 nhân viên. Vui lòng chuyển nhân viên trước khi xóa."
  - API: DELETE → 409 Conflict
  - DB: Không thay đổi
- **Verification Method**: network

### E2E-D015: Xóa phòng ban đang có phòng ban con
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: DEPT-TECH có 2 phòng ban con (TEAM-BE, TEAM-FE)
- **User Journey**:
  1. Click icon xóa ở dòng "Phòng Kỹ thuật"
  2. Xác nhận xóa
- **Expected Results**:
  - UI: Toast lỗi "Phòng ban đang có 2 phòng ban con. Vui lòng xóa/chuyển phòng ban con trước."
  - API: DELETE → 409 Conflict
- **Verification Method**: network

---

## Scenario Group 5: Tìm kiếm và lọc

### E2E-D016: Tìm kiếm phòng ban theo tên
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập, seed data
- **User Journey**:
  1. Navigate to `/departments`
  2. Nhập "Kỹ thuật" vào ô tìm kiếm
  3. Kiểm tra kết quả
- **Expected Results**:
  - UI: Bảng chỉ hiển thị "Phòng Kỹ thuật"
  - API: GET /api/departments?search=Kỹ thuật → data chứa "Phòng Kỹ thuật"
- **Verification Method**: snapshot / network

### E2E-D017: Lọc phòng ban theo trạng thái
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập, có phòng ban đang dùng và ngừng dùng
- **User Journey**:
  1. Chọn filter "Ngừng dùng" từ dropdown trạng thái
  2. Kiểm tra kết quả
- **Expected Results**:
  - UI: Chỉ hiển thị phòng ban có useYn = 'N'
  - API: GET /api/departments?useYn=N
- **Verification Method**: network

---

## Scenario Group 6: Phân quyền

### E2E-D018: User thường không thấy nút tạo/sửa/xóa
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Đăng nhập với tài khoản USER (không phải ADMIN)
- **User Journey**:
  1. Navigate to `/departments`
  2. Kiểm tra không có nút "Thêm phòng ban"
  3. Kiểm tra không có icon sửa/xóa ở mỗi dòng
- **Expected Results**:
  - UI: Chỉ hiển thị danh sách, không có hành động CUD
- **Verification Method**: snapshot

### E2E-D019: User thường không tạo được phòng ban qua API
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Đăng nhập với tài khoản USER
- **User Journey**:
  1. Gọi API POST /api/departments với Bearer token USER
- **Expected Results**:
  - API: 403 Forbidden, error: "Bạn không có quyền truy cập tài nguyên này."
- **Verification Method**: network

### E2E-D020: Truy cập API không có token
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Không đăng nhập
- **User Journey**:
  1. Gọi API GET /api/departments không có Bearer token
- **Expected Results**:
  - API: 401 Unauthorized, error: "Chưa xác thực. Vui lòng đăng nhập."
- **Verification Method**: network

---

## Scenario Group 7: Sắp xếp hàng loạt

### E2E-D021: Cập nhật thứ tự sắp xếp
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Đăng nhập ADMIN, có 3+ phòng ban
- **User Journey**:
  1. Gọi API PATCH /api/departments/sort với body items
- **Expected Results**:
  - API: 200 OK, "Đã cập nhật thứ tự sắp xếp."
  - DB: Tất cả SORT_ORD cập nhật, UPDT_BY = admin email
- **Verification Method**: network
- **Test Data**: `{ items: [{ id: "uuid-1", sortOrd: 3 }, { id: "uuid-2", sortOrd: 1 }] }`

---

## Summary
| Type | Count |
|------|-------|
| Happy Path | 10 |
| Alternative Path | 1 |
| Edge Case | 0 |
| Error Path | 10 |
| **Total** | **21** |
