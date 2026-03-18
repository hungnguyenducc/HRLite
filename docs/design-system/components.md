# Hướng dẫn Component Design System — HRLite

> Tài liệu này định nghĩa các component UI cốt lõi và hướng dẫn sử dụng.

## Design System: shadcn/ui (Radix UI + Tailwind CSS)

## 1. Button

### Biến thể
| Biến thể | Mô tả | Trường hợp sử dụng |
|----------|--------|---------------------|
| Primary | Nền brand, text trắng | Hành động chính (Lưu, Xác nhận) |
| Secondary | Nền secondary, text tối | Hành động phụ (Hủy, Quay lại) |
| Danger | Nền đỏ, text trắng | Hành động nguy hiểm (Xóa) |
| Ghost | Không nền, text brand | Hành động ít quan trọng |
| Outline | Viền, không nền | Hành động trung tính |

### Kích thước
- `sm`: height 32px, padding 12px, font-size 14px
- `md`: height 40px, padding 16px, font-size 14px (mặc định)
- `lg`: height 48px, padding 24px, font-size 16px

### Trạng thái
- Default, Hover, Active, Focus, Disabled, Loading

## 2. Input

### Biến thể
- Text Input (mặc định)
- Password Input (có toggle hiển thị)
- Search Input (có icon tìm kiếm)
- Textarea

### Thành phần
- Label (bắt buộc)
- Input field
- Helper text (tùy chọn)
- Error message (khi có lỗi)

### Trạng thái
- Default, Focus, Error, Disabled, Read-only

## 3. Card

### Biến thể
| Biến thể | Mô tả |
|----------|--------|
| Default | Border mỏng, nền trắng |
| Elevated | Shadow, không border |
| Outlined | Border đậm hơn |
| Interactive | Hover effect, cursor pointer |

## 4. Modal (Dialog)

### Cấu trúc
- Header: Tiêu đề + Nút đóng (X)
- Body: Nội dung
- Footer: Nút hành động (Cancel / Confirm)

### Kích thước
- `sm`: max-width 400px
- `md`: max-width 560px (mặc định)
- `lg`: max-width 720px

### Hành vi
- Backdrop mờ khi mở
- Đóng khi click backdrop hoặc nhấn ESC
- Focus trap bên trong modal

## 5. Toast / Alert

### Biến thể
| Biến thể | Icon | Màu |
|----------|------|-----|
| Success | ✓ | --color-success-500 |
| Warning | ⚠ | --color-warning-500 |
| Error | ✕ | --color-error-500 |
| Info | ℹ | --color-info-500 |

### Hành vi
- Tự động đóng sau 5 giây (có thể cấu hình)
- Có nút đóng thủ công
- Xếp chồng từ trên xuống

## 6. Badge

### Biến thể
- Status Badge (chấm tròn + text)
- Category Tag (nền màu + text)

### Kích thước
- `sm`: padding 2px 8px, font-size 12px
- `md`: padding 4px 12px, font-size 14px

## 7. Table

### Tính năng
- Header cố định khi cuộn
- Sắp xếp theo cột (click header)
- Hover highlight hàng
- Responsive: chuyển sang dạng card trên mobile

## 8. Dropdown / Select

### Tính năng
- Danh sách tùy chọn dạng dropdown
- Tìm kiếm / lọc
- Chọn đơn / đa
- Nhóm tùy chọn

## 9. Tabs

### Tính năng
- Indicator (thanh dưới tab active)
- Trạng thái Active / Inactive / Disabled
- Cuộn ngang khi nhiều tab (mobile)

## 10. Sidebar Layout

### Tính năng
- Thu gọn / Mở rộng (toggle)
- Highlight menu đang active
- Nhóm menu với header
- Responsive: chuyển sang drawer trên mobile
