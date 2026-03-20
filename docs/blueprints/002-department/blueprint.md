# Blueprint 002: Module Quản lý Phòng ban (Department)

> Tài liệu thiết kế chi tiết cho module quản lý phòng ban — HRLite

## 1. Tổng quan

Module Department quản lý cơ cấu tổ chức của doanh nghiệp thông qua hệ thống phòng ban phân cấp (cây tổ chức).

### Đặc điểm chính
- **Cấu trúc cây**: Phòng ban có quan hệ cha-con (UPPER_DEPT_ID tự tham chiếu)
- **Trưởng phòng**: Mỗi phòng ban có thể gán một nhân viên làm trưởng phòng
- **Sắp xếp tùy chỉnh**: Thứ tự hiển thị phòng ban có thể điều chỉnh
- **Soft delete**: Xóa mềm, không mất dữ liệu

### Phạm vi
- CRUD phòng ban (tạo, xem, sửa, xóa mềm)
- Hiển thị cây tổ chức (tree view)
- Gán/thay đổi trưởng phòng
- Sắp xếp thứ tự phòng ban
- Tìm kiếm và lọc phòng ban
- Quản lý trạng thái hoạt động (USE_YN)

### Phụ thuộc
- **Module Auth (001)**: Xác thực và phân quyền ADMIN
- **Module Employee (003)**: Gán trưởng phòng (DEPT_HEAD_ID → TB_EMPL)

---

## 2. Kiến trúc

```
┌──────────────────────────────────────────────────────────┐
│                     Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ Danh sách    │  │ Cây tổ chức  │  │ Chi tiết/Form │   │
│  │ phòng ban    │  │ (Tree View)  │  │ phòng ban     │   │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘   │
│         └──────────────────┼──────────────────┘           │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────┐
│               Next.js 15 (App Router)                     │
│                            │                              │
│  ┌─────────────────────────┼─────────────────────┐        │
│  │         API Routes (/api/departments/*)        │        │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐ │        │
│  │  │ CRUD     │ │ Tree     │ │ Head/Sort/     │ │        │
│  │  │ Cơ bản   │ │ Cây TC   │ │ Trạng thái     │ │        │
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
                  │   TB_DEPT     │
                  └───────────────┘
```

---

## 3. Database Schema

> Chi tiết đầy đủ tại `docs/database/database-design.md` — Module 002.

### TB_DEPT (Phòng ban)

| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| DEPT_ID | UUID | ID phòng ban | PK, DEFAULT gen_random_uuid() |
| DEPT_CD | VARCHAR(20) | Mã phòng ban | UNIQUE, NOT NULL |
| DEPT_NM | VARCHAR(100) | Tên phòng ban | NOT NULL |
| UPPER_DEPT_ID | UUID | ID phòng ban cấp trên | FK → TB_DEPT (self-ref) |
| DEPT_HEAD_ID | UUID | ID trưởng phòng | FK → TB_EMPL |
| SORT_ORD | INT | Thứ tự sắp xếp | |
| USE_YN | CHAR(1) | Đang sử dụng | DEFAULT 'Y' |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL, DEFAULT NOW() |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật | |
| UPDT_BY | VARCHAR(100) | Người cập nhật | |
| DEL_YN | CHAR(1) | Đã xóa | DEFAULT 'N' |

### Quan hệ đặc biệt
- **Self-relation**: `UPPER_DEPT_ID` → `DEPT_ID` (cây tổ chức)
- **Cross-module**: `DEPT_HEAD_ID` → `TB_EMPL.EMPL_ID` (trưởng phòng)

### Ví dụ cây tổ chức
```
Công ty (root, UPPER_DEPT_ID = null)
├── Ban Giám đốc
├── Phòng Nhân sự
│   ├── Tổ Tuyển dụng
│   └── Tổ Đào tạo
├── Phòng Kỹ thuật
│   ├── Tổ Backend
│   └── Tổ Frontend
└── Phòng Kinh doanh
```

---

## 4. Thiết kế API

> Tất cả endpoint yêu cầu **xác thực JWT**. Các thao tác CUD yêu cầu quyền **ADMIN**.

