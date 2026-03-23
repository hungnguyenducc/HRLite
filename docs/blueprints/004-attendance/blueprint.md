# Blueprint 004: Module Chấm công (Attendance)

> Tài liệu thiết kế chi tiết cho module chấm công — HRLite

## 1. Tổng quan

Module Attendance quản lý việc ghi nhận giờ làm việc hàng ngày của nhân viên, bao gồm check-in, check-out, tính toán giờ làm tự động, và cung cấp báo cáo tổng hợp chấm công theo tháng.

### Đặc điểm chính
- **Check-in/Check-out**: Nhân viên tự ghi nhận giờ vào/ra qua giao diện
- **Tính giờ làm tự động**: Hệ thống tự tính `workHour` khi có cả check-in và check-out
- **Trạng thái chấm công**: PRESENT (có mặt), ABSENT (vắng), LATE (đi trễ), HALF_DAY (nửa ngày), HOLIDAY (nghỉ lễ)
- **Báo cáo tháng**: Tổng hợp số ngày công, giờ làm, ngày vắng theo nhân viên
- **ADMIN quản lý**: Admin có thể tạo/sửa/xóa bản ghi chấm công cho bất kỳ nhân viên nào

### Phạm vi
- Check-in/check-out cho nhân viên (tự chấm công hoặc ADMIN chấm hộ)
- Xem lịch sử chấm công cá nhân (trong tab Chấm công trên trang chi tiết NV)
- Trang quản lý chấm công tổng hợp (ADMIN)
- Báo cáo chấm công theo tháng (thống kê ngày công, giờ làm)
- Tích hợp vào dashboard (số người có mặt hôm nay)

### Phụ thuộc
- **Module Auth (001)**: Xác thực JWT, phân quyền ADMIN/USER
- **Module Employee (003)**: Nhân viên (EMPL_ID → TB_EMPL)

---

## 2. Kiến trúc

```
┌──────────────────────────────────────────────────────────┐
│                     Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ Trang Chấm   │  │ Tab Chấm     │  │ Check-in/out  │   │
│  │ công (Admin) │  │ công (NV)    │  │ Widget        │   │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘   │
│         └──────────────────┼──────────────────┘           │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────┐
│               Next.js 15 (App Router)                     │
│                            │                              │
│  ┌─────────────────────────┼─────────────────────┐        │
│  │         API Routes (/api/attendance/*)          │        │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐ │        │
│  │  │ Check-in │ │ CRUD     │ │ Báo cáo        │ │        │
│  │  │ /out     │ │ (Admin)  │ │ tháng          │ │        │
│  │  └────┬─────┘ └────┬─────┘ └────────┬───────┘ │        │
│  └───────┼─────────────┼───────────────┼──────────┘        │
│          │             │               │                  │
│  ┌───────┼─────────────┼───────────────┼──────────┐        │
│  │       │     Auth Middleware (JWT + Role)        │        │
│  └───────┼─────────────┼───────────────┼──────────┘        │
│          │             │               │                  │
│  ┌───────┴─────────────┴───────────────┴──────────┐        │
│  │           Prisma ORM (Service Layer)            │        │
│  └──────────────────────┬─────────────────────────┘        │
└─────────────────────────┼──────────────────────────────────┘
                          │
                  ┌───────┴───────┐
                  │ PostgreSQL 16 │
                  │   TH_ATND    │
                  └───────────────┘
```

---

## 3. Database Schema

> Chi tiết đầy đủ tại `docs/database/database-design.md` — Module 003.

### TH_ATND (Lịch sử chấm công)

| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| ATND_ID | UUID | ID chấm công | PK, DEFAULT gen_random_uuid() |
| EMPL_ID | UUID | ID nhân viên | FK → TB_EMPL, NOT NULL |
| ATND_DT | DATE | Ngày chấm công | NOT NULL |
| CHK_IN_TM | TIMESTAMP | Giờ vào | |
| CHK_OUT_TM | TIMESTAMP | Giờ ra | |
| WORK_HOUR | DECIMAL(4,2) | Số giờ làm | Tự tính khi có cả in/out |
| ATND_STTS_CD | VARCHAR(20) | Mã trạng thái | NOT NULL |
| RMK | TEXT | Ghi chú | |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL, DEFAULT NOW() |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật | |
| UPDT_BY | VARCHAR(100) | Người cập nhật | |

