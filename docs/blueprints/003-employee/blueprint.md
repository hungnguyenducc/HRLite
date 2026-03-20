# Blueprint 003: Module Quản lý Nhân viên (Employee)

> Tài liệu thiết kế chi tiết cho module quản lý nhân viên — HRLite

## 1. Tổng quan

Module Employee là module nghiệp vụ trung tâm của hệ thống HRLite, quản lý toàn bộ hồ sơ nhân viên và là nền tảng cho các module Chấm công, Nghỉ phép, Báo cáo.

### Đặc điểm chính
- **Hồ sơ nhân viên đầy đủ**: Thông tin cá nhân, chức vụ, phòng ban, trạng thái
- **Liên kết User ↔ Employee**: Gắn tài khoản đăng nhập (TB_COMM_USER) với hồ sơ nhân viên (TB_EMPL)
- **Quản lý vòng đời**: Theo dõi từ ngày vào làm đến nghỉ việc
- **Mã nhân viên tự động**: Sinh mã NV theo format cấu hình (VD: NV-0001)
- **Tìm kiếm nâng cao**: Lọc theo nhiều tiêu chí

### Phạm vi
- CRUD nhân viên (tạo, xem danh sách, xem chi tiết, sửa, xóa mềm)
- Liên kết/hủy liên kết tài khoản User với Employee
- Phân bổ nhân viên vào phòng ban
- Tìm kiếm và lọc nâng cao (theo tên, mã, phòng ban, trạng thái, chức vụ)
- Xuất danh sách (CSV) — giai đoạn sau
- Quản lý trạng thái nhân viên (WORKING, ON_LEAVE, RESIGNED)

### Phụ thuộc
- **Module Auth (001)**: Xác thực JWT, phân quyền, liên kết User
- **Module Department (002)**: Phân bổ phòng ban (DEPT_ID → TB_DEPT)

---

## 2. Kiến trúc

```
┌──────────────────────────────────────────────────────────┐
│                     Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ Danh sách NV │  │ Chi tiết NV  │  │ Form Tạo/Sửa │   │
│  │ (Table)      │  │ (Profile)    │  │ NV (Dialog)   │   │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘   │
│         └──────────────────┼──────────────────┘           │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────┐
│               Next.js 15 (App Router)                     │
│                            │                              │
│  ┌─────────────────────────┼─────────────────────┐        │
│  │         API Routes (/api/employees/*)          │        │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐ │        │
│  │  │ CRUD     │ │ Search/  │ │ Link User/     │ │        │
│  │  │ Cơ bản   │ │ Filter   │ │ Dept/Status    │ │        │
│  │  └────┬─────┘ └────┬─────┘ └────────┬───────┘ │        │
│  └───────┼─────────────┼───────────────┼──────────┘        │
│          │             │               │                  │
│  ┌───────┼─────────────┼───────────────┼──────────┐        │
│  │       │     Auth Middleware (JWT + ADMIN)       │        │
│  └───────┼─────────────┼───────────────┼──────────┘        │
│          │             │               │                  │
│  ┌───────┴─────────────┴───────────────┴──────────┐        │
│  │           Prisma ORM (Service Layer)            │        │
│  └──────────────────────┬─────────────────────────┘        │
└─────────────────────────┼──────────────────────────────────┘
                          │
                  ┌───────┴───────┐
                  │ PostgreSQL 16 │
                  │   TB_EMPL     │
                  └───────────────┘
```

---

## 3. Database Schema

> Chi tiết đầy đủ tại `docs/database/database-design.md` — Module 001.

### TB_EMPL (Nhân viên)

| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| EMPL_ID | UUID | ID nhân viên | PK, DEFAULT gen_random_uuid() |
| EMPL_NO | VARCHAR(20) | Mã nhân viên | UNIQUE, NOT NULL |
| EMPL_NM | VARCHAR(100) | Tên nhân viên | NOT NULL |
| EMAIL | VARCHAR(255) | Email | UNIQUE, NOT NULL |
| PHONE_NO | VARCHAR(20) | Số điện thoại | |
| DEPT_ID | UUID | ID phòng ban | FK → TB_DEPT |
| POSI_NM | VARCHAR(50) | Chức vụ | |
| JOIN_DT | DATE | Ngày vào làm | NOT NULL |
| RESIGN_DT | DATE | Ngày nghỉ việc | |
| EMPL_STTS_CD | VARCHAR(20) | Mã trạng thái | NOT NULL |
| USER_ID | UUID | ID tài khoản đăng nhập | FK → TB_COMM_USER, UNIQUE |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL, DEFAULT NOW() |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật | |
| UPDT_BY | VARCHAR(100) | Người cập nhật | |
| DEL_YN | CHAR(1) | Đã xóa | DEFAULT 'N' |

