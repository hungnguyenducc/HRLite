# Sprint 3 Prompt Map

## Sprint Goal
Triển khai module Chấm công và Nghỉ phép — hai tính năng nghiệp vụ cốt lõi cho quy trình HR hàng ngày. Nhân viên có thể check-in/out và tạo yêu cầu nghỉ phép, ADMIN quản lý và phê duyệt. Thay thế placeholder tabs trong trang chi tiết nhân viên bằng giao diện hoạt động thực tế.

---

## Feature 1: Chấm công (Attendance)

### 1.1 Design Prompt
/feature-dev "Viết tài liệu thiết kế cho module Chấm công
tại docs/blueprints/004-attendance/blueprint.md.
- Check-in/check-out cho nhân viên (tự chấm hoặc ADMIN chấm hộ)
- Tự tính giờ làm, xác định trạng thái (PRESENT/LATE/HALF_DAY/ABSENT/HOLIDAY)
- Báo cáo tổng hợp chấm công theo tháng
- Widget check-in/out trên dashboard
- Tab Chấm công trong chi tiết NV thay thế placeholder hiện tại
- Trang quản lý chấm công cho ADMIN
Tham chiếu docs/database/database-design.md cho DB schema (TH_ATND đã có).
Không chỉnh sửa code."

> **Trạng thái**: ✅ Đã hoàn thành (blueprint đã viết)

### 1.2 DB Design Reflection Prompt
/feature-dev "Cập nhật bảng TH_ATND trong docs/database/database-design.md:
- Thêm unique constraint @@unique([emplId, atndDt])
- Xác nhận ERD và FK relationship summary đã đầy đủ
- Kiểm tra Prisma schema (model Attendance) đã khớp với database-design.md
Không chỉnh sửa code."

### 1.3 Test Case Prompt
/feature-dev "Dựa trên docs/blueprints/004-attendance/blueprint.md,
viết test cases tại docs/tests/test-cases/sprint-3/attendance-test-cases.md.
Bao gồm:
- Check-in: thành công, check-in trùng, NV chưa liên kết, NV đã nghỉ việc
- Check-out: thành công, chưa check-in, check-out trùng, tính giờ làm
- CRUD (Admin): tạo thủ công, sửa, xóa, trùng ngày
- Danh sách: phân trang, lọc theo tháng/phòng ban/trạng thái
- Báo cáo tháng: tổng hợp ngày công, giờ làm
- Thống kê dashboard: có mặt/chưa check-in/đi trễ
- Phân quyền: USER chỉ xem của mình, ADMIN xem tất cả
Sử dụng format Given-When-Then.
Không chỉnh sửa code."

### 1.4 Implementation Prompt
/feature-dev "Tuân thủ nghiêm ngặt nội dung docs/blueprints/004-attendance/blueprint.md
và docs/database/database-design.md để triển khai module Chấm công.

Thứ tự triển khai:
1. Tạo Zod validation schema (src/lib/validations/attendance.schema.ts)
2. Thêm unique constraint Prisma: @@unique([emplId, atndDt]) vào model Attendance + chạy migration
3. API check-in/check-out (POST /api/attendance/check-in, check-out)
4. API today (GET /api/attendance/today)
5. API CRUD: GET/POST /api/attendance, PATCH/DELETE /api/attendance/[id]
6. API summary + stats (GET /api/attendance/summary, stats)
7. Widget Check-in/out trên dashboard header
8. Trang /attendance (ADMIN): bảng, lọc, thống kê, dialog tạo/sửa
9. Tab Chấm công trong /employees/[id] thay thế placeholder
10. Seed dữ liệu chấm công mẫu (2-3 tuần gần đây cho 10 NV)
11. Cập nhật dashboard stats

Viết tests tham chiếu docs/tests/test-cases/sprint-3/attendance-test-cases.md,
sau khi triển khai xong chạy tất cả tests và
báo cáo kết quả tại docs/tests/test-reports/."

---

## Feature 2: Nghỉ phép (Leave)

### 2.1 Design Prompt
/feature-dev "Viết tài liệu thiết kế cho module Nghỉ phép
tại docs/blueprints/005-leave/blueprint.md.
- CRUD loại nghỉ phép (7 loại mặc định: phép năm, ốm, cưới, thai sản...)
- Tạo/hủy yêu cầu nghỉ phép (nhân viên), phê duyệt/từ chối (ADMIN)
- Tính ngày tự động (trừ T7/CN), kiểm tra phép còn lại, kiểm tra trùng ngày
- Tab Nghỉ phép trong chi tiết NV thay thế placeholder
- Trang quản lý nghỉ phép tổng hợp cho ADMIN
Tham chiếu docs/database/database-design.md cho DB schema (TB_LV_REQ, TC_LV_TYPE đã có).
Không chỉnh sửa code."

