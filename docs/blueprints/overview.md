# Tổng quan dự án — HRLite

## Tầm nhìn
Xây dựng công cụ quản lý nhân sự nội bộ nhẹ, dễ sử dụng cho tổ chức, giúp đơn giản hóa các quy trình HR hàng ngày.

## Mục tiêu
- Quản lý thông tin nhân viên tập trung và hiệu quả
- Theo dõi chấm công và nghỉ phép tự động
- Cung cấp báo cáo nhân sự trực quan
- Giao diện đơn giản, dễ sử dụng

## Cấu trúc module

| # | Module | Mô tả | Độ ưu tiên | Sprint | Trạng thái |
|---|--------|--------|-----------|--------|-----------|
| 001 | Xác thực (Auth) | Đăng ký, đăng nhập, phân quyền, điều khoản | Cao | Sprint 1 | ✅ Hoàn thành |
| 002 | Quản lý phòng ban | CRUD phòng ban, cây tổ chức | Cao | Sprint 2 | 📝 Đã có blueprint |
| 003 | Quản lý nhân viên | CRUD nhân viên, hồ sơ, tìm kiếm, liên kết User | Cao | Sprint 2 | 📝 Đã có blueprint |
| 004 | Chấm công | Check-in/out, tổng hợp giờ làm | Cao | Sprint 3 | ⏳ Chờ |
| 005 | Nghỉ phép | Đăng ký, phê duyệt, theo dõi số ngày | Trung bình | Sprint 3 | ⏳ Chờ |
| 006 | Báo cáo | Dashboard, báo cáo nhân sự, xuất Excel | Trung bình | Sprint 4 | ⏳ Chờ |

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
Auth (001) ←── Tất cả module đều phụ thuộc Auth

Quản lý phòng ban (002) ←── Quản lý nhân viên (003)
                                     │
                                     ├──→ Chấm công (004)
                                     │
                                     ├──→ Nghỉ phép (005)
                                     │
                                     └──→ Báo cáo (006) ←── tổng hợp từ tất cả module
```
