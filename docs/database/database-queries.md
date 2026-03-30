# Tài liệu truy vấn cơ sở dữ liệu — HRLite

> Tài liệu mô tả tất cả các truy vấn vào database theo từng module, bao gồm pattern sử dụng, điều kiện lọc, và lưu ý quan trọng.

## Mục lục

1. [Tổng quan kiến trúc truy vấn](#1-tổng-quan-kiến-trúc-truy-vấn)
2. [Module Auth — Xác thực](#2-module-auth--xác-thực)
3. [Module Nhân viên](#3-module-nhân-viên)
4. [Module Phòng ban](#4-module-phòng-ban)
5. [Module Chấm công](#5-module-chấm-công)
6. [Module Nghỉ phép](#6-module-nghỉ-phép)
7. [Module Người dùng](#7-module-người-dùng)
8. [Module Điều khoản](#8-module-điều-khoản)
9. [Dashboard & Thống kê](#9-dashboard--thống-kê)
10. [Crawl dữ liệu](#10-crawl-dữ-liệu)
11. [Pattern chung](#11-pattern-chung)
12. [Lưu ý về hiệu suất & an toàn](#12-lưu-ý-về-hiệu-suất--an-toàn)

---

## 1. Tổng quan kiến trúc truy vấn

### ORM & Client
- **Prisma ORM** — tất cả truy vấn đều qua Prisma, không dùng SQL trực tiếp
- **Prisma Client Singleton** — `src/lib/db.ts` khởi tạo 1 instance duy nhất, cache qua `globalThis` trong development

### Quy tắc chung
- Tất cả bảng có cột `DEL_YN` đều lọc `delYn: 'N'` trong mọi truy vấn đọc (soft delete)
- Kết quả phân trang trả về format: `{ data, meta: { page, limit, total, totalPages } }`
- Response API chuẩn: `{ success: boolean, data: T, error?: string }`

### Bảng tổng hợp số lượng truy vấn

| Module | Bảng chính | SELECT | INSERT | UPDATE | DELETE (soft) | Transaction |
|--------|-----------|--------|--------|--------|---------------|-------------|
| Auth | TB_COMM_USER, TH_COMM_USER_AGRE | 2 | 2 | 0 | 0 | 1 |
| Nhân viên | TB_EMPL | 4 | 1 | 1 | 1 | 2 |
| Phòng ban | TB_DEPT | 4 | 1 | 1 | 1 | 0 |
| Chấm công | TH_ATND | 6 | 2 | 2 | 1 | 0 |
| Nghỉ phép | TB_LV_REQ, TC_LV_TYPE | 7 | 2 | 3 | 1 | 1 |
| Người dùng | TB_COMM_USER | 3 | 0 | 1 | 1 | 1 |
| Điều khoản | TB_COMM_TRMS, TH_COMM_USER_AGRE | 5 | 2 | 1 | 1 | 0 |
| Dashboard | Tổng hợp | 5 | 0 | 0 | 0 | 0 |
| Crawl | TB_EMPL | 1 | 1 | 0 | 0 | 0 |

---

## 2. Module Auth — Xác thực

### 2.1. Đăng ký — `POST /api/auth/signup`
**File:** `src/app/api/auth/signup/route.ts`

**Truy vấn 1: Kiểm tra email đã tồn tại**
```typescript
prisma.user.findUnique({
  where: { email }
})
```
- **Bảng:** TB_COMM_USER
- **Loại:** SELECT (findUnique)
- **Mục đích:** Ngăn đăng ký trùng email
- **Lỗi:** Trả 409 Conflict nếu đã tồn tại

**Truy vấn 2: Tạo người dùng + đồng ý điều khoản (Transaction)**
```typescript
prisma.$transaction(async (tx) => {
  // 2a. Tạo user
  const user = await tx.user.create({
    data: {
      email, passwordHash, indctNm, roleCd, sttsCd, creatBy
    }
  })
  // 2b. Tạo bản ghi đồng ý điều khoản (bulk)
  await tx.userAgreement.createMany({
    data: agreements.map(a => ({
      userId: user.userId,
      trmsId: a.termsId,
      agreYn: a.agreed ? 'Y' : 'N',
      ipAddr,
      creatBy: user.email
    }))
  })
  return user
})
```
- **Bảng:** TB_COMM_USER, TH_COMM_USER_AGRE
- **Loại:** INSERT (transaction)
- **Mục đích:** Đảm bảo tính nguyên tử — tạo user và ghi nhận đồng ý điều khoản cùng lúc
- **Lưu ý:** Nếu 1 trong 2 thất bại, toàn bộ rollback

### 2.2. Xác thực session — `GET /api/auth/session`
**File:** `src/app/api/auth/session/route.ts`

**Truy vấn: Lấy thông tin user từ token**
```typescript
prisma.user.findUnique({
  where: { email: decoded.email },
  select: { userId, email, indctNm, roleCd, sttsCd, photoUrl }
})
```
- **Bảng:** TB_COMM_USER
- **Loại:** SELECT (findUnique)
- **Mục đích:** Xác thực token JWT và trả về profile
- **Tối ưu:** Dùng `select` để chỉ lấy các cột cần thiết, không lấy passwordHash

---

## 3. Module Nhân viên

### 3.1. Danh sách nhân viên — `GET /api/employees`
**File:** `src/app/api/employees/route.ts`

**Truy vấn 1: Đếm tổng số (phân trang)**
```typescript
prisma.employee.count({
  where: {
    delYn: 'N',
    OR: [
      { emplNm: { contains: search, mode: 'insensitive' } },
      { emplNo: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ],
    ...(deptId && { deptId }),
    ...(sttsCd && { emplSttsCd: sttsCd })
  }
})
```

**Truy vấn 2: Lấy danh sách có phân trang**
```typescript
prisma.employee.findMany({
  where: { /* giống trên */ },
  include: {
    department: { select: { deptNm: true } }
  },
  orderBy: { creatDt: 'desc' },
  skip: (page - 1) * limit,
  take: limit
})
```
- **Bảng:** TB_EMPL JOIN TB_DEPT
- **Loại:** SELECT (findMany + count)
- **Bộ lọc:** Tìm kiếm theo tên/mã/email, lọc theo phòng ban, trạng thái
- **Phân trang:** skip/take pattern
- **Join:** Include department name

### 3.2. Chi tiết nhân viên — `GET /api/employees/[id]`
**File:** `src/app/api/employees/[id]/route.ts`

```typescript
prisma.employee.findUnique({
  where: { emplId: id, delYn: 'N' },
  include: { department: true }
})
```
- **Bảng:** TB_EMPL JOIN TB_DEPT
- **Loại:** SELECT (findUnique)
- **Lưu ý:** Kiểm tra `delYn` ngay trong `where`

### 3.3. Tạo nhân viên — `POST /api/employees`
**File:** `src/app/api/employees/route.ts`

**Transaction: Tạo với mã nhân viên tự sinh**
```typescript
prisma.$transaction(async (tx) => {
  // 3a. Lấy mã nhân viên lớn nhất
  const lastEmployee = await tx.employee.findFirst({
    where: { emplNo: { startsWith: 'EMP' } },
    orderBy: { emplNo: 'desc' },
    select: { emplNo: true }
  })

  // 3b. Tính mã mới: EMP001, EMP002, ...
  const nextNumber = lastEmployee
    ? parseInt(lastEmployee.emplNo.replace('EMP', '')) + 1
    : 1
  const emplNo = `EMP${String(nextNumber).padStart(3, '0')}`

  // 3c. Tạo nhân viên
  return tx.employee.create({
    data: { emplNo, emplNm, email, ... },
    include: { department: true }
  })
})
```
- **Bảng:** TB_EMPL
- **Loại:** INSERT (transaction)
- **Race condition:** Transaction đảm bảo không trùng mã khi tạo đồng thời
- **Xử lý lỗi:** Bắt Prisma P2002 (unique constraint) cho email trùng

### 3.4. Cập nhật nhân viên — `PATCH /api/employees/[id]`
```typescript
prisma.employee.update({
  where: { emplId: id },
  data: { ...updateData, updtDt: new Date(), updtBy },
  include: { department: true }
})
```
- **Bảng:** TB_EMPL
- **Loại:** UPDATE
- **Lưu ý:** Tự động cập nhật `updtDt` và `updtBy`

### 3.5. Xóa nhân viên (soft) — `DELETE /api/employees/[id]`
**Transaction:**
```typescript
prisma.$transaction(async (tx) => {
  // 3.5a. Soft delete nhân viên
  await tx.employee.update({
    where: { emplId: id },
    data: { delYn: 'Y', updtDt: new Date(), updtBy }
  })

  // 3.5b. Xóa tham chiếu trưởng phòng
  await tx.department.updateMany({
    where: { deptHeadId: id },
    data: { deptHeadId: null }
  })
})
```
- **Bảng:** TB_EMPL, TB_DEPT
- **Loại:** UPDATE (soft delete + cleanup)
- **Quan trọng:** Xóa reference trưởng phòng để tránh foreign key trỏ đến nhân viên đã xóa

### 3.6. Thống kê nhân viên — `GET /api/employees/stats`
```typescript
Promise.all([
  prisma.employee.count({ where: { delYn: 'N' } }),
  prisma.employee.count({ where: { delYn: 'N', emplSttsCd: 'ACTIVE' } }),
  prisma.employee.count({ where: { delYn: 'N', emplSttsCd: 'RESIGNED' } }),
  prisma.employee.count({ where: {
    delYn: 'N',
    creatDt: { gte: startOfMonth }
  }})
])
```
- **Bảng:** TB_EMPL
- **Loại:** SELECT (count × 4 song song)
- **Tối ưu:** `Promise.all` chạy song song 4 query count

### 3.7. Liên kết nhân viên–tài khoản — `POST /api/employees/[id]/link-user`
```typescript
prisma.employee.update({
  where: { emplId: id },
  data: { userId }
})
```
- **Bảng:** TB_EMPL
- **Loại:** UPDATE

---

## 4. Module Phòng ban

### 4.1. Danh sách phòng ban — `GET /api/departments`
**File:** `src/app/api/departments/route.ts`

```typescript
// Count
prisma.department.count({
  where: { delYn: 'N', ...filters }
})

// List
prisma.department.findMany({
  where: {
    delYn: 'N',
    OR: [
      { deptNm: { contains: search, mode: 'insensitive' } },
      { deptCd: { contains: search, mode: 'insensitive' } }
    ]
  },
  include: {
    parent: { select: { deptNm: true } },
    deptHead: { select: { emplNm: true } },
    _count: { select: { employees: { where: { delYn: 'N' } } } }
  },
  orderBy: { sortOrd: 'asc' },
  skip, take
})
```
- **Bảng:** TB_DEPT JOIN TB_DEPT (self) JOIN TB_EMPL
- **Loại:** SELECT (findMany + count)
- **Đặc biệt:** `_count` đếm nhân viên thuộc phòng ban ngay trong query
- **Join:** Parent department name, department head name

### 4.2. Cây phòng ban — `GET /api/departments/tree`
**File:** `src/app/api/departments/tree/route.ts`

```typescript
prisma.department.findMany({
  where: { delYn: 'N' },
  include: {
    deptHead: { select: { emplNm: true, emplId: true } },
    _count: { select: { employees: { where: { delYn: 'N' } } } }
  },
  orderBy: { sortOrd: 'asc' }
})
```
- **Bảng:** TB_DEPT JOIN TB_EMPL
- **Loại:** SELECT (findMany — lấy toàn bộ)
- **Xử lý:** Lấy flat list, build cây bằng thuật toán BFS trong bộ nhớ
- **Lưu ý:** Không dùng recursive query SQL — phù hợp khi số phòng ban < 1000

### 4.3. Sắp xếp phòng ban — `PATCH /api/departments/sort`
```typescript
prisma.$transaction(
  items.map((item, index) =>
    prisma.department.update({
      where: { deptId: item.id },
      data: { sortOrd: index }
    })
  )
)
```
- **Bảng:** TB_DEPT
- **Loại:** UPDATE (batch trong transaction)
- **Pattern:** Array of updates wrapped in `$transaction`

### 4.4. Xóa phòng ban — `DELETE /api/departments/[id]`
```typescript
// Kiểm tra phòng ban con
const childCount = await prisma.department.count({
  where: { upperDeptId: id, delYn: 'N' }
})
// Nếu có phòng ban con → từ chối xóa (409 Conflict)

// Kiểm tra nhân viên thuộc phòng ban
const empCount = await prisma.employee.count({
  where: { deptId: id, delYn: 'N' }
})
// Nếu có nhân viên → từ chối xóa (409 Conflict)

// Soft delete
prisma.department.update({
  where: { deptId: id },
  data: { delYn: 'Y', updtDt, updtBy }
})
```
- **Bảng:** TB_DEPT, TB_EMPL
- **Loại:** SELECT (count) → UPDATE (soft delete)
- **Ràng buộc nghiệp vụ:** Không xóa nếu còn phòng ban con hoặc nhân viên

---

## 5. Module Chấm công

### 5.1. Danh sách chấm công — `GET /api/attendance`
**File:** `src/app/api/attendance/route.ts`

```typescript
prisma.attendance.findMany({
  where: {
    ...(emplId && { emplId }),
    ...(startDate && { atndDt: { gte: startDate } }),
    ...(endDate && { atndDt: { lte: endDate } }),
    ...(sttsCd && { atndSttsCd: sttsCd })
  },
  include: {
    employee: { select: { emplNm: true, emplNo: true, department: { select: { deptNm: true } } } }
  },
  orderBy: { atndDt: 'desc' },
  skip, take
})
```
- **Bảng:** TH_ATND JOIN TB_EMPL JOIN TB_DEPT
- **Bộ lọc:** Theo nhân viên, khoảng ngày, trạng thái
- **Join 2 cấp:** Attendance → Employee → Department

### 5.2. Check-in — `POST /api/attendance/check-in`
**File:** `src/app/api/attendance/check-in/route.ts`

```typescript
// Kiểm tra đã check-in chưa
const existing = await prisma.attendance.findFirst({
  where: { emplId, atndDt: today }
})
// Nếu đã có → trả 409 Conflict

// Tạo bản ghi check-in
prisma.attendance.create({
  data: {
    emplId,
    atndDt: today,
    chkInTm: new Date(),
    atndSttsCd: 'PRESENT',
    creatBy
  }
})
```
- **Bảng:** TH_ATND
- **Loại:** SELECT (kiểm tra) → INSERT
- **Unique:** Ràng buộc 1 check-in/ngày/nhân viên bằng `@@unique([emplId, atndDt])`

### 5.3. Check-out — `PATCH /api/attendance/check-out`
**File:** `src/app/api/attendance/check-out/route.ts`

```typescript
// Tìm bản ghi check-in hôm nay
const attendance = await prisma.attendance.findFirst({
  where: { emplId, atndDt: today, chkOutTm: null }
})

// Cập nhật giờ ra + tính số giờ làm
prisma.attendance.update({
  where: { atndId: attendance.atndId },
  data: {
    chkOutTm: new Date(),
    workHour: calculateWorkHours(attendance.chkInTm, new Date())
  }
})
```
- **Bảng:** TH_ATND
- **Loại:** SELECT → UPDATE
- **Tính toán:** `workHour` tự động tính từ `chkInTm` và `chkOutTm` (trong `src/lib/attendance-utils.ts`)

### 5.4. Chấm công hôm nay — `GET /api/attendance/today`
```typescript
prisma.attendance.findFirst({
  where: { emplId, atndDt: today },
  include: { employee: { select: { emplNm: true } } }
})
```
- **Bảng:** TH_ATND JOIN TB_EMPL
- **Loại:** SELECT (findFirst)

### 5.5. Thống kê chấm công — `GET /api/attendance/stats`
```typescript
Promise.all([
  prisma.attendance.count({ where: { atndDt: today, atndSttsCd: 'PRESENT' } }),
  prisma.attendance.count({ where: { atndDt: today, atndSttsCd: 'LATE' } }),
  prisma.attendance.count({ where: { atndDt: today, atndSttsCd: 'ABSENT' } }),
  prisma.attendance.aggregate({
    where: { atndDt: today, workHour: { not: null } },
    _avg: { workHour: true }
  })
])
```
- **Bảng:** TH_ATND
- **Loại:** SELECT (count × 3 + aggregate)
- **Aggregate:** Tính trung bình giờ làm với `_avg`

### 5.6. Tổng hợp chấm công — `GET /api/attendance/summary`
```typescript
prisma.attendance.findMany({
  where: {
    atndDt: { gte: startDate, lte: endDate },
    ...(emplId && { emplId })
  },
  include: { employee: { select: { emplNm: true, emplNo: true } } },
  orderBy: [{ emplId: 'asc' }, { atndDt: 'asc' }]
})
```
- **Bảng:** TH_ATND JOIN TB_EMPL
- **Loại:** SELECT (findMany)
- **Xử lý:** Group by nhân viên trong bộ nhớ, tính tổng ngày công/giờ làm

---

## 6. Module Nghỉ phép

### 6.1. Danh sách yêu cầu nghỉ — `GET /api/leave`
**File:** `src/app/api/leave/route.ts`

```typescript
prisma.leaveRequest.findMany({
  where: {
    ...(emplId && { emplId }),
    ...(year && {
      startDt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${parseInt(year) + 1}-01-01`)
      }
    }),
    ...(sttsCd && { aprvlSttsCd: sttsCd })
  },
  include: {
    employee: { select: { emplNm: true, emplNo: true } },
    leaveType: { select: { lvTypeNm: true } },
    approver: { select: { emplNm: true } }
  },
  orderBy: { creatDt: 'desc' },
  skip, take
})
```
- **Bảng:** TB_LV_REQ JOIN TB_EMPL (×2) JOIN TC_LV_TYPE
- **Bộ lọc:** Theo nhân viên, năm, trạng thái phê duyệt
- **Join 3 bảng:** Employee (người yêu cầu), Approver (người duyệt), LeaveType

### 6.2. Tạo yêu cầu nghỉ — `POST /api/leave`
```typescript
// 6.2a. Kiểm tra trùng lịch nghỉ
const overlap = await prisma.leaveRequest.findFirst({
  where: {
    emplId,
    aprvlSttsCd: { in: ['APPROVED', 'PENDING'] },
    OR: [
      { startDt: { lte: endDt }, endDt: { gte: startDt } }
    ]
  }
})
// Nếu trùng → trả 409 Conflict

// 6.2b. Kiểm tra số ngày phép còn lại
const usedDays = await prisma.leaveRequest.aggregate({
  where: {
    emplId,
    lvTypeCd,
    aprvlSttsCd: { in: ['APPROVED', 'PENDING'] },
    startDt: { gte: startOfYear, lt: startOfNextYear }
  },
  _sum: { lvDays: true }
})
// So sánh với maxDays của loại nghỉ

// 6.2c. Tạo yêu cầu
prisma.leaveRequest.create({
  data: {
    emplId, lvTypeCd, startDt, endDt, lvDays, rsn,
    aprvlSttsCd: 'PENDING',
    creatBy
  }
})
```
- **Bảng:** TB_LV_REQ, TC_LV_TYPE
- **Loại:** SELECT (overlap check) → AGGREGATE (balance check) → INSERT
- **Nghiệp vụ phức tạp:**
  - Kiểm tra chồng lịch bằng điều kiện khoảng ngày
  - Kiểm tra hạn mức phép bằng aggregate `_sum`

### 6.3. Phê duyệt — `PATCH /api/leave/[id]/approve`
```typescript
// Atomic update: chỉ cập nhật nếu đang PENDING
const result = await prisma.leaveRequest.updateMany({
  where: {
    lvReqId: id,
    aprvlSttsCd: 'PENDING'  // Chỉ duyệt nếu đang chờ
  },
  data: {
    aprvlSttsCd: 'APPROVED',
    aprvrId: approverId,
    aprvlDt: new Date(),
    updtBy
  }
})

if (result.count === 0) {
  // Đã bị duyệt/từ chối trước đó → lỗi
}
```
- **Bảng:** TB_LV_REQ
- **Loại:** UPDATE (updateMany với điều kiện)
- **Race condition:** Dùng `updateMany` + `where` status = PENDING để tránh double approval
- **Pattern:** Optimistic concurrency control — nếu `count === 0` nghĩa là đã có người duyệt trước

### 6.4. Từ chối — `PATCH /api/leave/[id]/reject`
```typescript
prisma.leaveRequest.updateMany({
  where: { lvReqId: id, aprvlSttsCd: 'PENDING' },
  data: {
    aprvlSttsCd: 'REJECTED',
    rjctRsn: reason,
    aprvrId: approverId,
    aprvlDt: new Date()
  }
})
```
- **Bảng:** TB_LV_REQ
- **Loại:** UPDATE (atomic, tương tự approve)

### 6.5. Hủy yêu cầu — `PATCH /api/leave/[id]/cancel`
```typescript
prisma.leaveRequest.updateMany({
  where: {
    lvReqId: id,
    aprvlSttsCd: { in: ['PENDING', 'APPROVED'] }
  },
  data: { aprvlSttsCd: 'CANCELLED', updtBy }
})
```
- **Bảng:** TB_LV_REQ
- **Loại:** UPDATE
- **Lưu ý:** Cho phép hủy cả yêu cầu đã được duyệt

### 6.6. Số dư phép — `GET /api/leave/balance`
```typescript
// Lấy tất cả loại nghỉ đang hoạt động
const leaveTypes = await prisma.leaveType.findMany({
  where: { useYn: 'Y' }
})

// Tính số ngày đã dùng cho từng loại
const balances = await Promise.all(
  leaveTypes.map(async (type) => {
    const used = await prisma.leaveRequest.aggregate({
      where: {
        emplId,
        lvTypeCd: type.lvTypeCd,
        aprvlSttsCd: { in: ['APPROVED', 'PENDING'] },
        startDt: { gte: startOfYear, lt: startOfNextYear }
      },
      _sum: { lvDays: true }
    })
    return {
      lvTypeCd: type.lvTypeCd,
      lvTypeNm: type.lvTypeNm,
      maxDays: type.maxDays,
      usedDays: used._sum.lvDays || 0,
      remainingDays: type.maxDays - (used._sum.lvDays || 0)
    }
  })
)
```
- **Bảng:** TC_LV_TYPE, TB_LV_REQ
- **Loại:** SELECT + AGGREGATE (N+1 pattern, nhưng N nhỏ ~5–10 loại)
- **File util:** `src/lib/leave-utils.ts` chứa logic tính toán tái sử dụng

### 6.7. Thống kê nghỉ phép — `GET /api/leave/stats`
```typescript
Promise.all([
  prisma.leaveRequest.count({ where: { aprvlSttsCd: 'PENDING' } }),
  prisma.leaveRequest.count({
    where: { aprvlSttsCd: 'APPROVED', startDt: { lte: today }, endDt: { gte: today } }
  }),
  prisma.leaveRequest.count({
    where: { aprvlSttsCd: 'APPROVED', startDt: { gte: startOfMonth } }
  })
])
```
- **Bảng:** TB_LV_REQ
- **Loại:** SELECT (count × 3 song song)

---

## 7. Module Người dùng

### 7.1. Danh sách — `GET /api/users` (ADMIN only)
```typescript
prisma.user.findMany({
  where: {
    delYn: 'N',
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { indctNm: { contains: search, mode: 'insensitive' } }
      ]
    })
  },
  select: { userId, email, indctNm, roleCd, sttsCd, lastLoginDt, creatDt },
  orderBy: { creatDt: 'desc' },
  skip, take
})
```
- **Bảng:** TB_COMM_USER
- **Loại:** SELECT
- **Bảo mật:** Không bao giờ trả `passwordHash`

### 7.2. Profile hiện tại — `GET /api/users/me`
```typescript
prisma.user.findUnique({
  where: { userId: currentUserId, delYn: 'N' },
  select: { userId, email, indctNm, telno, photoUrl, roleCd, sttsCd, creatDt }
})
```
- **Bảng:** TB_COMM_USER
- **Loại:** SELECT (findUnique)

### 7.3. Xóa người dùng — `DELETE /api/users/[id]`
```typescript
prisma.$transaction(async (tx) => {
  // Xóa refresh tokens
  await tx.refreshToken.deleteMany({ where: { userId: id } })
  // Xóa agreements
  await tx.userAgreement.deleteMany({ where: { userId: id } })
  // Soft delete user
  await tx.user.update({
    where: { userId: id },
    data: { delYn: 'Y', delDt: new Date() }
  })
})
```
- **Bảng:** TB_COMM_RFRSH_TKN, TH_COMM_USER_AGRE, TB_COMM_USER
- **Loại:** DELETE (hard) + UPDATE (soft delete) trong transaction
- **Lưu ý:** Token và agreement hard delete, user soft delete

---

## 8. Module Điều khoản

### 8.1. Điều khoản đang hoạt động — `GET /api/terms/active`
```typescript
prisma.terms.findMany({
  where: { actvYn: 'Y', delYn: 'N' },
  orderBy: [{ tyCd: 'asc' }, { verNo: 'desc' }]
})
```
- **Bảng:** TB_COMM_TRMS
- **Loại:** SELECT
- **Public:** Không cần authentication

### 8.2. Điều khoản chờ đồng ý — `GET /api/terms/pending`
```typescript
// Lấy điều khoản active
const activeTerms = await prisma.terms.findMany({
  where: { actvYn: 'Y', delYn: 'N' }
})

// Lấy điều khoản user đã đồng ý
const agreedTerms = await prisma.userAgreement.findMany({
  where: { userId, agreYn: 'Y' },
  select: { trmsId: true }
})

// Lọc ra những cái chưa đồng ý (trong bộ nhớ)
```
- **Bảng:** TB_COMM_TRMS, TH_COMM_USER_AGRE
- **Loại:** SELECT × 2 → lọc trong bộ nhớ

### 8.3. Đồng ý điều khoản — `POST /api/terms/agree`
```typescript
prisma.userAgreement.createMany({
  data: agreements.map(a => ({
    userId,
    trmsId: a.termsId,
    agreYn: a.agreed ? 'Y' : 'N',
    ipAddr,
    creatBy: userEmail
  }))
})
```
- **Bảng:** TH_COMM_USER_AGRE
- **Loại:** INSERT (batch)

---

## 9. Dashboard & Thống kê

### `GET /api/dashboard/stats`
**File:** `src/app/api/dashboard/stats/route.ts`

```typescript
const [totalEmployees, onLeaveToday, pendingLeave, presentToday, departments] =
  await Promise.all([
    prisma.employee.count({
      where: { delYn: 'N', emplSttsCd: 'ACTIVE' }
    }),
    prisma.leaveRequest.count({
      where: {
        aprvlSttsCd: 'APPROVED',
        startDt: { lte: today },
        endDt: { gte: today }
      }
    }),
    prisma.leaveRequest.count({
      where: { aprvlSttsCd: 'PENDING' }
    }),
    prisma.attendance.count({
      where: { atndDt: today }
    }),
    prisma.department.count({
      where: { delYn: 'N', useYn: 'Y' }
    })
  ])
```
- **Bảng:** TB_EMPL, TB_LV_REQ, TH_ATND, TB_DEPT
- **Loại:** SELECT (count × 5 song song)
- **Tối ưu:** `Promise.all` cho 5 query độc lập

---

## 10. Crawl dữ liệu

### `POST /api/crawl/random-users`
**File:** `src/lib/crawl-service.ts`

```typescript
// Lấy mã nhân viên lớn nhất hiện tại
const lastEmp = await prisma.employee.findFirst({
  orderBy: { emplNo: 'desc' },
  where: { emplNo: { startsWith: 'EMP' } },
  select: { emplNo: true }
})

// Batch insert (bỏ qua trùng lặp)
await prisma.employee.createMany({
  data: employees.map((emp, i) => ({
    emplNo: `EMP${String(startNum + i).padStart(3, '0')}`,
    emplNm: `${emp.name.first} ${emp.name.last}`,
    email: emp.email,
    ...
  })),
  skipDuplicates: true
})
```
- **Bảng:** TB_EMPL
- **Loại:** SELECT → INSERT (batch)
- **Tối ưu:** `createMany` + `skipDuplicates` cho insert hàng loạt
- **Nguồn:** randomuser.me API

---

## 11. Pattern chung

### 11.1. Phân trang (Pagination)
```typescript
// Áp dụng cho: employees, departments, attendance, leave, users
const total = await prisma.model.count({ where })
const data = await prisma.model.findMany({
  where,
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { creatDt: 'desc' }
})
return {
  data,
  meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
}
```

### 11.2. Soft Delete
```typescript
// ĐỌC: Luôn lọc delYn = 'N'
prisma.model.findMany({ where: { delYn: 'N' } })

// XÓA: Set delYn = 'Y', không dùng prisma.delete()
prisma.model.update({
  where: { id },
  data: { delYn: 'Y', updtDt: new Date(), updtBy }
})
```

### 11.3. Tìm kiếm text (Search)
```typescript
// Case-insensitive search trên nhiều cột
where: {
  OR: [
    { field1: { contains: search, mode: 'insensitive' } },
    { field2: { contains: search, mode: 'insensitive' } }
  ]
}
```

### 11.4. Transaction cho tính nguyên tử
```typescript
// Dùng khi: tạo nhân viên (sinh mã), xóa user (cascade), đăng ký, duyệt phép
prisma.$transaction(async (tx) => {
  // Tất cả query trong đây hoặc thành công hết, hoặc rollback hết
})
```

### 11.5. Optimistic Concurrency (Tránh race condition)
```typescript
// Dùng updateMany + điều kiện status thay vì findFirst → update
const result = await prisma.model.updateMany({
  where: { id, status: 'EXPECTED_STATUS' },
  data: { status: 'NEW_STATUS' }
})
if (result.count === 0) throw new ConflictError('Đã bị thay đổi')
```

### 11.6. Aggregate cho thống kê
```typescript
// Tổng ngày nghỉ
prisma.leaveRequest.aggregate({
  where: { ... },
  _sum: { lvDays: true }
})

// Trung bình giờ làm
prisma.attendance.aggregate({
  where: { ... },
  _avg: { workHour: true }
})
```

---

## 12. Lưu ý về hiệu suất & an toàn

### Hiệu suất
| Pattern | Áp dụng | Mô tả |
|---------|---------|-------|
| `Promise.all` | Stats, dashboard | Chạy song song các query count độc lập |
| `select` projection | Auth, users | Chỉ lấy cột cần thiết, tránh lấy dư |
| `createMany` + `skipDuplicates` | Crawl | Insert hàng loạt, bỏ qua bản ghi trùng |
| In-memory tree build | Department tree | Lấy flat data, build tree bằng code (tránh recursive SQL) |
| `_count` trong include | Department list | Đếm nhân viên trong cùng query thay vì N+1 |

### An toàn dữ liệu
| Quy tắc | Chi tiết |
|---------|---------|
| Không trả `passwordHash` | Luôn dùng `select` để loại bỏ |
| Transaction cho tạo mã | Tránh trùng `emplNo` khi tạo đồng thời |
| Atomic status update | `updateMany` + điều kiện status tránh double approval |
| Soft delete cascade | Xóa nhân viên → xóa reference trưởng phòng |
| Unique constraint ở DB | `@@unique([emplId, atndDt])` — 1 check-in/ngày |
| Role-based filtering | USER chỉ xem dữ liệu của mình, ADMIN xem tất cả |

### Index khuyến nghị
| Bảng | Cột | Lý do |
|------|-----|-------|
| TH_ATND | `(emplId, atndDt)` | Unique + tìm kiếm check-in hôm nay |
| TB_LV_REQ | `(emplId, aprvlSttsCd, startDt)` | Kiểm tra overlap + balance |
| TB_EMPL | `emplNo` | Unique + tìm mã nhân viên lớn nhất |
| TB_EMPL | `email` | Unique + tìm kiếm |
| TB_DEPT | `upperDeptId` | Build cây phòng ban |
| TB_COMM_USER | `email` | Unique + đăng nhập |
