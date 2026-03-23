# Blueprint 005: Module Nghỉ phép (Leave)

> Tài liệu thiết kế chi tiết cho module quản lý nghỉ phép — HRLite

## 1. Tổng quan

Module Leave quản lý toàn bộ quy trình nghỉ phép: từ đăng ký loại nghỉ, nhân viên tạo yêu cầu, đến phê duyệt/từ chối bởi ADMIN, theo dõi số ngày phép còn lại theo năm.

### Đặc điểm chính
- **Quản lý loại nghỉ phép**: Nghỉ phép năm, nghỉ ốm, nghỉ cưới, nghỉ thai sản... với số ngày tối đa/năm
- **Luồng phê duyệt**: Nhân viên tạo yêu cầu → ADMIN duyệt/từ chối
- **Tính số ngày**: Tự động tính số ngày nghỉ (hỗ trợ nghỉ nửa ngày)
- **Theo dõi số phép**: Tổng phép/năm, đã dùng, còn lại theo từng loại
- **Lịch nghỉ phép**: Xem ai đang nghỉ hôm nay/tuần này

### Phạm vi
- CRUD loại nghỉ phép (ADMIN)
- Tạo/hủy yêu cầu nghỉ phép (nhân viên)
- Phê duyệt/từ chối yêu cầu (ADMIN)
- Xem lịch sử nghỉ phép (trong tab Nghỉ phép trên trang chi tiết NV)
- Trang quản lý nghỉ phép tổng hợp (ADMIN)
- Thống kê: số người nghỉ hôm nay, số yêu cầu chờ duyệt
- Tích hợp vào dashboard

### Phụ thuộc
- **Module Auth (001)**: Xác thực JWT, phân quyền ADMIN/USER
- **Module Employee (003)**: Nhân viên (EMPL_ID → TB_EMPL)

---

## 2. Kiến trúc

```
┌──────────────────────────────────────────────────────────┐
│                     Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ Trang Nghỉ   │  │ Tab Nghỉ     │  │ Form Yêu cầu │   │
│  │ phép (Admin) │  │ phép (NV)    │  │ nghỉ phép     │   │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘   │
│         └──────────────────┼──────────────────┘           │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────┐
│               Next.js 15 (App Router)                     │
│                            │                              │
│  ┌─────────────────────────┼─────────────────────────────┐│
│  │    API Routes (/api/leave/*, /api/leave-types/*)       ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ││
│  │  │ Loại     │ │ Yêu cầu  │ │ Phê      │ │ Thống kê │ ││
│  │  │ nghỉ     │ │ nghỉ     │ │ duyệt    │ │ & số dư  │ ││
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ ││
│  └───────┼─────────────┼───────────┼────────────┼────────┘│
│          │             │           │            │         │
│  ┌───────┼─────────────┼───────────┼────────────┼────────┐│
│  │       │     Auth Middleware (JWT + Role)               ││
│  └───────┼─────────────┼───────────┼────────────┼────────┘│
│          │             │           │            │         │
│  ┌───────┴─────────────┴───────────┴────────────┴────────┐│
│  │           Prisma ORM (Service Layer)                   ││
│  └──────────────────────┬────────────────────────────────┘│
└─────────────────────────┼────────────────────────────────┘
                          │
                  ┌───────┴───────┐
                  │ PostgreSQL 16 │
                  │ TB_LV_REQ    │
                  │ TC_LV_TYPE   │
                  └───────────────┘
```

---

## 3. Database Schema

> Chi tiết đầy đủ tại `docs/database/database-design.md` — Module 004.

### TC_LV_TYPE (Loại nghỉ phép)

| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| LV_TYPE_CD | VARCHAR(20) | Mã loại nghỉ | PK |
| LV_TYPE_NM | VARCHAR(50) | Tên loại nghỉ | NOT NULL |
| MAX_DAYS | INT | Số ngày tối đa/năm | |
| USE_YN | CHAR(1) | Đang sử dụng | DEFAULT 'Y' |

### Dữ liệu mặc định TC_LV_TYPE

