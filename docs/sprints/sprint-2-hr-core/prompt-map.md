# Sprint 2 Prompt Map

## Sprint Goal
Xây dựng nền tảng quản lý cơ cấu tổ chức: Module Quản lý Phòng ban (cây tổ chức) và Module Quản lý Nhân viên (hồ sơ, phân bổ phòng ban, liên kết tài khoản). Đây là 2 module nghiệp vụ cốt lõi làm nền tảng cho Chấm công, Nghỉ phép và Báo cáo ở các sprint tiếp theo.

---

## Feature 1: Quản lý Phòng ban (Department)

### 1.1 Design Prompt
/feature-dev "Viết tài liệu thiết kế cho module Quản lý Phòng ban
vào docs/blueprints/002-department/blueprint.md.
- CRUD phòng ban (tạo, xem, sửa, xóa mềm)
- Cây tổ chức phân cấp (self-relation UPPER_DEPT_ID)
- Gán trưởng phòng (DEPT_HEAD_ID → TB_EMPL)
- Sắp xếp thứ tự (SORT_ORD)
- Kiểm tra vòng lặp khi cập nhật phòng ban cha
- Kiểm tra ràng buộc khi xóa (còn nhân viên/phòng ban con)
Tham chiếu docs/database/database-design.md cho DB schema.
Không sửa code."

### 1.2 DB Design Reflection Prompt
/feature-dev "Xác nhận và cập nhật bảng TB_DEPT trong
docs/database/database-design.md:
- TB_DEPT: phòng ban với self-relation (UPPER_DEPT_ID)
- Cập nhật ERD và bảng tóm tắt FK.
- Tuân thủ từ điển thuật ngữ chuẩn.
Không sửa code."

### 1.3 Test Case Prompt
/feature-dev "Dựa trên yêu cầu tính năng trong docs/blueprints/002-department/blueprint.md,
viết test case vào docs/tests/test-cases/sprint-2/department-test-cases.md.
Sử dụng format Given-When-Then, bao gồm unit/integration/edge cases:
- CRUD operations
- Cây tổ chức: build tree, validate hierarchy
- Kiểm tra vòng lặp khi update upperDeptId
- Kiểm tra ràng buộc khi xóa phòng ban có nhân viên/phòng ban con
- Validation schema (deptCd format, required fields)
- Phân quyền (ADMIN only cho CUD)
Không sửa code."

### 1.4 Implementation Prompt
/feature-dev "Tuân thủ nghiêm ngặt nội dung docs/blueprints/002-department/blueprint.md và
docs/database/database-design.md để tiến hành phát triển module Quản lý Phòng ban:

**Backend (ưu tiên trước):**
- Zod validation schema (department.schema.ts)
- API GET /api/departments (danh sách phân trang, tìm kiếm, lọc)
- API GET /api/departments/tree (cây tổ chức nested)
- API GET /api/departments/[id] (chi tiết)
- API POST /api/departments (tạo mới, kiểm tra unique deptCd)
- API PATCH /api/departments/[id] (cập nhật, kiểm tra vòng lặp cây)
- API DELETE /api/departments/[id] (xóa mềm, kiểm tra ràng buộc)
- API PATCH /api/departments/sort (sắp xếp hàng loạt)

**Frontend:**
- Trang /admin/departments (danh sách bảng + cây tổ chức)
- Dialog tạo/sửa phòng ban
- Dialog xác nhận xóa
- Thêm menu sidebar

Viết test tham chiếu docs/tests/test-cases/sprint-2/department-test-cases.md,
sau khi triển khai xong chạy toàn bộ test và
báo cáo kết quả vào docs/tests/test-reports/."

---

## Feature 2: Quản lý Nhân viên (Employee)

### 2.1 Design Prompt
/feature-dev "Viết tài liệu thiết kế cho module Quản lý Nhân viên
vào docs/blueprints/003-employee/blueprint.md.
- CRUD nhân viên (tạo, xem danh sách, chi tiết, sửa, xóa mềm)
- Sinh mã nhân viên tự động (NV-0001)
- Liên kết User ↔ Employee (TB_COMM_USER ↔ TB_EMPL)
- Phân bổ phòng ban (DEPT_ID)
- Quản lý trạng thái (WORKING, ON_LEAVE, RESIGNED)
- Tìm kiếm và lọc nâng cao (tên, mã, PB, trạng thái, chức vụ)
- Thống kê nhân viên cho dashboard
Tham chiếu docs/database/database-design.md cho DB schema.
Không sửa code."