### Unique Constraint
- `@@unique([emplId, atndDt])`: Mỗi nhân viên chỉ có 1 bản ghi chấm công/ngày

### Mã trạng thái chấm công (ATND_STTS_CD)

| Mã | Ý nghĩa | Mô tả |
|----|---------|-------|
| PRESENT | Có mặt | Đã check-in, đủ giờ (≥ 8h) |
| LATE | Đi trễ | Check-in sau 09:00 |
| HALF_DAY | Nửa ngày | Làm < 4h hoặc chỉ check-in/check-out |
| ABSENT | Vắng mặt | Không có bản ghi check-in |
| HOLIDAY | Nghỉ lễ | Ngày nghỉ lễ/cuối tuần |

### Quan hệ
- **TB_EMPL** (N:1): Nhiều bản ghi chấm công thuộc một nhân viên

---

## 4. Thiết kế API

> Tất cả endpoint yêu cầu **xác thực JWT**.

### 4.1 POST /api/attendance/check-in
- **Mô tả**: Nhân viên check-in (tự chấm công)
- **Auth**: Bearer (USER hoặc ADMIN)
- **Luồng xử lý**:
  1. Lấy user hiện tại từ JWT → tìm Employee liên kết
  2. Kiểm tra chưa có check-in hôm nay
  3. Tạo bản ghi TH_ATND với `chkInTm = now()`, `atndDt = today`
  4. Xác định trạng thái: nếu sau 09:00 → LATE, ngược lại → PRESENT
- **Body**: Không có (tự lấy từ context)
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "atndDt": "2026-03-24",
      "chkInTm": "2026-03-24T08:30:00.000Z",
      "chkOutTm": null,
      "workHour": null,
      "atndSttsCd": "PRESENT"
    }
  }
  ```
- **Lỗi**:
  - `400`: "Bạn đã check-in hôm nay rồi."
  - `400`: "Tài khoản chưa liên kết với nhân viên nào."
  - `400`: "Nhân viên không ở trạng thái đang làm việc."

### 4.2 POST /api/attendance/check-out
- **Mô tả**: Nhân viên check-out
- **Auth**: Bearer (USER hoặc ADMIN)
- **Luồng xử lý**:
  1. Tìm bản ghi check-in hôm nay
  2. Cập nhật `chkOutTm = now()`
  3. Tính `workHour = (chkOutTm - chkInTm) / 3600000` (giờ, làm tròn 2 chữ số)
  4. Cập nhật trạng thái: < 4h → HALF_DAY, ≥ 8h → giữ nguyên, 4-8h → giữ nguyên
- **Body**: Không có
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "atndDt": "2026-03-24",
      "chkInTm": "2026-03-24T08:30:00.000Z",
      "chkOutTm": "2026-03-24T17:30:00.000Z",
      "workHour": 9.00,
      "atndSttsCd": "PRESENT"
    }
  }
  ```
- **Lỗi**:
  - `400`: "Bạn chưa check-in hôm nay."
  - `400`: "Bạn đã check-out hôm nay rồi."