| Mã | Tên | Số ngày tối đa/năm |
|----|-----|---------------------|
| ANNUAL | Nghỉ phép năm | 12 |
| SICK | Nghỉ ốm | 30 |
| MARRIAGE | Nghỉ cưới | 3 |
| MATERNITY | Nghỉ thai sản | 180 |
| PATERNITY | Nghỉ chăm con | 5 |
| BEREAVEMENT | Nghỉ tang | 3 |
| UNPAID | Nghỉ không lương | null (không giới hạn) |

### TB_LV_REQ (Yêu cầu nghỉ phép)

| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| LV_REQ_ID | UUID | ID yêu cầu | PK, DEFAULT gen_random_uuid() |
| EMPL_ID | UUID | ID nhân viên | FK → TB_EMPL, NOT NULL |
| LV_TYPE_CD | VARCHAR(20) | Mã loại nghỉ | FK → TC_LV_TYPE, NOT NULL |
| START_DT | DATE | Ngày bắt đầu | NOT NULL |
| END_DT | DATE | Ngày kết thúc | NOT NULL |
| LV_DAYS | DECIMAL(3,1) | Số ngày nghỉ | NOT NULL |
| RSN | TEXT | Lý do | NOT NULL |
| APRVL_STTS_CD | VARCHAR(20) | Mã trạng thái phê duyệt | NOT NULL |
| APRVR_ID | UUID | ID người phê duyệt | FK → TB_EMPL |
| APRVL_DT | TIMESTAMP | Thời gian phê duyệt | |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL, DEFAULT NOW() |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật | |
| UPDT_BY | VARCHAR(100) | Người cập nhật | |

### Mã trạng thái phê duyệt (APRVL_STTS_CD)

| Mã | Ý nghĩa | Mô tả |
|----|---------|-------|
| PENDING | Chờ duyệt | Nhân viên vừa tạo yêu cầu |
| APPROVED | Đã duyệt | ADMIN đã phê duyệt |
| REJECTED | Từ chối | ADMIN đã từ chối |
| CANCELLED | Đã hủy | Nhân viên tự hủy (chỉ khi PENDING) |

### Quan hệ
- **TB_EMPL** (N:1 — requester): Nhân viên tạo yêu cầu
- **TB_EMPL** (N:1 — approver): Người phê duyệt
- **TC_LV_TYPE** (N:1): Loại nghỉ phép

---

## 4. Thiết kế API

> Tất cả endpoint yêu cầu **xác thực JWT**.

### Nhóm A: Quản lý loại nghỉ phép (ADMIN)

#### 4.1 GET /api/leave-types
- **Mô tả**: Lấy danh sách loại nghỉ phép
- **Auth**: Bearer (USER hoặc ADMIN)
- **Query params**:
  | Param | Kiểu | Mặc định | Mô tả |
  |-------|------|---------|-------|
  | useYn | string | — | Lọc theo trạng thái sử dụng (Y/N) |
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "lvTypeCd": "ANNUAL",
        "lvTypeNm": "Nghỉ phép năm",
        "maxDays": 12,
        "useYn": "Y"
      }
    ]
  }
  ```

#### 4.2 POST /api/leave-types
- **Mô tả**: Tạo loại nghỉ phép mới
- **Auth**: Bearer (ADMIN)
- **Body**:
  ```json
  {
    "lvTypeCd": "TRAINING",
    "lvTypeNm": "Nghỉ đào tạo",
    "maxDays": 5
  }
  ```
- **Validation**:
  | Trường | Quy tắc |
  |--------|---------|
  | lvTypeCd | Bắt buộc, 1-20 ký tự, chữ hoa + gạch dưới, unique |
  | lvTypeNm | Bắt buộc, 1-50 ký tự |
  | maxDays | Tùy chọn, số nguyên dương |
- **Response**: `201 Created`
- **Lỗi**: `409 Conflict` nếu mã đã tồn tại

#### 4.3 PATCH /api/leave-types/[cd]
- **Mô tả**: Cập nhật loại nghỉ phép
- **Auth**: Bearer (ADMIN)
- **Body**: `{ lvTypeNm?, maxDays?, useYn? }`
- **Response**: `200 OK`

#### 4.4 DELETE /api/leave-types/[cd]
- **Mô tả**: Xóa loại nghỉ phép (chỉ khi chưa có yêu cầu nào sử dụng)
- **Auth**: Bearer (ADMIN)
- **Response**: `200 OK`
- **Lỗi**: `409 Conflict` nếu đã có yêu cầu nghỉ phép sử dụng loại này

### Nhóm B: Yêu cầu nghỉ phép

#### 4.5 GET /api/leave
- **Mô tả**: Lấy danh sách yêu cầu nghỉ phép
  - **ADMIN**: Xem tất cả, lọc theo NV/phòng ban/trạng thái
  - **USER**: Chỉ xem của mình (tự lọc theo Employee liên kết)
- **Auth**: Bearer (USER hoặc ADMIN)
- **Query params**:
  | Param | Kiểu | Mặc định | Mô tả |
  |-------|------|---------|-------|
  | page | number | 1 | Trang hiện tại |
  | limit | number | 20 | Số bản ghi/trang |
  | emplId | string | — | Lọc theo NV (ADMIN) |
  | deptId | string | — | Lọc theo phòng ban (ADMIN) |
  | status | string | — | Lọc trạng thái (PENDING, APPROVED, REJECTED, CANCELLED) |
  | lvTypeCd | string | — | Lọc theo loại nghỉ |
  | year | number | năm hiện tại | Lọc theo năm |
  | sortBy | string | creatDt | Cột sắp xếp |
  | sortOrder | string | desc | Thứ tự |
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "employee": {
          "emplNo": "NV-0001",
          "emplNm": "Nguyễn Văn An",
          "department": { "deptNm": "Phòng Nhân sự" }
        },
        "leaveType": {
          "lvTypeCd": "ANNUAL",
          "lvTypeNm": "Nghỉ phép năm"
        },
        "startDt": "2026-03-25",
        "endDt": "2026-03-26",
        "lvDays": 2.0,
        "rsn": "Việc gia đình",
        "aprvlSttsCd": "PENDING",
        "approver": null,
        "aprvlDt": null,
        "creatDt": "2026-03-23T08:00:00.000Z"
      }
    ],
    "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
  }
  ```