### 2.2 DB Design Reflection Prompt
/feature-dev "Xác nhận và cập nhật bảng TB_EMPL trong
docs/database/database-design.md:
- TB_EMPL: nhân viên với USER_ID FK → TB_COMM_USER
- Xác nhận quan hệ với TB_DEPT, TH_ATND, TB_LV_REQ
- Cập nhật ERD và bảng tóm tắt FK.
- Tuân thủ từ điển thuật ngữ chuẩn.
Không sửa code."

### 2.3 Test Case Prompt
/feature-dev "Dựa trên yêu cầu tính năng trong docs/blueprints/003-employee/blueprint.md,
viết test case vào docs/tests/test-cases/sprint-2/employee-test-cases.md.
Sử dụng format Given-When-Then, bao gồm unit/integration/edge cases:
- CRUD operations (tạo, đọc, sửa, xóa mềm)
- Sinh mã NV tự động (NV-0001 → NV-0002)
- Liên kết/hủy liên kết User ↔ Employee
- Lọc đa tiêu chí (phòng ban, trạng thái, chức vụ)
- Xử lý nghỉ việc (tự điền resignDt, hủy trưởng PB)
- Validation schema (email unique, joinDt format, emplSttsCd enum)
- Phân quyền (ADMIN only cho CUD)
- API thống kê
Không sửa code."

### 2.4 Implementation Prompt
/feature-dev "Tuân thủ nghiêm ngặt nội dung docs/blueprints/003-employee/blueprint.md và
docs/database/database-design.md để tiến hành phát triển module Quản lý Nhân viên:

**Backend (ưu tiên trước):**
- Zod validation schema (employee.schema.ts)
- Logic sinh mã nhân viên tự động (NV-NNNN)
- API GET /api/employees (danh sách, tìm kiếm, lọc đa tiêu chí, phân trang)
- API GET /api/employees/[id] (chi tiết + include department, user)
- API POST /api/employees (tạo mới + sinh mã tự động)
- API PATCH /api/employees/[id] (cập nhật + xử lý nghỉ việc)
- API DELETE /api/employees/[id] (xóa mềm + dọn dẹp trưởng PB, hủy liên kết User)
- API PATCH /api/employees/[id]/link-user (liên kết/hủy User)
- API GET /api/employees/stats (thống kê cho dashboard)

**Frontend:**
- Trang /admin/employees (danh sách + thẻ thống kê + lọc)
- Trang /admin/employees/[id] (chi tiết 4 tabs)
- Dialog tạo/sửa nhân viên
- Dialog xác nhận xóa
- Component liên kết User
- Thêm menu sidebar

Viết test tham chiếu docs/tests/test-cases/sprint-2/employee-test-cases.md,
sau khi triển khai xong chạy toàn bộ test và
báo cáo kết quả vào docs/tests/test-reports/."

---

## Feature 3: Tích hợp & Seed Data

### 3.1 Implementation Prompt
/feature-dev "Tích hợp module Phòng ban và Nhân viên vào hệ thống:

1. **Seed data**: Cập nhật prisma/seed.ts thêm:
   - 5 phòng ban mẫu với cấu trúc cây (Công ty → 3 PB → 2 tổ)
   - 10-15 nhân viên mẫu phân bổ trong các phòng ban
   - Liên kết admin User với Employee record

2. **Dashboard**: Cập nhật /api/dashboard/stats thêm:
   - Tổng số phòng ban đang hoạt động
   - Tổng số nhân viên theo trạng thái
   - Nhân viên mới trong tháng

3. **Sidebar navigation**: Cập nhật layout thêm menu:
   - Quản lý phòng ban (/admin/departments)
   - Quản lý nhân viên (/admin/employees)

4. Chạy toàn bộ test (unit + integration) và báo cáo kết quả."