> **Trạng thái**: ✅ Đã hoàn thành (blueprint đã viết)

### 2.2 DB Design Reflection Prompt
/feature-dev "Cập nhật bảng TB_LV_REQ và TC_LV_TYPE trong docs/database/database-design.md:
- Xác nhận đầy đủ cột, FK relationships
- Kiểm tra Prisma schema (model LeaveRequest, LeaveType) đã khớp
- Cập nhật ERD nếu cần
Không chỉnh sửa code."

### 2.3 Test Case Prompt
/feature-dev "Dựa trên docs/blueprints/005-leave/blueprint.md,
viết test cases tại docs/tests/test-cases/sprint-3/leave-test-cases.md.
Bao gồm:
- Loại nghỉ phép: CRUD, xóa loại đang sử dụng, mã trùng
- Tạo yêu cầu: thành công, trùng ngày, vượt phép, ngày quá khứ, loại không tồn tại
- Phê duyệt/Từ chối: thành công, yêu cầu không ở PENDING
- Hủy yêu cầu: chỉ chủ nhân, chỉ khi PENDING
- Số phép còn lại: tính đúng (APPROVED + PENDING), theo năm
- Danh sách: phân trang, lọc trạng thái/loại/phòng ban/năm
- Thống kê: nghỉ hôm nay, chờ duyệt, sắp nghỉ
- Phân quyền: USER xem/tạo/hủy của mình, ADMIN quản lý tất cả
Sử dụng format Given-When-Then.
Không chỉnh sửa code."

### 2.4 Implementation Prompt
/feature-dev "Tuân thủ nghiêm ngặt nội dung docs/blueprints/005-leave/blueprint.md
và docs/database/database-design.md để triển khai module Nghỉ phép.

Thứ tự triển khai:
1. Tạo Zod validation schema (src/lib/validations/leave.schema.ts)
2. Seed dữ liệu loại nghỉ phép mặc định (7 loại) trong prisma/seed.ts
3. API loại nghỉ: GET/POST /api/leave-types, PATCH/DELETE /api/leave-types/[cd]
4. API tạo yêu cầu: POST /api/leave (tính ngày + kiểm tra phép + kiểm tra trùng)
5. API danh sách: GET /api/leave (phân trang, lọc đa tiêu chí)
6. API phê duyệt: PATCH /api/leave/[id]/approve, reject, cancel
7. API số phép: GET /api/leave/balance
8. API thống kê: GET /api/leave/stats
9. Trang /leave: Tab yêu cầu + Tab loại nghỉ (ADMIN)
10. Dialog tạo yêu cầu (tính ngày tự động, hiển thị phép còn lại)
11. Tab Nghỉ phép trong /employees/[id] thay thế placeholder
12. Seed yêu cầu nghỉ phép mẫu (5-10 yêu cầu đa trạng thái)
13. Cập nhật dashboard stats (nghỉ hôm nay, chờ duyệt)

Viết tests tham chiếu docs/tests/test-cases/sprint-3/leave-test-cases.md,
sau khi triển khai xong chạy tất cả tests và
báo cáo kết quả tại docs/tests/test-reports/."

---

## Phụ thuộc giữa các Feature

```
Feature 1 (Chấm công)  ──→  Không phụ thuộc Feature 2
Feature 2 (Nghỉ phép)  ──→  Không phụ thuộc Feature 1
                             → Có thể triển khai song song
```

## Lưu ý Sprint 3

- Cả 2 module đều có **Prisma model sẵn** trong `prisma/schema.prisma` (Attendance, LeaveRequest, LeaveType)
- Cần chạy `prisma migrate dev` để tạo bảng thực tế trong DB
- Tab placeholder ở `/employees/[id]` cần được **thay thế**, không tạo thêm
- Sidebar đã có menu "Chấm công" và "Nghỉ phép" nhưng chưa có trang — cần tạo `/attendance` và `/leave`
- Dashboard hiện đã query `leaveRequest` cho "Nghỉ phép hôm nay" nhưng chưa có data