### 4.3 GET /api/attendance/today
- **Mô tả**: Lấy trạng thái chấm công hôm nay của user hiện tại
- **Auth**: Bearer (USER hoặc ADMIN)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "atndDt": "2026-03-24",
      "chkInTm": "2026-03-24T08:30:00.000Z",
      "chkOutTm": null,
      "workHour": null,
      "atndSttsCd": "PRESENT"
    }
  }
  ```
  Nếu chưa check-in: `data: null`

### 4.4 GET /api/attendance
- **Mô tả**: Lấy danh sách chấm công (ADMIN: tất cả NV, USER: chỉ của mình)
- **Auth**: Bearer (USER hoặc ADMIN)
- **Query params**:
  | Param | Kiểu | Mặc định | Mô tả |
  |-------|------|---------|-------|
  | page | number | 1 | Trang hiện tại |
  | limit | number | 20 | Số bản ghi/trang |
  | emplId | string | — | Lọc theo nhân viên (ADMIN) |
  | deptId | string | — | Lọc theo phòng ban (ADMIN) |
  | month | string | — | Lọc theo tháng (YYYY-MM) |
  | status | string | — | Lọc theo trạng thái |
  | sortBy | string | atndDt | Cột sắp xếp |
  | sortOrder | string | desc | Thứ tự (asc, desc) |
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "emplId": "uuid",
        "employee": {
          "emplNo": "NV-0001",
          "emplNm": "Nguyễn Văn An",
          "department": { "deptNm": "Phòng Nhân sự" }
        },
        "atndDt": "2026-03-24",
        "chkInTm": "2026-03-24T08:30:00.000Z",
        "chkOutTm": "2026-03-24T17:30:00.000Z",
        "workHour": 9.00,
        "atndSttsCd": "PRESENT"
      }
    ],
    "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
  }
  ```

### 4.5 POST /api/attendance
- **Mô tả**: Tạo bản ghi chấm công thủ công (ADMIN)
- **Auth**: Bearer (ADMIN)
- **Body**:
  ```json
  {
    "emplId": "uuid",
    "atndDt": "2026-03-24",
    "chkInTm": "2026-03-24T08:30:00.000Z",
    "chkOutTm": "2026-03-24T17:30:00.000Z",
    "atndSttsCd": "PRESENT",
    "rmk": "Bổ sung chấm công"
  }
  ```
- **Validation**:
  | Trường | Quy tắc |
  |--------|---------|
  | emplId | Bắt buộc, UUID hợp lệ, nhân viên phải tồn tại và WORKING |
  | atndDt | Bắt buộc, format YYYY-MM-DD |
  | chkInTm | Tùy chọn, ISO 8601 |
  | chkOutTm | Tùy chọn, ISO 8601, phải sau chkInTm |
  | atndSttsCd | Bắt buộc, enum: PRESENT, LATE, HALF_DAY, ABSENT, HOLIDAY |
  | rmk | Tùy chọn, tối đa 500 ký tự |
- **Xử lý đặc biệt**:
  - Nếu có cả `chkInTm` và `chkOutTm` → tự tính `workHour`
  - Kiểm tra unique `(emplId, atndDt)` — mỗi NV chỉ 1 bản ghi/ngày
- **Response**: `201 Created`
- **Lỗi**: `409 Conflict` nếu đã có bản ghi cùng ngày

### 4.6 PATCH /api/attendance/[id]
- **Mô tả**: Cập nhật bản ghi chấm công (ADMIN)
- **Auth**: Bearer (ADMIN)
- **Body**: Các trường cần cập nhật (partial update)
- **Xử lý đặc biệt**:
  - Nếu cập nhật `chkInTm` hoặc `chkOutTm` → tính lại `workHour`
- **Response**: `200 OK`

### 4.7 DELETE /api/attendance/[id]
- **Mô tả**: Xóa bản ghi chấm công (ADMIN)
- **Auth**: Bearer (ADMIN)
- **Response**: `200 OK` (hard delete — bản ghi lịch sử không cần soft delete)

### 4.8 GET /api/attendance/summary
- **Mô tả**: Báo cáo tổng hợp chấm công theo tháng
- **Auth**: Bearer (ADMIN)
- **Query params**:
  | Param | Kiểu | Mặc định | Mô tả |
  |-------|------|---------|-------|
  | month | string | tháng hiện tại | Tháng (YYYY-MM) |
  | deptId | string | — | Lọc theo phòng ban |
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "month": "2026-03",
      "workingDays": 22,
      "employees": [
        {
          "emplNo": "NV-0001",
          "emplNm": "Nguyễn Văn An",
          "deptNm": "Phòng Nhân sự",
          "presentDays": 20,
          "lateDays": 1,
          "absentDays": 1,
          "halfDays": 0,
          "totalWorkHours": 168.50
        }
      ]
    }
  }
  ```

### 4.9 GET /api/attendance/stats
- **Mô tả**: Thống kê chấm công hôm nay (cho dashboard)
- **Auth**: Bearer (USER hoặc ADMIN)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "date": "2026-03-24",
      "totalEmployees": 10,
      "checkedIn": 8,
      "notCheckedIn": 2,
      "checkedOut": 5,
      "lateCount": 1
    }
  }
  ```

