# Báo cáo test tích hợp — Redesign giao diện Nghỉ phép

## Môi trường test
- **Ngày**: 2026-03-23
- **Server**: Next.js 15.5.13 (port 3002)
- **Browser**: Chrome (Playwright MCP)
- **Tài khoản**: admin@hrlite.com (ADMIN)

## Tóm tắt kết quả

| Hạng mục | Kết quả | Ghi chú |
|----------|---------|---------|
| Server startup | PASS | Ready in 1587ms |
| Console errors | 0 | Sau fix duplicate key |
| Network failures | 0 | Tất cả API 200/201 |
| Responsive Desktop (1280x720) | PASS | Layout đẹp, đầy đủ |
| Responsive Tablet (768x1024) | PASS | Sidebar thu gọn, grid 2x2 |
| Responsive Mobile (375x667) | PASS | Stack dọc, không vỡ layout |
| Tạo yêu cầu nghỉ phép | PASS | Form, submit, refresh OK |
| Tab Loại nghỉ phép | PASS | 7 loại, CRUD buttons |
| Server log errors | 0 | Không có exception |

## Kết quả chi tiết

### 1. Page Load — Tab "Yêu cầu nghỉ phép"
- **Kết quả**: PASS
- Header hiển thị: icon gradient, tiêu đề serif italic "Nghỉ phép", subtitle
- 4 stat cards với gradient border: Chờ duyệt (0), Đã duyệt tháng này (4), Nghỉ hôm nay (0), Sắp nghỉ (0)
- Filter bar: icon Filter, 3 combobox (trạng thái, loại nghỉ, năm)
- Bảng dữ liệu: avatar chữ cái, DateChip ngày/tháng, badge loại nghỉ amber, badge trạng thái
- API calls: `/api/leave`, `/api/leave/stats`, `/api/leave-types` — tất cả 200

### 2. Responsive Layout
- **Desktop (1280x720)**: 4 stat cards hàng ngang, bảng đầy đủ cột
- **Tablet (768x1024)**: Sidebar thu gọn, stat cards 2x2, bảng co lại hợp lý
- **Mobile (375x667)**: Header stack dọc, nút CTA xuống dòng, stat cards 2x2, filters stack dọc

### 3. Tạo yêu cầu nghỉ phép (ADMIN)
- **Kết quả**: PASS
- Dialog mở: icon gradient header, form fields rõ ràng
- Chọn nhân viên: dropdown 9 nhân viên, chọn "Hoàng Thị Ên (NV-0005)"
- Chọn loại nghỉ: dropdown 7 loại, chọn "Nghỉ phép năm"
- Nhập ngày: 13/04/2026 - 15/04/2026
- Tính toán tự động: hiển thị "3 ngày" (không tính cuối tuần) với gradient background
- Nhập lý do: "Test tạo yêu cầu nghỉ phép từ giao diện mới"
- Submit: POST /api/leave → 201, toast "Đã tạo yêu cầu nghỉ phép", danh sách refresh

### 4. Tab "Loại nghỉ phép"
- **Kết quả**: PASS
- 7 loại hiển thị: ANNUAL (12), BEREAVEMENT (3), MARRIAGE (3), MATERNITY (180), PATERNITY (5), SICK (30), UNPAID (không giới hạn)
- Mã hiển thị font monospace
- Badge "Đang dùng" cho tất cả
- Nút Sửa/Xóa hoạt động

### 5. Server Log Analysis
- Không có exception/error
- Tất cả API response < 1s (dev mode)
- POST /api/leave: 201 Created (344ms)
- Không phát hiện N+1 query
- Không có cảnh báo memory/resource

## Lỗi đã phát hiện và sửa

### BUG-001: Duplicate React key trong bảng loại nghỉ phép
- **Mức độ**: Medium
- **Mô tả**: Cột actions dùng `key: 'lvTypeCd'` trùng với cột đầu tiên, gây ra 15 console errors "Encountered two children with the same key"
- **Fix**: Đổi key cột actions thành `key: 'creatDt'`
- **Trạng thái**: Đã sửa, verified 0 errors sau fix

## Screenshots

- `leave-desktop-header.png` — Desktop view với header + stat cards
- `leave-desktop-full.png` — Desktop full page
- `leave-tablet.png` — Tablet responsive
- `leave-mobile.png` — Mobile responsive
- `leave-create-dialog.png` — Dialog tạo yêu cầu (trống)
- `leave-form-filled.png` — Dialog đã điền đầy đủ (tính ngày tự động)
- `leave-types-tab.png` — Tab loại nghỉ phép