### 4.1 GET /api/departments
- **Mô tả**: Lấy danh sách phòng ban (phẳng, có phân trang)
- **Auth**: Bearer (USER hoặc ADMIN)
- **Query params**:
  | Param | Kiểu | Mặc định | Mô tả |
  |-------|------|---------|-------|
  | page | number | 1 | Trang hiện tại |
  | limit | number | 20 | Số bản ghi/trang |
  | search | string | — | Tìm theo tên hoặc mã |
  | useYn | string | — | Lọc theo trạng thái (Y/N) |
  | parentId | string | — | Lọc theo phòng ban cha |
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "uuid",
          "deptCd": "DEPT-HR",
          "deptNm": "Phòng Nhân sự",
          "upperDeptId": "uuid-parent",
          "upperDeptNm": "Công ty",
          "deptHeadId": "uuid-head",
          "deptHeadNm": "Nguyễn Văn A",
          "sortOrd": 1,
          "useYn": "Y",
          "employeeCount": 15,
          "creatDt": "2026-03-20T10:00:00Z"
        }
      ],
      "total": 10,
      "page": 1,
      "limit": 20
    }
  }
  ```

### 4.2 GET /api/departments/tree
- **Mô tả**: Lấy cây tổ chức đầy đủ (nested structure)
- **Auth**: Bearer (USER hoặc ADMIN)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid-root",
        "deptCd": "COMPANY",
        "deptNm": "Công ty",
        "deptHeadNm": "Giám đốc",
        "employeeCount": 3,
        "children": [
          {
            "id": "uuid-hr",
            "deptCd": "DEPT-HR",
            "deptNm": "Phòng Nhân sự",
            "deptHeadNm": "Nguyễn Văn A",
            "employeeCount": 15,
            "children": [...]
          }
        ]
      }
    ]
  }
  ```

### 4.3 GET /api/departments/[id]
- **Mô tả**: Lấy chi tiết phòng ban
- **Auth**: Bearer (USER hoặc ADMIN)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "deptCd": "DEPT-HR",
      "deptNm": "Phòng Nhân sự",
      "upperDept": { "id": "uuid", "deptNm": "Công ty" },
      "deptHead": { "id": "uuid", "emplNm": "Nguyễn Văn A", "posiNm": "Trưởng phòng" },
      "childDepts": [...],
      "employees": [...],
      "employeeCount": 15,
      "sortOrd": 1,
      "useYn": "Y",
      "creatDt": "...",
      "creatBy": "..."
    }
  }
  ```

### 4.4 POST /api/departments
- **Mô tả**: Tạo phòng ban mới
- **Auth**: Bearer (ADMIN)
- **Body**:
  ```json
  {
    "deptCd": "DEPT-HR",
    "deptNm": "Phòng Nhân sự",
    "upperDeptId": "uuid-parent",
    "deptHeadId": "uuid-employee",
    "sortOrd": 1,
    "useYn": "Y"
  }
  ```
- **Validation**:
  | Trường | Quy tắc |
  |--------|---------|
  | deptCd | Bắt buộc, 1-20 ký tự, unique, chỉ chữ hoa + số + dấu gạch ngang |
  | deptNm | Bắt buộc, 1-100 ký tự |
  | upperDeptId | Tùy chọn, UUID hợp lệ, phải tồn tại trong DB |
  | deptHeadId | Tùy chọn, UUID hợp lệ, phải tồn tại trong TB_EMPL |
  | sortOrd | Tùy chọn, số nguyên ≥ 0 |
  | useYn | Tùy chọn, 'Y' hoặc 'N', mặc định 'Y' |
- **Response**: `201 Created`
- **Lỗi**: `409 Conflict` nếu mã phòng ban đã tồn tại

### 4.5 PATCH /api/departments/[id]
- **Mô tả**: Cập nhật phòng ban
- **Auth**: Bearer (ADMIN)
- **Body**: Các trường cần cập nhật (partial update)
- **Validation**:
  - Không được đặt `upperDeptId` thành chính mình (tránh vòng lặp)
  - Không được đặt `upperDeptId` thành phòng ban con của mình (tránh vòng lặp)
- **Response**: `200 OK`
- **Lỗi**: `400 Bad Request` nếu tạo vòng lặp trong cây tổ chức

### 4.6 DELETE /api/departments/[id]
- **Mô tả**: Xóa mềm phòng ban (DEL_YN = 'Y')
- **Auth**: Bearer (ADMIN)
- **Validation**:
  - Không được xóa phòng ban đang có nhân viên (phải chuyển nhân viên trước)
  - Không được xóa phòng ban đang có phòng ban con
- **Response**: `200 OK`
- **Lỗi**: `409 Conflict` nếu còn nhân viên hoặc phòng ban con

### 4.7 PATCH /api/departments/sort
- **Mô tả**: Cập nhật thứ tự sắp xếp hàng loạt
- **Auth**: Bearer (ADMIN)
- **Body**:
  ```json
  {
    "items": [
      { "id": "uuid-1", "sortOrd": 1 },
      { "id": "uuid-2", "sortOrd": 2 }
    ]
  }
  ```
- **Response**: `200 OK`

---

## 5. Luồng nghiệp vụ

### 5.1 Tạo phòng ban mới

```
Client                          Server                         Database
  │                               │                               │
  │  POST /api/departments        │                               │
  │  {deptCd, deptNm, ...}        │                               │
  │──────────────────────────────>│                               │
  │                               │  Validate input (zod)         │
  │                               │  Kiểm tra quyền ADMIN         │
  │                               │  Kiểm tra deptCd unique       │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  Kiểm tra upperDeptId tồn tại │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  INSERT TB_DEPT               │
  │                               │──────────────────────────────>│
  │  201 Created                  │                               │
  │<──────────────────────────────│                               │
