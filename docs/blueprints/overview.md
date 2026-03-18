# Tổng quan dự án — HRLite

## Tầm nhìn
Xây dựng công cụ quản lý nhân sự nội bộ nhẹ, dễ sử dụng cho tổ chức, giúp đơn giản hóa các quy trình HR hàng ngày.

## Mục tiêu
- Quản lý thông tin nhân viên tập trung và hiệu quả
- Theo dõi chấm công và nghỉ phép tự động
- Cung cấp báo cáo nhân sự trực quan
- Giao diện đơn giản, dễ sử dụng

## Cấu trúc module

| # | Module | Mô tả | Độ ưu tiên |
|---|--------|--------|-----------|
| 001 | Quản lý nhân viên | CRUD nhân viên, hồ sơ, tìm kiếm | Cao |
| 002 | Quản lý phòng ban | CRUD phòng ban, cơ cấu tổ chức | Cao |
| 003 | Chấm công | Check-in/out, tổng hợp giờ làm | Cao |
| 004 | Nghỉ phép | Đăng ký, phê duyệt, theo dõi số ngày | Trung bình |
| 005 | Báo cáo | Dashboard, báo cáo nhân sự, xuất Excel | Trung bình |

## Tech Stack và lý do lựa chọn

| Công nghệ | Lựa chọn | Lý do |
|-----------|---------|-------|
| Backend | NestJS | Framework TypeScript mạnh mẽ, có cấu trúc rõ ràng, hỗ trợ DI |
| Frontend | Next.js 15 | SSR/SSG, App Router, Server Components cho hiệu suất tối ưu |
| Database | PostgreSQL 16 | RDBMS đáng tin cậy, hỗ trợ JSON, full-text search |
| ORM | Prisma | Type-safe, migration tự động, tích hợp tốt với TypeScript |
| Design System | shadcn/ui | Sở hữu mã nguồn, tùy biến cao, dựa trên Radix UI + Tailwind |

## Phụ thuộc giữa các module

```
Quản lý nhân viên ──→ Quản lý phòng ban
        │
        ├──→ Chấm công
        │
        ├──→ Nghỉ phép
        │
        └──→ Báo cáo (tổng hợp từ tất cả module)
```
