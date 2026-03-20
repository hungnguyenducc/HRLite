# Sprint 2 E2E Browser Test Report

## Test Environment
- **Date**: 2026-03-20
- **Server**: Next.js 15.5.13 (dev mode, port 3002)
- **Database**: PostgreSQL 16 (Docker, hrlite:hrlite@localhost:5432/hrlite)
- **Browser**: Chromium (Playwright MCP)
- **Tester**: AI (Claude)

## Test Result Summary

| Item | Result | Notes |
|------|--------|-------|
| Server Startup | PASS | Ready in 1465ms |
| Console Errors | 0 | Không có lỗi console |
| Network Failures | 0 | Tất cả API 200/201/400/409 đúng mong đợi |
| Server Log Errors | 0 | Không có exception/stack trace |
| Responsive Layout | PASS | Desktop + Mobile hiển thị đúng |
| Scenario Tests | **10/10 PASS** | Chi tiết bên dưới |

## Detailed Results

### Test 1: Đăng nhập ADMIN
- **Scenario**: Login với admin@hrlite.com
- **Result**: **PASS**
- **Details**: Chuyển hướng đến /dashboard, hiển thị "Chào buổi chiều, Quản trị viên"

### Test 2: Danh sách Phòng ban (E2E-D002)
- **Scenario**: Xem bảng phòng ban
- **Result**: **PASS**
- **Details**: Bảng hiển thị 6 phòng ban từ seed data, đầy đủ cột (Mã, Tên, PB cha, Trưởng phòng, Số NV, Trạng thái), nút Sửa/Xóa cho ADMIN

### Test 3: Cây tổ chức (E2E-D008)
- **Scenario**: Chuyển sang tree view
- **Result**: **PASS**
- **Details**: Cây 3 cấp hiển thị đúng: Công ty → 3 PB → 2 Tổ. Tên trưởng phòng + số NV đúng.

### Test 4: Danh sách Nhân viên + Thống kê (E2E-E002)
- **Scenario**: Xem bảng nhân viên + stat cards
- **Result**: **PASS**
- **Details**: Stats đúng (Tổng=10/11, Đang làm=9, Tạm nghỉ=1). Bảng 10 dòng, badge trạng thái hoạt động.

### Test 5: Chi tiết Nhân viên + Tab Tài khoản (E2E-E003)
- **Scenario**: Click NV-0001, kiểm tra tabs
- **Result**: **PASS**
- **Details**: Tab Thông tin: Email, PB, Chức vụ, Ngày vào. Tab Tài khoản: "Đã liên kết với admin@hrlite.com — ADMIN"

### Test 6: Xóa PB có nhân viên (E2E-D014)
- **Scenario**: DELETE DEPT-HR (có 3 NV)
- **Result**: **PASS**
- **Details**: API trả 409 "Phòng ban đang có 3 nhân viên. Vui lòng chuyển nhân viên trước khi xóa."

### Test 7: Vòng lặp cây tổ chức (E2E-D012)
- **Scenario**: Set COMPANY.parent = TEAM-BE (circular)
- **Result**: **PASS**
- **Details**: API trả 400 "Không thể đặt phòng ban con làm phòng ban cấp trên (vòng lặp)."

### Test 8: Sinh mã NV tự động (E2E-E006)
- **Scenario**: POST employee mới
- **Result**: **PASS**
- **Details**: Mã NV tự sinh = NV-0011 (sau NV-0010)

### Test 9: Nghỉ việc tự điền resignDt (E2E-E012)
- **Scenario**: PATCH emplSttsCd = RESIGNED
- **Result**: **PASS**
- **Details**: resignDt tự điền = 2026-03-20 (hôm nay)

### Test 10: Responsive Layout
- **Scenario**: Desktop 1280x720 + Mobile 375x667
- **Result**: **PASS**
- **Details**: Desktop: sidebar + bảng full. Mobile: sidebar ẩn, stats 2 cột, layout gọn.

## Issues Found

### Issue 1: [Low] Bug /api/users/me trả raw Prisma fields
- **Location**: `src/app/api/users/me/route.ts`
- **Mô tả**: API trả `roleCd`, `sttsCd` thay vì `role`, `status` → AuthContext không nhận ra ADMIN role → nút CUD không hiển thị cho ADMIN
- **Trạng thái**: **ĐÃ SỬA** trong quá trình test — thêm mapping `role: user.roleCd, status: user.sttsCd`
- **Impact**: Tất cả trang phụ thuộc quyền ADMIN

### Issue 2: [Low] "Cập nhật lần cuối" hiển thị "null"
- **Location**: `src/app/(dashboard)/employees/[id]/page.tsx`
- **Mô tả**: Khi `updtBy = null`, hiển thị "null — 20/3/2026" thay vì ẩn dòng hoặc hiển thị "—"
- **Trạng thái**: Chưa sửa (cosmetic, low priority)

## Performance Notes
- Trang đầu tiên compile: ~1-2s (dev mode cold start)
- API response time: 10-30ms (sau compile)
- Không phát hiện N+1 query

## Conclusion
Sprint 2 hoạt động ổn định. 10/10 test PASS. 1 bug phát hiện và đã sửa (field mapping /api/users/me). 1 issue cosmetic nhỏ chưa sửa.