```

### 5.2 Cập nhật phòng ban (kiểm tra vòng lặp)

```
Client                          Server                         Database
  │                               │                               │
  │  PATCH /api/departments/[id]  │                               │
  │  {upperDeptId: "uuid-new"}    │                               │
  │──────────────────────────────>│                               │
  │                               │  Validate input               │
  │                               │  Kiểm tra quyền ADMIN         │
  │                               │  Lấy toàn bộ cây con          │
  │                               │──────────────────────────────>│
  │                               │<──────────────────────────────│
  │                               │  Kiểm tra uuid-new KHÔNG      │
  │                               │  nằm trong cây con → OK       │
  │                               │  UPDATE TB_DEPT               │
  │                               │──────────────────────────────>│
  │  200 OK                       │                               │
  │<──────────────────────────────│                               │
```

### 5.3 Xóa phòng ban (kiểm tra ràng buộc)

```
Client                          Server                         Database
  │                               │                               │
  │  DELETE /api/departments/[id] │                               │
  │──────────────────────────────>│                               │
  │                               │  Kiểm tra quyền ADMIN         │
  │                               │  COUNT employees WHERE         │
  │                               │    DEPT_ID = id AND DEL_YN='N'│
  │                               │──────────────────────────────>│
  │                               │<── count = 5 ────────────────│
  │  409 Conflict                 │                               │
  │  "Phòng ban đang có 5 NV"    │                               │
  │<──────────────────────────────│                               │
```

---

## 6. Màn hình

### 6.1 Danh sách phòng ban (ADMIN)

| Thuộc tính | Giá trị |
|-----------|---------|
| Đường dẫn | `/admin/departments` |
| Quyền | ADMIN |
| Layout | Bảng dữ liệu với phân trang |

**Các thành phần UI**:
- Thanh tìm kiếm (theo tên/mã phòng ban)
- Bộ lọc trạng thái (Tất cả / Đang dùng / Ngừng dùng)
- Nút "Thêm phòng ban" → mở dialog tạo mới
- Bảng hiển thị: Mã PB | Tên PB | Phòng ban cha | Trưởng phòng | Số NV | Trạng thái | Hành động
- Hành động mỗi dòng: Sửa | Xóa

### 6.2 Cây tổ chức

| Thuộc tính | Giá trị |
|-----------|---------|
| Đường dẫn | `/admin/departments?view=tree` (hoặc tab) |
| Quyền | USER hoặc ADMIN |
| Layout | Tree view dạng expand/collapse |

**Các thành phần UI**:
- Chuyển đổi giữa dạng bảng và dạng cây (Tab hoặc toggle)
- Mỗi node hiển thị: Tên PB, Trưởng phòng, Số nhân viên
- Click node → hiển thị chi tiết bên phải hoặc mở dialog
- Hỗ trợ expand/collapse từng cấp

### 6.3 Dialog Tạo/Sửa phòng ban

| Thuộc tính | Giá trị |
|-----------|---------|
| Hiển thị | Dialog (modal) |
| Quyền | ADMIN |

**Các trường form**:
| Trường | Kiểu | Bắt buộc | Ghi chú |
|--------|------|---------|---------|
| Mã phòng ban | Text input | Có | Chỉ khi tạo mới, không sửa được |
| Tên phòng ban | Text input | Có | |
| Phòng ban cấp trên | Select (dropdown tree) | Không | Danh sách PB hiện có |
| Trưởng phòng | Select (search) | Không | Tìm kiếm nhân viên |
| Thứ tự | Number input | Không | |
| Trạng thái | Toggle (Y/N) | Không | Mặc định: Đang dùng |

---

## 7. Validation Schema (Zod)

```typescript
// src/lib/validations/department.schema.ts