#### 4.6 POST /api/leave
- **Mô tả**: Tạo yêu cầu nghỉ phép
- **Auth**: Bearer (USER hoặc ADMIN)
- **Luồng xử lý**:
  1. Lấy Employee từ JWT (USER) hoặc từ body.emplId (ADMIN)
  2. Validate loại nghỉ tồn tại và đang hoạt động
  3. Tính số ngày nghỉ (`lvDays`) từ startDt → endDt (trừ T7, CN)
  4. Kiểm tra không trùng ngày với yêu cầu APPROVED/PENDING khác
  5. Kiểm tra số phép còn lại (nếu loại có maxDays)
  6. Tạo yêu cầu với trạng thái PENDING
- **Body**:
  ```json
  {
    "emplId": "uuid",
    "lvTypeCd": "ANNUAL",
    "startDt": "2026-03-25",
    "endDt": "2026-03-26",
    "rsn": "Việc gia đình"
  }
  ```
  - `emplId` bắt buộc khi ADMIN tạo hộ, tự lấy khi USER tạo
- **Validation**:
  | Trường | Quy tắc |
  |--------|---------|
  | emplId | UUID hợp lệ, NV phải tồn tại và WORKING |
  | lvTypeCd | Bắt buộc, loại nghỉ phải tồn tại và useYn = 'Y' |
  | startDt | Bắt buộc, format YYYY-MM-DD, không quá khứ (trừ ADMIN) |
  | endDt | Bắt buộc, format YYYY-MM-DD, >= startDt |
  | rsn | Bắt buộc, 1-500 ký tự |
- **Response**: `201 Created`
- **Lỗi**:
  - `400`: "Ngày bắt đầu phải từ hôm nay trở đi."
  - `400`: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu."
  - `400`: "Đã có yêu cầu nghỉ phép trùng ngày."
  - `400`: "Số phép năm còn lại không đủ. Còn N ngày, yêu cầu M ngày."
  - `400`: "Loại nghỉ phép không tồn tại hoặc đã ngừng sử dụng."

#### 4.7 PATCH /api/leave/[id]/approve
- **Mô tả**: Phê duyệt yêu cầu nghỉ phép
- **Auth**: Bearer (ADMIN)
- **Luồng xử lý**:
  1. Kiểm tra yêu cầu ở trạng thái PENDING
  2. Cập nhật: `aprvlSttsCd = APPROVED`, `aprvrId = admin's Employee`, `aprvlDt = now()`