### Mã trạng thái nhân viên (EMPL_STTS_CD)

| Mã | Ý nghĩa | Mô tả |
|----|---------|-------|
| WORKING | Đang làm việc | Trạng thái mặc định khi tạo |
| ON_LEAVE | Tạm nghỉ | Nghỉ không lương dài hạn, nghỉ thai sản |
| RESIGNED | Đã nghỉ việc | Đã chấm dứt hợp đồng |

### Quan hệ
- **TB_COMM_USER** (1:1): Một nhân viên liên kết với tối đa một tài khoản
- **TB_DEPT** (N:1): Nhiều nhân viên thuộc một phòng ban
- **TH_ATND** (1:N): Một nhân viên có nhiều bản ghi chấm công
- **TB_LV_REQ** (1:N): Một nhân viên tạo nhiều yêu cầu nghỉ phép

---

## 4. Thiết kế API

> Tất cả endpoint yêu cầu **xác thực JWT**. Các thao tác CUD yêu cầu quyền **ADMIN**.

### 4.1 GET /api/employees
- **Mô tả**: Lấy danh sách nhân viên (phân trang, tìm kiếm, lọc)
- **Auth**: Bearer (USER hoặc ADMIN)
- **Query params**:
  | Param | Kiểu | Mặc định | Mô tả |
  |-------|------|---------|-------|
  | page | number | 1 | Trang hiện tại |
  | limit | number | 20 | Số bản ghi/trang |
  | search | string | — | Tìm theo tên, mã NV, email |
  | deptId | string | — | Lọc theo phòng ban |
  | status | string | — | Lọc theo trạng thái (WORKING, ON_LEAVE, RESIGNED) |
  | position | string | — | Lọc theo chức vụ |
  | sortBy | string | creatDt | Cột sắp xếp (emplNo, emplNm, joinDt, creatDt) |
  | sortOrder | string | desc | Thứ tự (asc, desc) |
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "uuid",
          "emplNo": "NV-0001",
          "emplNm": "Nguyễn Văn A",
          "email": "a.nguyen@company.com",
          "phoneNo": "0901234567",
          "deptId": "uuid",
          "deptNm": "Phòng Kỹ thuật",
          "posiNm": "Senior Developer",
          "joinDt": "2024-01-15",
          "emplSttsCd": "WORKING",
          "hasUser": true
        }
      ],
      "total": 50,
      "page": 1,
      "limit": 20
    }
  }
  ```

### 4.2 GET /api/employees/[id]
- **Mô tả**: Lấy chi tiết nhân viên
- **Auth**: Bearer (USER hoặc ADMIN)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "emplNo": "NV-0001",
      "emplNm": "Nguyễn Văn A",
      "email": "a.nguyen@company.com",
      "phoneNo": "0901234567",
      "department": {
        "id": "uuid",
        "deptCd": "DEPT-TECH",
        "deptNm": "Phòng Kỹ thuật"
      },
      "posiNm": "Senior Developer",
      "joinDt": "2024-01-15",
      "resignDt": null,
      "emplSttsCd": "WORKING",
      "user": {
        "id": "uuid",
        "email": "a.nguyen@company.com",
        "roleCd": "USER"
      },
      "creatDt": "...",
      "creatBy": "admin",
      "updtDt": "...",
      "updtBy": "admin"
    }
  }
  ```

### 4.3 POST /api/employees
- **Mô tả**: Tạo nhân viên mới
- **Auth**: Bearer (ADMIN)
- **Body**:
  ```json
  {
    "emplNm": "Nguyễn Văn A",
    "email": "a.nguyen@company.com",
    "phoneNo": "0901234567",
    "deptId": "uuid-dept",
    "posiNm": "Developer",
    "joinDt": "2024-01-15",
    "emplSttsCd": "WORKING",
    "userId": "uuid-user"
  }
  ```
- **Xử lý đặc biệt**:
  - `emplNo` được **tự động sinh** theo format: `NV-{NNNN}` (VD: NV-0001, NV-0002)
  - Server tìm mã NV lớn nhất hiện tại và tăng thêm 1