import { z } from 'zod';

export const createDepartmentSchema = z.object({
  deptCd: z.string()
    .min(1, 'Mã phòng ban không được trống')
    .max(20, 'Mã phòng ban tối đa 20 ký tự')
    .regex(/^[A-Z0-9-]+$/, 'Mã phòng ban chỉ chứa chữ hoa, số và dấu gạch ngang'),
  deptNm: z.string()
    .min(1, 'Tên phòng ban không được trống')
    .max(100, 'Tên phòng ban tối đa 100 ký tự'),
  upperDeptId: z.string().uuid().optional().nullable(),
  deptHeadId: z.string().uuid().optional().nullable(),
  sortOrd: z.number().int().min(0).optional(),
  useYn: z.enum(['Y', 'N']).default('Y'),
});

export const updateDepartmentSchema = createDepartmentSchema
  .omit({ deptCd: true })
  .partial();

export const sortDepartmentsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    sortOrd: z.number().int().min(0),
  })).min(1),
});
```

---

## 8. Cấu trúc thư mục

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── departments/
│   │           └── page.tsx              # Danh sách + Cây tổ chức
│   └── api/
│       └── departments/
│           ├── route.ts                  # GET (danh sách), POST (tạo)
│           ├── tree/
│           │   └── route.ts             # GET (cây tổ chức)
│           ├── sort/
│           │   └── route.ts             # PATCH (sắp xếp)
│           └── [id]/
│               └── route.ts             # GET (chi tiết), PATCH (sửa), DELETE (xóa)
├── lib/
│   └── validations/
│       └── department.schema.ts          # Zod validation
├── components/
│   └── departments/
│       ├── department-table.tsx          # Bảng danh sách
│       ├── department-tree.tsx           # Cây tổ chức
│       ├── department-form-dialog.tsx    # Dialog tạo/sửa
│       └── department-delete-dialog.tsx  # Dialog xác nhận xóa
└── tests/
    ├── unit/
    │   └── department-validation.test.ts
    └── integration/
        └── departments-api.test.ts
```

---

## 9. Thứ tự triển khai

### Phase 1: API Backend
- [ ] Tạo Zod validation schema (`department.schema.ts`)
- [ ] API GET /api/departments (danh sách phân trang)
- [ ] API GET /api/departments/tree (cây tổ chức)
- [ ] API GET /api/departments/[id] (chi tiết)
- [ ] API POST /api/departments (tạo mới)
- [ ] API PATCH /api/departments/[id] (cập nhật + kiểm tra vòng lặp)
- [ ] API DELETE /api/departments/[id] (xóa mềm + kiểm tra ràng buộc)
- [ ] API PATCH /api/departments/sort (sắp xếp hàng loạt)
- [ ] Unit test cho validation
- [ ] Integration test cho API

### Phase 2: Giao diện
- [ ] Trang quản lý phòng ban (`/admin/departments`)
- [ ] Component bảng danh sách (tìm kiếm, lọc, phân trang)
- [ ] Component cây tổ chức (tree view)
- [ ] Dialog tạo/sửa phòng ban
- [ ] Dialog xác nhận xóa
- [ ] Tích hợp sidebar navigation

### Phase 3: Seed Data
- [ ] Seed phòng ban mẫu (3-5 phòng ban với cấu trúc cây)
- [ ] Cập nhật dashboard stats thêm số lượng phòng ban

---

## Tài liệu tham chiếu

- `docs/database/database-design.md` — Thiết kế DB chi tiết (SSoT)
- `docs/blueprints/001-auth/blueprint.md` — Blueprint Auth (pattern tham khảo)
- `prisma/schema.prisma` — Prisma schema (model Department đã định nghĩa)