- **Response**: `200 OK`
- **Lỗi**: `400`: "Chỉ có thể phê duyệt yêu cầu đang chờ duyệt."

#### 4.8 PATCH /api/leave/[id]/reject
- **Mô tả**: Từ chối yêu cầu nghỉ phép
- **Auth**: Bearer (ADMIN)
- **Body**: `{ reason?: string }` (lý do từ chối, tùy chọn)
- **Luồng xử lý**:
  1. Kiểm tra yêu cầu ở trạng thái PENDING
  2. Cập nhật: `aprvlSttsCd = REJECTED`, `aprvrId`, `aprvlDt = now()`
- **Response**: `200 OK`

#### 4.9 PATCH /api/leave/[id]/cancel
- **Mô tả**: Hủy yêu cầu nghỉ phép (nhân viên tự hủy)
- **Auth**: Bearer (USER hoặc ADMIN)
- **Luồng xử lý**:
  1. Kiểm tra yêu cầu ở trạng thái PENDING
  2. Kiểm tra người hủy là chính nhân viên tạo yêu cầu (hoặc ADMIN)
  3. Cập nhật: `aprvlSttsCd = CANCELLED`
- **Response**: `200 OK`
- **Lỗi**: `400`: "Chỉ có thể hủy yêu cầu đang chờ duyệt."

#### 4.10 GET /api/leave/balance
- **Mô tả**: Xem số phép còn lại theo từng loại
- **Auth**: Bearer (USER hoặc ADMIN)
- **Query params**:
  | Param | Kiểu | Mặc định | Mô tả |
  |-------|------|---------|-------|
  | emplId | string | — | ID nhân viên (ADMIN), tự lấy (USER) |
  | year | number | năm hiện tại | Năm |
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "year": 2026,
      "emplNo": "NV-0001",
      "emplNm": "Nguyễn Văn An",
      "balances": [
        {
          "lvTypeCd": "ANNUAL",
          "lvTypeNm": "Nghỉ phép năm",
          "maxDays": 12,
          "usedDays": 3.0,
          "pendingDays": 2.0,
          "remainingDays": 7.0
        },
        {
          "lvTypeCd": "SICK",
          "lvTypeNm": "Nghỉ ốm",
          "maxDays": 30,
          "usedDays": 1.0,
          "pendingDays": 0,
          "remainingDays": 29.0
        }
      ]
    }
  }
  ```

#### 4.11 GET /api/leave/stats
- **Mô tả**: Thống kê nghỉ phép (cho dashboard)
- **Auth**: Bearer (USER hoặc ADMIN)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "onLeaveToday": 2,
      "pendingRequests": 5,
      "approvedThisMonth": 8,
      "upcomingLeaves": [
        {
          "emplNm": "Trần Thị Bình",
          "lvTypeNm": "Nghỉ phép năm",
          "startDt": "2026-03-25",
          "endDt": "2026-03-26",
          "lvDays": 2.0
        }
      ]
    }
  }
  ```

---

## 5. Luồng nghiệp vụ

### 5.1 Tạo yêu cầu nghỉ phép

```
Client                          Server                         Database
  │                               │                               │
  │  POST /api/leave              │                               │
  │  {lvTypeCd, startDt,         │                               │
  │   endDt, rsn}                │                               │
  │──────────────────────────────>│                               │
  │                               │  Validate input (zod)         │
  │                               │  Lấy Employee từ JWT          │
  │                               │──────────────────────────────>│
  │                               │  Kiểm tra loại nghỉ tồn tại  │
  │                               │──────────────────────────────>│
  │                               │  Tính lvDays (trừ T7, CN)    │
  │                               │  Kiểm tra không trùng ngày    │
  │                               │──────────────────────────────>│
  │                               │  Kiểm tra số phép còn lại     │
  │                               │  (APPROVED + PENDING < max)  │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  INSERT TB_LV_REQ             │
  │                               │  aprvlSttsCd = 'PENDING'     │
  │                               │──────────────────────────────>│
  │  201 Created                  │                               │
  │<──────────────────────────────│                               │
```

### 5.2 Phê duyệt yêu cầu