- **Validation**:
  | Trường | Quy tắc |
  |--------|---------|
  | emplNm | Bắt buộc, 1-100 ký tự |
  | email | Bắt buộc, email hợp lệ, unique |
  | phoneNo | Tùy chọn, 10-20 ký tự, chỉ số và dấu + |
  | deptId | Tùy chọn, UUID hợp lệ, phải tồn tại trong TB_DEPT |
  | posiNm | Tùy chọn, 1-50 ký tự |
  | joinDt | Bắt buộc, ngày hợp lệ (ISO 8601) |
  | emplSttsCd | Bắt buộc, một trong: WORKING, ON_LEAVE, RESIGNED |
  | userId | Tùy chọn, UUID hợp lệ, phải tồn tại và chưa liên kết NV khác |
- **Response**: `201 Created`
- **Lỗi**: `409 Conflict` nếu email đã tồn tại

### 4.4 PATCH /api/employees/[id]
- **Mô tả**: Cập nhật thông tin nhân viên
- **Auth**: Bearer (ADMIN)
- **Body**: Các trường cần cập nhật (partial update)
- **Xử lý đặc biệt**:
  - Khi chuyển `emplSttsCd` → `RESIGNED`: tự động điền `resignDt` = ngày hiện tại (nếu chưa có)
  - Khi thay đổi `userId`: kiểm tra User chưa liên kết NV khác
- **Response**: `200 OK`

### 4.5 DELETE /api/employees/[id]
- **Mô tả**: Xóa mềm nhân viên (DEL_YN = 'Y')
- **Auth**: Bearer (ADMIN)
- **Xử lý đặc biệt**:
  - Hủy liên kết User (đặt USER_ID = null)
  - Nếu nhân viên là trưởng phòng → đặt DEPT_HEAD_ID = null ở TB_DEPT tương ứng
- **Response**: `200 OK`

### 4.6 PATCH /api/employees/[id]/link-user
- **Mô tả**: Liên kết/hủy liên kết tài khoản User với nhân viên
- **Auth**: Bearer (ADMIN)
- **Body**:
  ```json
  {
    "userId": "uuid-user"   // hoặc null để hủy liên kết
  }
  ```
- **Validation**:
  - User phải tồn tại và chưa liên kết NV khác
  - Null để hủy liên kết
- **Response**: `200 OK`

### 4.7 GET /api/employees/stats
- **Mô tả**: Thống kê nhân viên (cho dashboard)
- **Auth**: Bearer (USER hoặc ADMIN)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "total": 50,
      "working": 45,
      "onLeave": 3,
      "resigned": 2,
      "newThisMonth": 5,
      "byDepartment": [
        { "deptNm": "Phòng Kỹ thuật", "count": 20 },
        { "deptNm": "Phòng Nhân sự", "count": 10 }
      ]
    }
  }
  ```

---

## 5. Luồng nghiệp vụ

### 5.1 Tạo nhân viên mới

```
Client                          Server                         Database
  │                               │                               │
  │  POST /api/employees          │                               │
  │  {emplNm, email, deptId, ..}  │                               │
  │──────────────────────────────>│                               │
  │                               │  Validate input (zod)         │
  │                               │  Kiểm tra quyền ADMIN         │
  │                               │  Kiểm tra email unique        │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  Kiểm tra deptId tồn tại      │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  Sinh mã NV tự động           │
  │                               │  SELECT MAX(EMPL_NO)          │
  │                               │──────────────────────────────>│
  │                               │<── "NV-0042" ────────────────│
  │                               │  emplNo = "NV-0043"           │
  │                               │  INSERT TB_EMPL               │
  │                               │──────────────────────────────>│
  │  201 Created                  │                               │
  │  {emplNo: "NV-0043", ...}    │                               │
  │<──────────────────────────────│                               │
```

### 5.2 Liên kết User ↔ Employee

```
Client                          Server                         Database
  │                               │                               │
  │  PATCH /employees/[id]/       │                               │
  │        link-user              │                               │
  │  {userId: "uuid-user"}        │                               │
  │──────────────────────────────>│                               │
  │                               │  Kiểm tra Employee tồn tại    │
  │                               │──────────────────────────────>│
  │                               │  Kiểm tra User tồn tại        │
  │                               │──────────────────────────────>│
  │                               │  Kiểm tra User chưa liên kết  │
  │                               │  NV khác                      │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  UPDATE TB_EMPL               │
  │                               │  SET USER_ID = uuid-user      │
  │                               │──────────────────────────────>│
  │  200 OK                       │                               │
  │<──────────────────────────────│                               │