---

## 5. Luồng nghiệp vụ

### 5.1 Check-in

```
Client                          Server                         Database
  │                               │                               │
  │  POST /api/attendance/        │                               │
  │       check-in                │                               │
  │──────────────────────────────>│                               │
  │                               │  Lấy user từ JWT              │
  │                               │  Tìm Employee liên kết         │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  Kiểm tra NV đang WORKING     │
  │                               │  Kiểm tra chưa check-in       │
  │                               │  hôm nay                      │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  Xác định trạng thái:         │
  │                               │  now() > 09:00 → LATE         │
  │                               │  ngược lại → PRESENT          │
  │                               │  INSERT TH_ATND               │
  │                               │──────────────────────────────>│
  │  201 Created                  │                               │
  │<──────────────────────────────│                               │
```

### 5.2 Check-out

```
Client                          Server                         Database
  │                               │                               │
  │  POST /api/attendance/        │                               │
  │       check-out               │                               │
  │──────────────────────────────>│                               │
  │                               │  Lấy user → Employee          │
  │                               │  Tìm bản ghi hôm nay          │
  │                               │──────────────────────────────>│
  │                               │<── {chkInTm: 08:30} ─────────│
  │                               │  chkOutTm = now()              │
  │                               │  workHour = (out - in) / 3.6M │
  │                               │  Nếu workHour < 4 → HALF_DAY  │
  │                               │  UPDATE TH_ATND               │
  │                               │──────────────────────────────>│
  │  200 OK                       │                               │
  │  {workHour: 9.00}            │                               │
  │<──────────────────────────────│                               │
```

### 5.3 Admin tạo chấm công bổ sung

```
Client                          Server                         Database
  │                               │                               │
  │  POST /api/attendance         │                               │
  │  {emplId, atndDt, ...}       │                               │
  │──────────────────────────────>│                               │
  │                               │  Validate input (zod)         │
  │                               │  Kiểm tra quyền ADMIN         │
  │                               │  Kiểm tra Employee tồn tại    │
  │                               │──────────────────────────────>│
  │                               │  Kiểm tra unique (emplId,     │
  │                               │  atndDt) — chưa có bản ghi    │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  Tính workHour nếu có cả     │
  │                               │  chkInTm + chkOutTm            │
  │                               │  INSERT TH_ATND               │
  │                               │──────────────────────────────>│
  │  201 Created                  │                               │
  │<──────────────────────────────│                               │
```

---

## 6. Màn hình

### 6.1 Widget Check-in/Check-out (Dashboard)

| Thuộc tính | Giá trị |
|-----------|---------|
| Vị trí | Góc trên phải Dashboard hoặc thanh header |
| Quyền | USER + ADMIN (phải có Employee liên kết) |

**Trạng thái UI**:
| Trạng thái | Hiển thị |
|------------|---------|
| Chưa check-in | Nút "Check-in" (màu xanh) + hiển thị giờ hiện tại |
| Đã check-in | Giờ check-in + Nút "Check-out" (màu cam) + đồng hồ đếm giờ làm |
| Đã check-out | Giờ in/out + Tổng giờ làm (màu xám, không có nút) |

### 6.2 Trang Chấm công (Admin)

| Thuộc tính | Giá trị |
|-----------|---------|
| Đường dẫn | `/attendance` |
| Quyền | ADMIN |
| Layout | Bảng dữ liệu + bộ lọc + nút tạo bổ sung |