```
Client                          Server                         Database
  │                               │                               │
  │  PATCH /api/leave/[id]/       │                               │
  │        approve                │                               │
  │──────────────────────────────>│                               │
  │                               │  Kiểm tra quyền ADMIN         │
  │                               │  Tìm yêu cầu                  │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  Kiểm tra status = PENDING    │
  │                               │  Lấy Employee của ADMIN       │
  │                               │──────────────────────────────>│
  │                               │  UPDATE TB_LV_REQ             │
  │                               │  SET APRVL_STTS_CD='APPROVED' │
  │                               │      APRVR_ID = admin.emplId  │
  │                               │      APRVL_DT = now()         │
  │                               │──────────────────────────────>│
  │  200 OK                       │                               │
  │<──────────────────────────────│                               │
```

### 5.3 Tính số ngày nghỉ

```typescript
function calculateLeaveDays(startDt: Date, endDt: Date): number {
  let days = 0;
  const current = new Date(startDt);

  while (current <= endDt) {
    const dayOfWeek = current.getDay();
    // Bỏ qua Thứ 7 (6) và Chủ nhật (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}
```

---

## 6. Màn hình

### 6.1 Trang Nghỉ phép (Admin)

| Thuộc tính | Giá trị |
|-----------|---------|
| Đường dẫn | `/leave` |
| Quyền | ADMIN (quản lý), USER (xem của mình) |
| Layout | Tabs: Yêu cầu nghỉ phép | Loại nghỉ phép |

**Tab Yêu cầu nghỉ phép**:
- Thẻ thống kê: Chờ duyệt | Đã duyệt tháng này | Nghỉ hôm nay | Sắp nghỉ
- Bộ lọc: Trạng thái (dropdown) | Loại nghỉ (dropdown) | Phòng ban (dropdown) | Năm (dropdown)
- Bảng: Mã NV | Họ tên | Loại | Từ ngày | Đến ngày | Số ngày | Lý do | Trạng thái | Hành động
- Badge: PENDING (vàng), APPROVED (xanh), REJECTED (đỏ), CANCELLED (xám)
- Hành động: Duyệt | Từ chối (chỉ hiện khi PENDING)

**Tab Loại nghỉ phép** (chỉ ADMIN):
- Bảng: Mã | Tên loại | Số ngày tối đa | Trạng thái | Hành động (Sửa/Xóa)
- Nút "Thêm loại nghỉ"

### 6.2 Tab Nghỉ phép trong Chi tiết NV

| Thuộc tính | Giá trị |
|-----------|---------|
| Vị trí | Tab thứ 4 trong `/employees/[id]` |
| Quyền | USER + ADMIN (xem) |

**Nội dung**:
- Thẻ số phép còn lại (theo từng loại nghỉ): Dạng progress bar cho từng loại
- Nút "Tạo yêu cầu nghỉ phép" (cho chính NV hoặc ADMIN tạo hộ)
- Lịch sử yêu cầu nghỉ phép: Bảng với loại | Từ-Đến | Số ngày | Trạng thái | Ngày tạo

### 6.3 Dialog Tạo yêu cầu nghỉ phép

| Thuộc tính | Giá trị |
|-----------|---------|
| Hiển thị | Dialog (modal) |
| Quyền | USER + ADMIN |

**Các trường form**:
| Trường | Kiểu | Bắt buộc | Ghi chú |
|--------|------|---------|---------|
| Nhân viên | — | — | Tự điền (USER) hoặc select (ADMIN tạo hộ) |
| Loại nghỉ | Select | Có | Chỉ hiển thị loại đang hoạt động |
| Ngày bắt đầu | Date picker | Có | Từ hôm nay trở đi |
| Ngày kết thúc | Date picker | Có | >= ngày bắt đầu |
| Số ngày | — | — | Tự tính (hiển thị, không nhập) |
| Phép còn lại | — | — | Hiển thị info: "Còn N ngày" |
| Lý do | Textarea | Có | 1-500 ký tự |

### 6.4 Dialog Quản lý loại nghỉ phép

| Thuộc tính | Giá trị |
|-----------|---------|
| Hiển thị | Dialog (modal) |
| Quyền | ADMIN |