```

### 5.3 Nhân viên nghỉ việc

```
Client                          Server                         Database
  │                               │                               │
  │  PATCH /api/employees/[id]    │                               │
  │  {emplSttsCd: "RESIGNED"}    │                               │
  │──────────────────────────────>│                               │
  │                               │  Kiểm tra quyền ADMIN         │
  │                               │  Phát hiện chuyển sang         │
  │                               │  RESIGNED → tự điền resignDt  │
  │                               │                               │
  │                               │  Nếu NV là trưởng PB:         │
  │                               │  UPDATE TB_DEPT               │
  │                               │  SET DEPT_HEAD_ID = null       │
  │                               │──────────────────────────────>│
  │                               │                               │
  │                               │  UPDATE TB_EMPL               │
  │                               │  SET EMPL_STTS_CD, RESIGN_DT  │
  │                               │──────────────────────────────>│
  │  200 OK                       │                               │
  │<──────────────────────────────│                               │
```

---

## 6. Màn hình

### 6.1 Danh sách nhân viên

| Thuộc tính | Giá trị |
|-----------|---------|
| Đường dẫn | `/admin/employees` |
| Quyền | ADMIN |
| Layout | Bảng dữ liệu với phân trang, tìm kiếm, lọc |

**Các thành phần UI**:
- Thanh tìm kiếm (theo tên, mã NV, email)
- Bộ lọc: Phòng ban (dropdown) | Trạng thái (dropdown) | Chức vụ (dropdown)
- Thống kê nhanh ở đầu trang: Tổng NV | Đang làm | Tạm nghỉ | Đã nghỉ
- Nút "Thêm nhân viên" → mở dialog tạo mới
- Bảng hiển thị: Mã NV | Tên NV | Email | Phòng ban | Chức vụ | Ngày vào | Trạng thái | Hành động
- Hành động mỗi dòng: Xem | Sửa | Xóa
- Badge trạng thái có màu: WORKING (xanh), ON_LEAVE (vàng), RESIGNED (đỏ)

### 6.2 Chi tiết nhân viên

| Thuộc tính | Giá trị |
|-----------|---------|
| Đường dẫn | `/admin/employees/[id]` |
| Quyền | ADMIN |
| Layout | Trang chi tiết dạng card |

**Các tab**:
| Tab | Nội dung |
|-----|---------|
| Thông tin chung | Họ tên, mã NV, email, SĐT, phòng ban, chức vụ, ngày vào/nghỉ, trạng thái |
| Tài khoản | Liên kết User (email, vai trò), nút Liên kết/Hủy liên kết |
| Chấm công | Lịch sử chấm công gần đây (chỉ xem, triển khai ở Sprint sau) |
| Nghỉ phép | Lịch sử nghỉ phép gần đây (chỉ xem, triển khai ở Sprint sau) |

### 6.3 Dialog Tạo/Sửa nhân viên

| Thuộc tính | Giá trị |
|-----------|---------|
| Hiển thị | Dialog (modal) |
| Quyền | ADMIN |

**Các trường form**:
| Trường | Kiểu | Bắt buộc | Ghi chú |
|--------|------|---------|---------|
| Mã nhân viên | — | — | Tự động sinh, không hiển thị trong form |
| Họ tên | Text input | Có | |
| Email | Email input | Có | Unique |
| Số điện thoại | Tel input | Không | |
| Phòng ban | Select (dropdown) | Không | Danh sách PB đang hoạt động |
| Chức vụ | Text input | Không | |
| Ngày vào làm | Date picker | Có | |
| Trạng thái | Select | Có | WORKING / ON_LEAVE / RESIGNED |
| Tài khoản | Select (search) | Không | Chỉ hiển thị User chưa liên kết |

---

## 7. Validation Schema (Zod)

```typescript
// src/lib/validations/employee.schema.ts

import { z } from 'zod';

export const employeeStatusEnum = z.enum(['WORKING', 'ON_LEAVE', 'RESIGNED']);