**Các thành phần UI**:
- Bộ lọc: Tháng (month picker) | Phòng ban (dropdown) | Trạng thái (dropdown) | Nhân viên (search)
- Thẻ thống kê: Có mặt hôm nay | Chưa check-in | Đi trễ | Đã check-out
- Bảng: Ngày | Mã NV | Họ tên | Phòng ban | Giờ vào | Giờ ra | Số giờ | Trạng thái | Hành động
- Badge trạng thái: PRESENT (xanh), LATE (cam), HALF_DAY (vàng), ABSENT (đỏ), HOLIDAY (xám)
- Hành động mỗi dòng: Sửa | Xóa
- Nút "Tạo chấm công" → mở dialog tạo thủ công

### 6.3 Tab Chấm công trong Chi tiết NV

| Thuộc tính | Giá trị |
|-----------|---------|
| Vị trí | Tab thứ 3 trong `/employees/[id]` |
| Quyền | USER + ADMIN (xem), ADMIN (sửa) |

**Nội dung**:
- Lịch chấm công tháng hiện tại (dạng bảng)
- Month picker để xem tháng khác
- Tổng hợp tháng: Ngày công | Đi trễ | Vắng | Tổng giờ làm
- Cột bảng: Ngày | Giờ vào | Giờ ra | Số giờ | Trạng thái | Ghi chú

### 6.4 Dialog Tạo/Sửa chấm công

| Thuộc tính | Giá trị |
|-----------|---------|
| Hiển thị | Dialog (modal) |
| Quyền | ADMIN |

**Các trường form**:
| Trường | Kiểu | Bắt buộc | Ghi chú |
|--------|------|---------|---------|
| Nhân viên | Select (search) | Có | Chỉ NV đang WORKING |
| Ngày | Date picker | Có | |
| Giờ vào | Time input | Không | |
| Giờ ra | Time input | Không | Phải sau giờ vào |
| Trạng thái | Select | Có | PRESENT/LATE/HALF_DAY/ABSENT/HOLIDAY |
| Ghi chú | Textarea | Không | Tối đa 500 ký tự |

---

## 7. Validation Schema (Zod)

```typescript
// src/lib/validations/attendance.schema.ts

import { z } from 'zod';

export const attendanceStatusEnum = z.enum([
  'PRESENT',
  'LATE',
  'HALF_DAY',
  'ABSENT',
  'HOLIDAY',
]);

export const createAttendanceSchema = z.object({
  emplId: z.string().uuid('ID nhân viên không hợp lệ'),
  atndDt: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Ngày chấm công phải có format YYYY-MM-DD'
  ),
  chkInTm: z.string().datetime().optional().nullable(),
  chkOutTm: z.string().datetime().optional().nullable(),
  atndSttsCd: attendanceStatusEnum,
  rmk: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional().nullable(),
}).refine(
  (data) => {
    if (data.chkInTm && data.chkOutTm) {
      return new Date(data.chkOutTm) > new Date(data.chkInTm);
    }
    return true;
  },
  { message: 'Giờ ra phải sau giờ vào', path: ['chkOutTm'] }
);

export const updateAttendanceSchema = createAttendanceSchema
  .omit({ emplId: true, atndDt: true })
  .partial();

export const attendanceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  emplId: z.string().uuid().optional(),
  deptId: z.string().uuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month phải có format YYYY-MM').optional(),
  status: attendanceStatusEnum.optional(),
  sortBy: z.enum(['atndDt', 'chkInTm', 'emplNm']).default('atndDt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

---

## 8. Quy tắc nghiệp vụ

### Tính giờ làm
```typescript
function calculateWorkHours(chkInTm: Date, chkOutTm: Date): number {
  const diffMs = chkOutTm.getTime() - chkInTm.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100; // Làm tròn 2 chữ số
}
```

### Xác định trạng thái tự động
```typescript
function determineStatus(chkInTm: Date, workHour?: number): string {
  const hour = chkInTm.getHours();
  const minute = chkInTm.getMinutes();

  // Check-in sau 09:00 → LATE
  if (hour > 9 || (hour === 9 && minute > 0)) {
    return 'LATE';
  }

  // Nếu có workHour < 4 → HALF_DAY
  if (workHour !== undefined && workHour < 4) {
    return 'HALF_DAY';
  }

  return 'PRESENT';
}
```

### Giờ làm tiêu chuẩn
- Giờ vào tiêu chuẩn: 08:00
- Giờ ra tiêu chuẩn: 17:00
- Thời gian nghỉ trưa: 1 giờ (không trừ tự động, tùy quy định tổ chức)
- Giờ công chuẩn/ngày: 8 giờ

---

## 9. Cấu trúc thư mục

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── attendance/
│   │       └── page.tsx              # Trang chấm công (Admin)
│   └── api/
│       └── attendance/
│           ├── route.ts              # GET (danh sách), POST (tạo)
│           ├── check-in/
│           │   └── route.ts         # POST (check-in)
│           ├── check-out/
│           │   └── route.ts         # POST (check-out)
│           ├── today/
│           │   └── route.ts         # GET (trạng thái hôm nay)
│           ├── summary/
│           │   └── route.ts         # GET (báo cáo tháng)
│           ├── stats/
│           │   └── route.ts         # GET (thống kê dashboard)
│           └── [id]/
│               └── route.ts         # PATCH (sửa), DELETE (xóa)
├── lib/
│   └── validations/
│       └── attendance.schema.ts      # Zod validation
└── components/
    └── attendance/
        ├── attendance-table.tsx      # Bảng danh sách chấm công
        ├── attendance-form-dialog.tsx # Dialog tạo/sửa
        ├── attendance-stats.tsx      # Thẻ thống kê
        ├── attendance-employee-tab.tsx # Tab chấm công trong chi tiết NV
        └── check-in-widget.tsx       # Widget check-in/out
```