**Các trường form**:
| Trường | Kiểu | Bắt buộc | Ghi chú |
|--------|------|---------|---------|
| Mã loại | Text input | Có | Chữ hoa + gạch dưới, disabled khi sửa |
| Tên loại | Text input | Có | 1-50 ký tự |
| Số ngày tối đa | Number input | Không | Bỏ trống = không giới hạn |
| Trạng thái | Switch | Có | Đang dùng / Ngừng dùng |

---

## 7. Validation Schema (Zod)

```typescript
// src/lib/validations/leave.schema.ts

import { z } from 'zod';

export const approvalStatusEnum = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

// === Leave Type ===

export const createLeaveTypeSchema = z.object({
  lvTypeCd: z.string()
    .min(1, 'Mã loại nghỉ không được trống')
    .max(20, 'Mã loại nghỉ tối đa 20 ký tự')
    .regex(/^[A-Z_]+$/, 'Mã loại nghỉ chỉ chứa chữ hoa và dấu gạch dưới'),
  lvTypeNm: z.string()
    .min(1, 'Tên loại nghỉ không được trống')
    .max(50, 'Tên loại nghỉ tối đa 50 ký tự'),
  maxDays: z.number()
    .int('Số ngày phải là số nguyên')
    .positive('Số ngày phải lớn hơn 0')
    .optional()
    .nullable(),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema
  .omit({ lvTypeCd: true })
  .extend({ useYn: z.enum(['Y', 'N']).optional() })
  .partial();

// === Leave Request ===

export const createLeaveRequestSchema = z.object({
  emplId: z.string().uuid('ID nhân viên không hợp lệ').optional(),
  lvTypeCd: z.string().min(1, 'Loại nghỉ phép không được trống'),
  startDt: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Ngày bắt đầu phải có format YYYY-MM-DD'
  ),
  endDt: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Ngày kết thúc phải có format YYYY-MM-DD'
  ),
  rsn: z.string()
    .min(1, 'Lý do không được trống')
    .max(500, 'Lý do tối đa 500 ký tự'),
}).refine(
  (data) => new Date(data.endDt) >= new Date(data.startDt),
  { message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu', path: ['endDt'] }
);

export const leaveQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  emplId: z.string().uuid().optional(),
  deptId: z.string().uuid().optional(),
  status: approvalStatusEnum.optional(),
  lvTypeCd: z.string().optional(),
  year: z.coerce.number().min(2020).max(2100).optional(),
  sortBy: z.enum(['creatDt', 'startDt', 'lvDays']).default('creatDt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const rejectLeaveSchema = z.object({
  reason: z.string().max(500).optional(),
});
```

---

## 8. Quy tắc nghiệp vụ

### Kiểm tra số phép còn lại
```typescript
async function checkLeaveBalance(
  emplId: string,
  lvTypeCd: string,
  requestedDays: number,
  year: number
): Promise<{ available: boolean; remaining: number }> {
  const leaveType = await prisma.leaveType.findUnique({
    where: { lvTypeCd },
  });

  // Nếu không giới hạn (maxDays = null) → luôn cho phép
  if (!leaveType?.maxDays) {
    return { available: true, remaining: Infinity };
  }

  // Tổng ngày đã dùng (APPROVED) + đang chờ (PENDING)
  const used = await prisma.leaveRequest.aggregate({
    where: {
      emplId,
      lvTypeCd,
      aprvlSttsCd: { in: ['APPROVED', 'PENDING'] },
      startDt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    _sum: { lvDays: true },
  });

  const usedDays = Number(used._sum.lvDays || 0);
  const remaining = leaveType.maxDays - usedDays;

  return {
    available: remaining >= requestedDays,
    remaining,
  };
}
```

### Kiểm tra trùng ngày
```typescript
async function checkOverlap(
  emplId: string,
  startDt: Date,
  endDt: Date,
  excludeId?: string
): Promise<boolean> {
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      emplId,
      aprvlSttsCd: { in: ['APPROVED', 'PENDING'] },
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        { startDt: { lte: endDt }, endDt: { gte: startDt } },
      ],
    },
  });

  return !!overlap;
}
```

---