export const createEmployeeSchema = z.object({
  emplNm: z.string()
    .min(1, 'Họ tên không được trống')
    .max(100, 'Họ tên tối đa 100 ký tự'),
  email: z.string()
    .email('Email không hợp lệ')
    .max(255, 'Email tối đa 255 ký tự'),
  phoneNo: z.string()
    .regex(/^[0-9+]+$/, 'Số điện thoại chỉ chứa số và dấu +')
    .min(10, 'Số điện thoại tối thiểu 10 ký tự')
    .max(20, 'Số điện thoại tối đa 20 ký tự')
    .optional()
    .nullable(),
  deptId: z.string().uuid('ID phòng ban không hợp lệ').optional().nullable(),
  posiNm: z.string()
    .max(50, 'Chức vụ tối đa 50 ký tự')
    .optional()
    .nullable(),
  joinDt: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vào làm phải có format YYYY-MM-DD'),
  emplSttsCd: employeeStatusEnum.default('WORKING'),
  userId: z.string().uuid().optional().nullable(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const linkUserSchema = z.object({
  userId: z.string().uuid().nullable(),
});
```

---

## 8. Sinh mã nhân viên tự động

### Thuật toán

```typescript
// Logic sinh mã nhân viên
async function generateEmployeeNo(): Promise<string> {
  const prefix = 'NV-';

  // Tìm mã NV lớn nhất hiện tại
  const lastEmployee = await prisma.employee.findFirst({
    where: { emplNo: { startsWith: prefix } },
    orderBy: { emplNo: 'desc' },
    select: { emplNo: true },
  });

  if (!lastEmployee) {
    return `${prefix}0001`;
  }

  // Trích xuất số và tăng thêm 1
  const lastNumber = parseInt(lastEmployee.emplNo.replace(prefix, ''), 10);
  const nextNumber = lastNumber + 1;

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}
```

### Ví dụ
| Mã hiện tại lớn nhất | Mã tiếp theo |
|----------------------|-------------|
| (chưa có) | NV-0001 |
| NV-0042 | NV-0043 |
| NV-9999 | NV-10000 |

---

## 9. Cấu trúc thư mục

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── employees/
│   │           ├── page.tsx              # Danh sách nhân viên
│   │           └── [id]/
│   │               └── page.tsx          # Chi tiết nhân viên
│   └── api/
│       └── employees/
│           ├── route.ts                  # GET (danh sách), POST (tạo)
│           ├── stats/
│           │   └── route.ts             # GET (thống kê)
│           └── [id]/
│               ├── route.ts             # GET (chi tiết), PATCH (sửa), DELETE (xóa)
│               └── link-user/
│                   └── route.ts         # PATCH (liên kết User)
├── lib/
│   └── validations/
│       └── employee.schema.ts            # Zod validation
├── components/
│   └── employees/
│       ├── employee-table.tsx            # Bảng danh sách + lọc
│       ├── employee-detail.tsx           # Trang chi tiết (tabs)
│       ├── employee-form-dialog.tsx      # Dialog tạo/sửa
│       ├── employee-delete-dialog.tsx    # Dialog xác nhận xóa
│       ├── employee-stats.tsx            # Thẻ thống kê nhanh
│       └── employee-link-user.tsx        # Component liên kết User
└── tests/
    ├── unit/
    │   └── employee-validation.test.ts
    └── integration/
        └── employees-api.test.ts
```

---

## 10. Thứ tự triển khai

> **Lưu ý**: Module Department (002) phải triển khai trước hoặc song song vì Employee phụ thuộc vào Department.

### Phase 1: API Backend
- [ ] Tạo Zod validation schema (`employee.schema.ts`)
- [ ] Logic sinh mã nhân viên tự động
- [ ] API GET /api/employees (danh sách, tìm kiếm, lọc, phân trang)
- [ ] API GET /api/employees/[id] (chi tiết)
- [ ] API POST /api/employees (tạo mới + sinh mã)
- [ ] API PATCH /api/employees/[id] (cập nhật + xử lý nghỉ việc)
- [ ] API DELETE /api/employees/[id] (xóa mềm + dọn dẹp)
- [ ] API PATCH /api/employees/[id]/link-user (liên kết User)
- [ ] API GET /api/employees/stats (thống kê)
- [ ] Unit test cho validation + sinh mã
- [ ] Integration test cho API

### Phase 2: Giao diện
- [ ] Trang danh sách nhân viên (`/admin/employees`)
- [ ] Component bảng danh sách (tìm kiếm, lọc đa tiêu chí, phân trang)
- [ ] Component thẻ thống kê nhanh
- [ ] Dialog tạo/sửa nhân viên
- [ ] Dialog xác nhận xóa
- [ ] Trang chi tiết nhân viên (`/admin/employees/[id]`)
- [ ] Component liên kết User
- [ ] Tích hợp sidebar navigation

### Phase 3: Tích hợp & Seed Data
- [ ] Seed nhân viên mẫu (10-15 nhân viên phân bổ trong các phòng ban)
- [ ] Cập nhật dashboard stats (thêm thống kê nhân viên)
- [ ] Liên kết admin User hiện có với Employee record
- [ ] Kiểm thử tích hợp toàn bộ flow

---

## Tài liệu tham chiếu

- `docs/database/database-design.md` — Thiết kế DB chi tiết (SSoT)
- `docs/blueprints/001-auth/blueprint.md` — Blueprint Auth (pattern tham khảo)
- `docs/blueprints/002-department/blueprint.md` — Blueprint Department (phụ thuộc)
- `prisma/schema.prisma` — Prisma schema (model Employee, Department đã định nghĩa)