---

## 10. Thứ tự triển khai

### Phase 1: API Backend
- [ ] Tạo Zod validation schema (`attendance.schema.ts`)
- [ ] API POST /api/attendance/check-in
- [ ] API POST /api/attendance/check-out
- [ ] API GET /api/attendance/today
- [ ] API GET /api/attendance (danh sách, lọc, phân trang)
- [ ] API POST /api/attendance (tạo thủ công — ADMIN)
- [ ] API PATCH /api/attendance/[id] (sửa — ADMIN)
- [ ] API DELETE /api/attendance/[id] (xóa — ADMIN)
- [ ] API GET /api/attendance/summary (báo cáo tháng)
- [ ] API GET /api/attendance/stats (thống kê dashboard)
- [ ] Prisma migration cho unique constraint (emplId, atndDt)
- [ ] Unit test cho validation + tính giờ làm
- [ ] Integration test cho API

### Phase 2: Giao diện
- [ ] Widget Check-in/Check-out (dashboard header)
- [ ] Trang chấm công ADMIN (`/attendance`)
- [ ] Component bảng danh sách (lọc tháng, phòng ban, trạng thái)
- [ ] Component thẻ thống kê
- [ ] Dialog tạo/sửa chấm công
- [ ] Tab Chấm công trong chi tiết NV (`/employees/[id]`)
- [ ] Cập nhật sidebar active state cho `/attendance`

### Phase 3: Tích hợp & Seed Data
- [ ] Seed dữ liệu chấm công mẫu (2-3 tuần gần đây cho 10 NV)
- [ ] Cập nhật dashboard: thêm card "Có mặt hôm nay"
- [ ] Kiểm thử tích hợp toàn bộ flow

---

## Tài liệu tham chiếu

- `docs/database/database-design.md` — Thiết kế DB chi tiết (SSoT)
- `docs/blueprints/001-auth/blueprint.md` — Blueprint Auth (xác thực, liên kết User ↔ Employee)
- `docs/blueprints/003-employee/blueprint.md` — Blueprint Employee (phụ thuộc)
- `prisma/schema.prisma` — Prisma schema (model Attendance đã định nghĩa)