## 9. Cấu trúc thư mục

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── leave/
│   │       └── page.tsx              # Trang nghỉ phép
│   └── api/
│       ├── leave/
│       │   ├── route.ts              # GET (danh sách), POST (tạo yêu cầu)
│       │   ├── balance/
│       │   │   └── route.ts         # GET (số phép còn lại)
│       │   ├── stats/
│       │   │   └── route.ts         # GET (thống kê dashboard)
│       │   └── [id]/
│       │       ├── route.ts         # GET (chi tiết)
│       │       ├── approve/
│       │       │   └── route.ts     # PATCH (phê duyệt)
│       │       ├── reject/
│       │       │   └── route.ts     # PATCH (từ chối)
│       │       └── cancel/
│       │           └── route.ts     # PATCH (hủy)
│       └── leave-types/
│           ├── route.ts              # GET (danh sách), POST (tạo)
│           └── [cd]/
│               └── route.ts         # PATCH (sửa), DELETE (xóa)
├── lib/
│   └── validations/
│       └── leave.schema.ts           # Zod validation
└── components/
    └── leave/
        ├── leave-request-table.tsx    # Bảng yêu cầu nghỉ phép
        ├── leave-request-dialog.tsx   # Dialog tạo yêu cầu
        ├── leave-type-table.tsx       # Bảng loại nghỉ phép
        ├── leave-type-dialog.tsx      # Dialog tạo/sửa loại
        ├── leave-balance-card.tsx     # Thẻ số phép còn lại
        ├── leave-stats.tsx            # Thẻ thống kê
        └── leave-employee-tab.tsx     # Tab nghỉ phép trong chi tiết NV
```

---

## 10. Thứ tự triển khai

### Phase 1: API Backend — Loại nghỉ phép
- [ ] Tạo Zod validation schema (`leave.schema.ts`)
- [ ] API GET /api/leave-types
- [ ] API POST /api/leave-types (ADMIN)
- [ ] API PATCH /api/leave-types/[cd] (ADMIN)
- [ ] API DELETE /api/leave-types/[cd] (ADMIN)
- [ ] Seed dữ liệu loại nghỉ phép mặc định (7 loại)

### Phase 2: API Backend — Yêu cầu nghỉ phép
- [ ] API POST /api/leave (tạo yêu cầu + tính ngày + kiểm tra phép)
- [ ] API GET /api/leave (danh sách, lọc, phân trang)
- [ ] API PATCH /api/leave/[id]/approve (phê duyệt)
- [ ] API PATCH /api/leave/[id]/reject (từ chối)
- [ ] API PATCH /api/leave/[id]/cancel (hủy)
- [ ] API GET /api/leave/balance (số phép còn lại)
- [ ] API GET /api/leave/stats (thống kê dashboard)
- [ ] Unit test cho validation + tính ngày + kiểm tra phép
- [ ] Integration test cho API

### Phase 3: Giao diện
- [ ] Trang nghỉ phép (`/leave`) — Tab yêu cầu + Tab loại nghỉ
- [ ] Component bảng yêu cầu (lọc trạng thái, loại, phòng ban, năm)
- [ ] Component thẻ thống kê
- [ ] Dialog tạo yêu cầu nghỉ phép (tính ngày tự động, hiển thị phép còn lại)
- [ ] Component quản lý loại nghỉ phép (ADMIN)
- [ ] Tab Nghỉ phép trong chi tiết NV (`/employees/[id]`)
- [ ] Cập nhật sidebar active state cho `/leave`

### Phase 4: Tích hợp & Seed Data
- [ ] Seed yêu cầu nghỉ phép mẫu (5-10 yêu cầu đa trạng thái)
- [ ] Cập nhật dashboard: thêm card "Yêu cầu chờ duyệt", "Nghỉ phép hôm nay"
- [ ] Kiểm thử tích hợp toàn bộ flow

---

## Tài liệu tham chiếu

- `docs/database/database-design.md` — Thiết kế DB chi tiết (SSoT)
- `docs/blueprints/001-auth/blueprint.md` — Blueprint Auth (xác thực, liên kết User ↔ Employee)
- `docs/blueprints/003-employee/blueprint.md` — Blueprint Employee (phụ thuộc)
- `docs/blueprints/004-attendance/blueprint.md` — Blueprint Chấm công (sprint cùng đợt)
- `prisma/schema.prisma` — Prisma schema (model LeaveRequest, LeaveType đã định nghĩa)
