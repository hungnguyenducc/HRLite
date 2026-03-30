# Chức năng tự động Crawl Data trong dự án HRLite

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc hệ thống crawl](#2-kiến-trúc-hệ-thống-crawl)
3. [Nguồn dữ liệu](#3-nguồn-dữ-liệu)
4. [Cấu hình Cron Job](#4-cấu-hình-cron-job)
5. [API Endpoint crawl](#5-api-endpoint-crawl)
6. [Crawl Service](#6-crawl-service)
7. [Mô hình cơ sở dữ liệu](#7-mô-hình-cơ-sở-dữ-liệu)
8. [Seed Scripts](#8-seed-scripts)
9. [Biến môi trường](#9-biến-môi-trường)
10. [NPM Scripts](#10-npm-scripts)
11. [Quy tắc tạo dữ liệu](#11-quy-tắc-tạo-dữ-liệu)
12. [Xử lý trùng lặp](#12-xử-lý-trùng-lặp)
13. [Local Cron Script](#13-local-cron-script)
14. [Lịch sử phát triển](#14-lịch-sử-phát-triển)
15. [Xử lý sự cố thường gặp](#15-xử-lý-sự-cố-thường-gặp)

---

## 1. Tổng quan

HRLite có chức năng **tự động crawl dữ liệu** từ API [randomuser.me](https://randomuser.me/) để tạo dữ liệu nhân viên, khách hàng và đơn hàng mẫu thực tế. Hệ thống sử dụng **Vercel Cron Jobs** để chạy tự động hàng ngày và cung cấp API endpoint để trigger thủ công.

### Đặc điểm chính

| Đặc điểm | Mô tả |
|----------|-------|
| Nguồn dữ liệu | randomuser.me API |
| Tần suất tự động | Hàng ngày lúc 00:00 UTC |
| Nền tảng Cron | Vercel Cron Jobs |
| Số lượng mặc định | 20 nhân viên/lần crawl |
| Số lượng tối đa | 500 records/lần |
| Xác thực | Bearer token (CRON_SECRET) |
| Chống trùng lặp | Kiểm tra email + mã nhân viên |

### Loại dữ liệu crawl

| Loại | Số lượng seed | Định dạng mã | Bảng DB |
|------|--------------|-------------|---------|
| Nhân viên | 50 | `NV-{timestamp}{random}` | TB_EMPL |
| Khách hàng | 1.000 | `KH-{index}` | TB_CUST |
| Đơn hàng | 3.000+ | `ORD-{index}` | TB_CUST_ORD |

---

## 2. Kiến trúc hệ thống crawl

### Luồng crawl tự động (Vercel Cron)

```
[Vercel Cron Scheduler]
  │  Chạy hàng ngày 00:00 UTC
  ▼
[GET /api/crawl/random-users]
  │  Header: Authorization: Bearer <CRON_SECRET>
  ▼
[crawlRandomUsers(count)]
  │
  ├── 1. Gọi randomuser.me API
  │      GET https://randomuser.me/api/?results={count}&nat=us,gb,fr,de,au
  │
  ├── 2. Lấy danh sách phòng ban từ DB
  │      (loại trừ phòng ban gốc COMPANY)
  │
  ├── 3. Kiểm tra trùng lặp email + mã nhân viên
  │
  ├── 4. Tạo dữ liệu nhân viên Việt Nam hóa
  │      (SĐT VN, chức vụ tiếng Việt, phòng ban ngẫu nhiên)
  │
  └── 5. Batch insert vào PostgreSQL
         prisma.employee.createMany({ skipDuplicates: true })
```

### Luồng crawl thủ công

```
[Client/Admin]
  │  POST /api/crawl/random-users
  │  Body: { count: 100 }
  │  Header: Authorization: Bearer <CRON_SECRET>
  ▼
[Cùng crawlRandomUsers(count)]
```

### Luồng seed dữ liệu khách hàng + đơn hàng

```
[npm run db:seed:customers]
  │  Crawl 1.000 khách hàng từ randomuser.me
  │  (100 users/batch, delay 1 giây giữa các batch)
  ▼
[npm run db:seed:orders]
  │  Tạo 1-5 đơn hàng ngẫu nhiên cho mỗi khách hàng
  │  (sản phẩm điện tử, phương thức thanh toán VN)
  ▼
[PostgreSQL]
  TB_CUST (1.000 records) + TB_CUST_ORD (3.000+ records)
```

---

## 3. Nguồn dữ liệu

### API: randomuser.me

| Thuộc tính | Giá trị |
|-----------|---------|
| URL | `https://randomuser.me/api/` |
| Số lượng/request | Tối đa 5.000 |
| Quốc tịch hỗ trợ | US, GB, FR, DE, AU, BR |
| Rate limit | Không chính thức, khuyến nghị delay 1 giây |
| Phí sử dụng | Miễn phí |

### Dữ liệu nhận được từ API

```json
{
  "results": [
    {
      "gender": "male",
      "name": { "first": "John", "last": "Doe" },
      "email": "john.doe@example.com",
      "phone": "031-541-7954",
      "dob": { "date": "1990-05-15", "age": 36 },
      "picture": {
        "large": "https://randomuser.me/api/portraits/men/1.jpg",
        "medium": "...",
        "thumbnail": "..."
      },
      "location": {
        "street": { "number": 123, "name": "Main St" },
        "city": "New York",
        "state": "New York",
        "country": "United States"
      },
      "nat": "US"
    }
  ]
}
```

### Ánh xạ dữ liệu

| randomuser.me | HRLite (Nhân viên) | HRLite (Khách hàng) |
|--------------|--------------------|--------------------|
| name.first + name.last | emplNm | custNm |
| email | → Tạo mới format VN | email (Gmail) |
| phone | → Tạo SĐT VN | phoneNo (SĐT VN) |
| dob.date | birthDt | birthDt |
| gender | gendrCd (M/F) | gendrCd (M/F) |
| picture.thumbnail | photoUrl | photoUrl |
| location | — | addr, city, countryCd |

---

## 4. Cấu hình Cron Job

### File: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/crawl/random-users",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Giải thích lịch trình

| Trường | Giá trị | Ý nghĩa |
|--------|---------|---------|
| Phút | `0` | Phút 0 |
| Giờ | `0` | 0 giờ (nửa đêm) |
| Ngày | `*` | Mỗi ngày |
| Tháng | `*` | Mỗi tháng |
| Thứ | `*` | Mỗi ngày trong tuần |

**Kết quả**: Chạy **1 lần/ngày** lúc 00:00 UTC.

### Lịch sử thay đổi lịch trình

| Phiên bản | Lịch trình | Lý do |
|-----------|-----------|-------|
| Ban đầu | `0 * * * *` (mỗi giờ) | Cập nhật liên tục |
| Hiện tại | `0 0 * * *` (hàng ngày) | Giới hạn Vercel Hobby plan (1 cron/ngày) |

### Giới hạn Vercel Cron theo plan

| Plan | Số cron job | Tần suất tối thiểu |
|------|------------|-------------------|
| Hobby | 1 | Hàng ngày |
| Pro | 40 | Mỗi phút |
| Enterprise | 100 | Mỗi phút |

---

## 5. API Endpoint crawl

### File: `src/app/api/crawl/random-users/route.ts`

### GET - Vercel Cron trigger

```
GET /api/crawl/random-users
Header: Authorization: Bearer <CRON_SECRET>

Response 200:
{
  "success": true,
  "data": {
    "totalCrawled": 20,
    "created": 18,
    "skipped": 2,
    "totalInDb": 150
  }
}
```

### POST - Manual trigger

```
POST /api/crawl/random-users
Header: Authorization: Bearer <CRON_SECRET>
Body: { "count": 100 }   // Tùy chọn, mặc định 20, tối đa 500

Response 200:
{
  "success": true,
  "data": {
    "totalCrawled": 100,
    "created": 95,
    "skipped": 5,
    "totalInDb": 245
  }
}
```

### Xác thực

Cả GET và POST đều yêu cầu header `Authorization: Bearer <CRON_SECRET>`:

```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

### Response format

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `success` | boolean | Thành công hay thất bại |
| `data.totalCrawled` | number | Tổng records lấy từ API |
| `data.created` | number | Records tạo mới trong DB |
| `data.skipped` | number | Records bỏ qua (trùng lặp) |
| `data.totalInDb` | number | Tổng records trong DB sau crawl |
| `error` | string? | Thông báo lỗi (nếu có) |

---

## 6. Crawl Service

### File: `src/lib/crawl-service.ts`

### Hàm chính: `crawlRandomUsers(count)`

```typescript
export async function crawlRandomUsers(count: number): Promise<CrawlResult> {
  // 1. Gọi randomuser.me API
  const response = await fetch(
    `https://randomuser.me/api/?results=${count}&nat=us,gb,fr,de,au`
  );
  const { results } = await response.json();

  // 2. Lấy phòng ban khả dụng (loại trừ COMPANY)
  const departments = await prisma.department.findMany({
    where: { parentId: { not: null } }
  });

  // 3. Kiểm tra trùng lặp email + mã nhân viên
  const existingEmails = await prisma.employee.findMany({
    select: { email: true }
  });

  // 4. Tạo dữ liệu nhân viên
  const employees = results.map(user => ({
    emplNo: generateEmployeeNo(),     // NV-{timestamp}{random}
    emplNm: `${user.name.first} ${user.name.last}`,
    email: generateVnEmail(user),      // first.last{random}@gmail.com
    phoneNo: generateVnPhone(),        // 090xxxxxxx
    position: randomPosition(),        // Chức vụ ngẫu nhiên
    deptId: randomDepartment(departments),
    joinDt: randomJoinDate(),          // Trong 5 năm gần
    emplSttsCd: 'WORKING',
    creatBy: 'CRAWL_AUTO',
  }));

  // 5. Batch insert
  const result = await prisma.employee.createMany({
    data: employees,
    skipDuplicates: true,
  });

  return { totalCrawled: count, created: result.count, ... };
}
```

### Danh sách chức vụ mẫu

```typescript
const POSITIONS = [
  'Nhân viên',
  'Chuyên viên',
  'Senior Developer',
  'Junior Developer',
  'Trưởng nhóm',
  'Kế toán',
  'Nhân viên kinh doanh',
  'QA Engineer',
  'Designer',
  'DevOps Engineer',
  'Business Analyst',
  'Project Manager',
];
```

### Tạo số điện thoại Việt Nam

```typescript
const VN_PREFIXES = ['090', '091', '093', '094', '096', '097', '098', '032', '033', '034'];

function generateVnPhone(): string {
  const prefix = VN_PREFIXES[Math.floor(Math.random() * VN_PREFIXES.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${number}`;
}
```

---

## 7. Mô hình cơ sở dữ liệu

### 7.1 Employee (TB_EMPL) — Dữ liệu crawl nhân viên

Bảng nhân viên hiện có, được bổ sung dữ liệu từ crawl:

| Cột | Kiểu | Mô tả | Giá trị crawl |
|-----|------|-------|---------------|
| EMPL_NO | String | Mã nhân viên | `NV-{timestamp}{random}` |
| EMPL_NM | String | Tên nhân viên | `{first} {last}` từ API |
| EMAIL | String | Email | `{first}.{last}{random}@gmail.com` |
| PHONE_NO | String | Số điện thoại | SĐT VN ngẫu nhiên |
| POSITION | String | Chức vụ | Từ danh sách 12 chức vụ |
| DEPT_ID | String | FK phòng ban | Phòng ban ngẫu nhiên |
| JOIN_DT | DateTime | Ngày vào làm | Ngẫu nhiên trong 5 năm |
| EMPL_STTS_CD | String | Trạng thái | `WORKING` |
| CREAT_BY | String | Người tạo | `CRAWL_AUTO` |

### 7.2 Customer (TB_CUST) — Dữ liệu crawl khách hàng

```prisma
model Customer {
  id         String    @id @default(uuid()) @map("CUST_ID")
  custNo     String    @unique @map("CUST_NO")       // KH-000001
  custNm     String    @map("CUST_NM")               // Tên đầy đủ
  email      String    @unique @map("EMAIL")          // Email Gmail
  phoneNo    String?   @map("PHONE_NO")               // SĐT VN
  birthDt    DateTime? @map("BIRTH_DT") @db.Date      // Ngày sinh
  gendrCd    String?   @map("GENDR_CD")               // M hoặc F
  addr       String?   @map("ADDR")                   // Địa chỉ
  city       String?   @map("CITY")                   // Thành phố
  countryCd  String?   @map("CNTRY_CD")               // Mã quốc gia ISO
  photoUrl   String?   @map("PHOTO_URL")              // Ảnh thumbnail
  emplId     String?   @map("EMPL_ID")                // FK nhân viên phụ trách
  custSttsCd String    @default("ACTIVE") @map("CUST_STTS_CD")
  creatBy    String    @map("CREAT_BY")               // CRAWL_SEED
  delYn      String    @default("N") @map("DEL_YN")

  employee Employee?        @relation(...)
  orders   CustomerOrder[]

  @@map("TB_CUST")
}
```

### 7.3 CustomerOrder (TB_CUST_ORD) — Dữ liệu đơn hàng mẫu

```prisma
model CustomerOrder {
  id        String    @id @default(uuid()) @map("CUST_ORD_ID")
  ordNo     String    @unique @map("ORD_NO")          // ORD-000001
  custId    String    @map("CUST_ID")                  // FK khách hàng
  ordDt     DateTime  @default(now()) @map("ORD_DT")   // Ngày đặt hàng
  ordSttsCd String    @default("PENDING") @map("ORD_STTS_CD")
  totAmt    Decimal   @map("TOT_AMT") @db.Decimal(12,2)
  prdctNm   String    @map("PRDCT_NM")                // Tên sản phẩm
  qty       Int       @map("QTY")                      // Số lượng (1-3)
  unitPrc   Decimal   @map("UNIT_PRC") @db.Decimal(12,2)
  payMthdCd String?   @map("PAY_MTHD_CD")             // Phương thức thanh toán
  creatBy   String    @map("CREAT_BY")                 // CRAWL_SEED
  delYn     String    @default("N") @map("DEL_YN")

  customer Customer @relation(...)

  @@map("TB_CUST_ORD")
}
```

### Quan hệ dữ liệu

```
TB_EMPL (Nhân viên)
  │
  └── 1:N ──→ TB_CUST (Khách hàng)
                │
                └── 1:N ──→ TB_CUST_ORD (Đơn hàng)
```

---

## 8. Seed Scripts

### 8.1 Seed nhân viên

#### File: `prisma/seed-crawl.ts`

```bash
npm run db:seed:crawl
# hoặc
npx tsx prisma/seed-crawl.ts
```

| Thuộc tính | Giá trị |
|-----------|---------|
| Số lượng | 50 nhân viên |
| Mã nhân viên | `NV-{index}` |
| Phòng ban | Ngẫu nhiên (trừ COMPANY) |
| Người tạo | `CRAWL_SEED` |

### 8.2 Seed khách hàng

#### File: `prisma/seed-customers.ts`

```bash
npm run db:seed:customers
# hoặc
npx tsx prisma/seed-customers.ts
```

| Thuộc tính | Giá trị |
|-----------|---------|
| Số lượng | 1.000 khách hàng |
| Batch size | 100 users/request |
| Delay giữa batch | 1 giây |
| Mã khách hàng | `KH-000001` → `KH-001000` |
| Quốc tịch | US, GB, FR, DE, AU, BR |
| Người tạo | `CRAWL_SEED` |

### 8.3 Seed đơn hàng

#### File: `prisma/seed-orders.ts`

```bash
npm run db:seed:orders
# hoặc
npx tsx prisma/seed-orders.ts
```

| Thuộc tính | Giá trị |
|-----------|---------|
| Số lượng | 1-5 đơn hàng/khách hàng (3.000+ tổng) |
| Mã đơn hàng | `ORD-000001` → `ORD-00xxxx` |
| Sản phẩm | 15 sản phẩm điện tử mẫu |
| Ngày đặt | Ngẫu nhiên trong 90 ngày gần |
| Số lượng | 1-3 sản phẩm/đơn |
| Người tạo | `CRAWL_SEED` |

### Danh sách sản phẩm mẫu

Laptop, Smartphone, Tai nghe, Bàn phím, Chuột, Màn hình, Tablet, Smartwatch, Loa Bluetooth, Sạc dự phòng, Ổ cứng SSD, Webcam, Máy in, Router WiFi, USB Flash Drive.

### Phương thức thanh toán

| Mã | Mô tả |
|----|-------|
| `CARD` | Thẻ tín dụng/ghi nợ |
| `BANK_TRANSFER` | Chuyển khoản ngân hàng |
| `COD` | Thanh toán khi nhận hàng |
| `MOMO` | Ví MoMo |
| `ZALOPAY` | ZaloPay |

### Trạng thái đơn hàng

| Mã | Mô tả |
|----|-------|
| `PENDING` | Chờ xử lý |
| `CONFIRMED` | Đã xác nhận |
| `SHIPPING` | Đang giao hàng |
| `DELIVERED` | Đã giao hàng |
| `CANCELLED` | Đã hủy |

---

## 9. Biến môi trường

### File: `.env`

```env
# Xác thực Cron Job
CRON_SECRET=your_secret_token

# Database (bắt buộc cho crawl service)
DATABASE_URL=postgresql://user:pass@host:port/db
DIRECT_URL=postgresql://user:pass@host:port/db   # Vercel production
```

### Lưu ý

- `CRON_SECRET` phải khớp giữa Vercel Environment Variables và header Authorization
- Vercel tự động gửi header `Authorization: Bearer <CRON_SECRET>` khi trigger cron
- Khi test thủ công, phải tự thêm header

---

## 10. NPM Scripts

```json
{
  "scripts": {
    "db:seed:crawl": "npx tsx prisma/seed-crawl.ts",
    "db:seed:customers": "npx tsx prisma/seed-customers.ts",
    "db:seed:orders": "npx tsx prisma/seed-orders.ts"
  }
}
```

### Thứ tự chạy seed đúng

```bash
# 1. Seed nhân viên trước (khách hàng có FK đến nhân viên)
npm run db:seed:crawl

# 2. Seed khách hàng
npm run db:seed:customers

# 3. Seed đơn hàng (phụ thuộc khách hàng)
npm run db:seed:orders
```

---

## 11. Quy tắc tạo dữ liệu

### Mã nhân viên (emplNo)

```
NV-{timestamp}{random}
│    │          │
│    │          └── 2 ký tự ngẫu nhiên (0-9, a-z)
│    └── Unix timestamp (milliseconds)
└── Tiền tố cố định "NV-" (Nhân Viên)

Ví dụ: NV-1711497600ab
```

### Email nhân viên

```
{first}.{last}{random2}@gmail.com

Ví dụ: john.doe42@gmail.com
```

### Số điện thoại Việt Nam

```
{prefix}{7 chữ số ngẫu nhiên}

Prefix: 090, 091, 093, 094, 096, 097, 098, 032, 033, 034
Ví dụ: 0901234567
```

### Ngày vào làm

```
Ngày ngẫu nhiên trong khoảng [hôm nay - 5 năm, hôm nay]
```

---

## 12. Xử lý trùng lặp

### Chiến lược

```typescript
// 1. Kiểm tra trước khi insert
const existingEmails = await prisma.employee.findMany({
  select: { email: true }
});
const emailSet = new Set(existingEmails.map(e => e.email));

// 2. Lọc records trùng lặp
const newEmployees = employees.filter(e => !emailSet.has(e.email));

// 3. Batch insert với skipDuplicates
await prisma.employee.createMany({
  data: newEmployees,
  skipDuplicates: true,  // Bỏ qua nếu trùng unique constraint
});
```

### Unique constraints được kiểm tra

| Bảng | Cột unique | Hành vi khi trùng |
|------|-----------|-------------------|
| TB_EMPL | EMPL_NO, EMAIL | Bỏ qua (skipDuplicates) |
| TB_CUST | CUST_NO, EMAIL | Bỏ qua (skipDuplicates) |
| TB_CUST_ORD | ORD_NO | Bỏ qua (skipDuplicates) |

---

## 13. Local Cron Script

### File: `scripts/crawl-cron.sh`

```bash
#!/bin/bash
# Cài đặt crontab:
# 0 * * * * /Applications/Workspace/HRLite/scripts/crawl-cron.sh >> /Applications/Workspace/HRLite/logs/crawl.log 2>&1

cd /Applications/Workspace/HRLite
npx tsx prisma/seed-crawl.ts
```

### Cài đặt crontab local

```bash
# Mở crontab editor
crontab -e

# Thêm dòng sau (chạy mỗi giờ)
0 * * * * /Applications/Workspace/HRLite/scripts/crawl-cron.sh >> /Applications/Workspace/HRLite/logs/crawl.log 2>&1
```

### Lưu ý

- Script local chạy `seed-crawl.ts` trực tiếp, không qua API endpoint
- Cần đảm bảo `npx` có trong PATH của crontab
- Log được ghi vào `logs/crawl.log`

---

## 14. Lịch sử phát triển

| Commit | Ngày | Thay đổi |
|--------|------|---------|
| `83057ca` | 2026-03-26 | feat: Thêm web crawling từ randomuser.me + module khách hàng |
| `26583b8` | 2026-03-26 | fix: Tối ưu crawl cron job để tránh timeout trên production |
| `e5dc6f5` | 2026-03-27 | fix: Chuyển crawl script sang chạy bằng Node.js thay vì curl |
| `d28856f` | 2026-03-27 | fix: Đổi Vercel cron sang daily để tương thích Hobby plan |

### Các vấn đề đã giải quyết

1. **Timeout trên production**: Giảm số lượng crawl mặc định và tối ưu query
2. **curl không hoạt động trong cron**: Chuyển sang chạy trực tiếp bằng `npx tsx`
3. **Giới hạn Vercel Hobby plan**: Đổi lịch trình từ mỗi giờ sang hàng ngày

---

## 15. Xử lý sự cố thường gặp

### Lỗi: `401 Unauthorized` khi gọi API crawl

**Nguyên nhân**: Thiếu hoặc sai header Authorization.
**Giải pháp**:
- Kiểm tra biến `CRON_SECRET` trong Vercel Environment Variables
- Đảm bảo header đúng format: `Authorization: Bearer <CRON_SECRET>`

### Lỗi: `npx: command not found` trong crontab

**Nguyên nhân**: PATH của crontab không bao gồm Node.js.
**Giải pháp**:
```bash
# Thêm PATH vào đầu script crawl-cron.sh
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

### Lỗi: `randomuser.me API timeout`

**Nguyên nhân**: API bên ngoài phản hồi chậm hoặc không khả dụng.
**Giải pháp**:
- Giảm `count` xuống (20-50 thay vì 500)
- Thêm retry logic với exponential backoff
- Kiểm tra trạng thái API tại https://randomuser.me/

### Lỗi: `Unique constraint violation` dù đã có skipDuplicates

**Nguyên nhân**: Race condition khi chạy nhiều crawl cùng lúc.
**Giải pháp**:
- Đảm bảo không chạy đồng thời nhiều phiên crawl
- Sử dụng distributed lock nếu cần

### Dữ liệu crawl không xuất hiện trên frontend

**Nguyên nhân**: Có thể do cache hoặc filter điều kiện.
**Giải pháp**:
- Kiểm tra `delYn = 'N'` trong query
- Kiểm tra `emplSttsCd = 'WORKING'` hoặc `custSttsCd = 'ACTIVE'`
- Xóa cache và refresh trang

### Vercel Cron không chạy

**Nguyên nhân**: Cấu hình sai hoặc vượt giới hạn plan.
**Giải pháp**:
- Kiểm tra `vercel.json` có đúng format
- Hobby plan chỉ hỗ trợ 1 cron job với tần suất tối thiểu hàng ngày
- Kiểm tra tab **Cron Jobs** trong Vercel Dashboard để xem lịch sử chạy
- Đảm bảo `CRON_SECRET` đã được set trong Vercel Environment Variables
