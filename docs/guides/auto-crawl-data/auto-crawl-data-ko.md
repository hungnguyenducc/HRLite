# HRLite 프로젝트의 자동 데이터 크롤링 기능

## 목차

1. [개요](#1-개요)
2. [크롤링 시스템 아키텍처](#2-크롤링-시스템-아키텍처)
3. [데이터 소스](#3-데이터-소스)
4. [Cron Job 구성](#4-cron-job-구성)
5. [크롤링 API Endpoint](#5-크롤링-api-endpoint)
6. [Crawl Service](#6-crawl-service)
7. [데이터베이스 모델](#7-데이터베이스-모델)
8. [Seed Scripts](#8-seed-scripts)
9. [환경 변수](#9-환경-변수)
10. [NPM Scripts](#10-npm-scripts)
11. [데이터 생성 규칙](#11-데이터-생성-규칙)
12. [중복 처리](#12-중복-처리)
13. [Local Cron Script](#13-local-cron-script)
14. [개발 이력](#14-개발-이력)
15. [자주 발생하는 문제 해결](#15-자주-발생하는-문제-해결)

---

## 1. 개요

HRLite에는 [randomuser.me](https://randomuser.me/) API에서 **자동으로 데이터를 크롤링**하여 현실적인 직원, 고객, 주문 샘플 데이터를 생성하는 기능이 있습니다. 시스템은 **Vercel Cron Jobs**를 사용하여 매일 자동으로 실행되며, 수동 트리거를 위한 API 엔드포인트도 제공합니다.

### 주요 특징

| 특징 | 설명 |
|------|------|
| 데이터 소스 | randomuser.me API |
| 자동 실행 빈도 | 매일 00:00 UTC |
| Cron 플랫폼 | Vercel Cron Jobs |
| 기본 수량 | 20명/크롤링 |
| 최대 수량 | 500 레코드/회 |
| 인증 | Bearer 토큰 (CRON_SECRET) |
| 중복 방지 | 이메일 + 직원 번호 확인 |

### 크롤링 데이터 유형

| 유형 | Seed 수량 | 코드 형식 | DB 테이블 |
|------|----------|----------|----------|
| 직원 | 50명 | `NV-{timestamp}{random}` | TB_EMPL |
| 고객 | 1,000명 | `KH-{index}` | TB_CUST |
| 주문 | 3,000건+ | `ORD-{index}` | TB_CUST_ORD |

---

## 2. 크롤링 시스템 아키텍처

### 자동 크롤링 플로우 (Vercel Cron)

```
[Vercel Cron Scheduler]
  │  매일 00:00 UTC 실행
  ▼
[GET /api/crawl/random-users]
  │  Header: Authorization: Bearer <CRON_SECRET>
  ▼
[crawlRandomUsers(count)]
  │
  ├── 1. randomuser.me API 호출
  │      GET https://randomuser.me/api/?results={count}&nat=us,gb,fr,de,au
  │
  ├── 2. DB에서 부서 목록 조회
  │      (COMPANY 루트 부서 제외)
  │
  ├── 3. 이메일 + 직원 번호 중복 확인
  │
  ├── 4. 베트남식 직원 데이터 생성
  │      (VN 전화번호, 베트남어 직위, 무작위 부서)
  │
  └── 5. PostgreSQL에 배치 삽입
         prisma.employee.createMany({ skipDuplicates: true })
```

### 수동 크롤링 플로우

```
[클라이언트/관리자]
  │  POST /api/crawl/random-users
  │  Body: { count: 100 }
  │  Header: Authorization: Bearer <CRON_SECRET>
  ▼
[동일한 crawlRandomUsers(count)]
```

### 고객 + 주문 Seed 데이터 플로우

```
[npm run db:seed:customers]
  │  randomuser.me에서 1,000명 고객 크롤링
  │  (100명/배치, 배치 간 1초 지연)
  ▼
[npm run db:seed:orders]
  │  고객당 1-5개 무작위 주문 생성
  │  (전자제품, VN 결제 방법)
  ▼
[PostgreSQL]
  TB_CUST (1,000 레코드) + TB_CUST_ORD (3,000+ 레코드)
```

---

## 3. 데이터 소스

### API: randomuser.me

| 속성 | 값 |
|-----|-----|
| URL | `https://randomuser.me/api/` |
| 요청당 수량 | 최대 5,000 |
| 지원 국적 | US, GB, FR, DE, AU, BR |
| Rate limit | 공식 제한 없음, 1초 지연 권장 |
| 비용 | 무료 |

### API로부터 수신하는 데이터

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

### 데이터 매핑

| randomuser.me | HRLite (직원) | HRLite (고객) |
|--------------|--------------|--------------|
| name.first + name.last | emplNm | custNm |
| email | → VN 형식으로 새로 생성 | email (Gmail) |
| phone | → VN 전화번호 생성 | phoneNo (VN 전화번호) |
| dob.date | birthDt | birthDt |
| gender | gendrCd (M/F) | gendrCd (M/F) |
| picture.thumbnail | photoUrl | photoUrl |
| location | — | addr, city, countryCd |

---

## 4. Cron Job 구성

### 파일: `vercel.json`

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

### 스케줄 설명

| 필드 | 값 | 의미 |
|------|-----|------|
| 분 | `0` | 0분 |
| 시 | `0` | 0시 (자정) |
| 일 | `*` | 매일 |
| 월 | `*` | 매월 |
| 요일 | `*` | 매 요일 |

**결과**: **매일 1회** 00:00 UTC에 실행.

### 스케줄 변경 이력

| 버전 | 스케줄 | 이유 |
|------|--------|------|
| 초기 | `0 * * * *` (매시간) | 지속적 업데이트 |
| 현재 | `0 0 * * *` (매일) | Vercel Hobby 플랜 제한 (1 cron/일) |

### Vercel 플랜별 Cron 제한

| 플랜 | Cron Job 수 | 최소 빈도 |
|------|------------|----------|
| Hobby | 1개 | 매일 |
| Pro | 40개 | 매분 |
| Enterprise | 100개 | 매분 |

---

## 5. 크롤링 API Endpoint

### 파일: `src/app/api/crawl/random-users/route.ts`

### GET - Vercel Cron 트리거

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

### POST - 수동 트리거

```
POST /api/crawl/random-users
Header: Authorization: Bearer <CRON_SECRET>
Body: { "count": 100 }   // 선택 사항, 기본값 20, 최대 500

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

### 인증

GET과 POST 모두 `Authorization: Bearer <CRON_SECRET>` 헤더가 필요합니다:

```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

### 응답 형식

| 필드 | 타입 | 설명 |
|------|------|------|
| `success` | boolean | 성공 여부 |
| `data.totalCrawled` | number | API에서 가져온 총 레코드 수 |
| `data.created` | number | DB에 새로 생성된 레코드 수 |
| `data.skipped` | number | 건너뛴 레코드 수 (중복) |
| `data.totalInDb` | number | 크롤링 후 DB 총 레코드 수 |
| `error` | string? | 오류 메시지 (있는 경우) |

---

## 6. Crawl Service

### 파일: `src/lib/crawl-service.ts`

### 메인 함수: `crawlRandomUsers(count)`

```typescript
export async function crawlRandomUsers(count: number): Promise<CrawlResult> {
  // 1. randomuser.me API 호출
  const response = await fetch(
    `https://randomuser.me/api/?results=${count}&nat=us,gb,fr,de,au`
  );
  const { results } = await response.json();

  // 2. 사용 가능한 부서 조회 (COMPANY 제외)
  const departments = await prisma.department.findMany({
    where: { parentId: { not: null } }
  });

  // 3. 이메일 + 직원 번호 중복 확인
  const existingEmails = await prisma.employee.findMany({
    select: { email: true }
  });

  // 4. 직원 데이터 생성
  const employees = results.map(user => ({
    emplNo: generateEmployeeNo(),     // NV-{timestamp}{random}
    emplNm: `${user.name.first} ${user.name.last}`,
    email: generateVnEmail(user),      // first.last{random}@gmail.com
    phoneNo: generateVnPhone(),        // 090xxxxxxx
    position: randomPosition(),        // 무작위 직위
    deptId: randomDepartment(departments),
    joinDt: randomJoinDate(),          // 최근 5년 내
    emplSttsCd: 'WORKING',
    creatBy: 'CRAWL_AUTO',
  }));

  // 5. 배치 삽입
  const result = await prisma.employee.createMany({
    data: employees,
    skipDuplicates: true,
  });

  return { totalCrawled: count, created: result.count, ... };
}
```

### 샘플 직위 목록

```typescript
const POSITIONS = [
  'Nhân viên',           // 사원
  'Chuyên viên',         // 전문위원
  'Senior Developer',    // 시니어 개발자
  'Junior Developer',    // 주니어 개발자
  'Trưởng nhóm',        // 팀장
  'Kế toán',            // 회계사
  'Nhân viên kinh doanh', // 영업사원
  'QA Engineer',         // QA 엔지니어
  'Designer',            // 디자이너
  'DevOps Engineer',     // DevOps 엔지니어
  'Business Analyst',    // 비즈니스 분석가
  'Project Manager',     // 프로젝트 매니저
];
```

### 베트남 전화번호 생성

```typescript
const VN_PREFIXES = ['090', '091', '093', '094', '096', '097', '098', '032', '033', '034'];

function generateVnPhone(): string {
  const prefix = VN_PREFIXES[Math.floor(Math.random() * VN_PREFIXES.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${number}`;
}
```

---

## 7. 데이터베이스 모델

### 7.1 Employee (TB_EMPL) — 직원 크롤링 데이터

기존 직원 테이블에 크롤링 데이터가 추가됩니다:

| 컬럼 | 타입 | 설명 | 크롤링 값 |
|------|------|------|----------|
| EMPL_NO | String | 직원 번호 | `NV-{timestamp}{random}` |
| EMPL_NM | String | 직원 이름 | API의 `{first} {last}` |
| EMAIL | String | 이메일 | `{first}.{last}{random}@gmail.com` |
| PHONE_NO | String | 전화번호 | VN 무작위 전화번호 |
| POSITION | String | 직위 | 12개 직위 중 무작위 |
| DEPT_ID | String | FK 부서 | 무작위 부서 |
| JOIN_DT | DateTime | 입사일 | 5년 내 무작위 |
| EMPL_STTS_CD | String | 상태 | `WORKING` |
| CREAT_BY | String | 생성자 | `CRAWL_AUTO` |

### 7.2 Customer (TB_CUST) — 고객 크롤링 데이터

```prisma
model Customer {
  id         String    @id @default(uuid()) @map("CUST_ID")
  custNo     String    @unique @map("CUST_NO")       // KH-000001
  custNm     String    @map("CUST_NM")               // 전체 이름
  email      String    @unique @map("EMAIL")          // Gmail 이메일
  phoneNo    String?   @map("PHONE_NO")               // VN 전화번호
  birthDt    DateTime? @map("BIRTH_DT") @db.Date      // 생년월일
  gendrCd    String?   @map("GENDR_CD")               // M 또는 F
  addr       String?   @map("ADDR")                   // 주소
  city       String?   @map("CITY")                   // 도시
  countryCd  String?   @map("CNTRY_CD")               // ISO 국가 코드
  photoUrl   String?   @map("PHOTO_URL")              // 썸네일 사진
  emplId     String?   @map("EMPL_ID")                // FK 담당 직원
  custSttsCd String    @default("ACTIVE") @map("CUST_STTS_CD")
  creatBy    String    @map("CREAT_BY")               // CRAWL_SEED
  delYn      String    @default("N") @map("DEL_YN")

  employee Employee?        @relation(...)
  orders   CustomerOrder[]

  @@map("TB_CUST")
}
```

### 7.3 CustomerOrder (TB_CUST_ORD) — 샘플 주문 데이터

```prisma
model CustomerOrder {
  id        String    @id @default(uuid()) @map("CUST_ORD_ID")
  ordNo     String    @unique @map("ORD_NO")          // ORD-000001
  custId    String    @map("CUST_ID")                  // FK 고객
  ordDt     DateTime  @default(now()) @map("ORD_DT")   // 주문일
  ordSttsCd String    @default("PENDING") @map("ORD_STTS_CD")
  totAmt    Decimal   @map("TOT_AMT") @db.Decimal(12,2)
  prdctNm   String    @map("PRDCT_NM")                // 제품명
  qty       Int       @map("QTY")                      // 수량 (1-3)
  unitPrc   Decimal   @map("UNIT_PRC") @db.Decimal(12,2)
  payMthdCd String?   @map("PAY_MTHD_CD")             // 결제 방법
  creatBy   String    @map("CREAT_BY")                 // CRAWL_SEED
  delYn     String    @default("N") @map("DEL_YN")

  customer Customer @relation(...)

  @@map("TB_CUST_ORD")
}
```

### 데이터 관계

```
TB_EMPL (직원)
  │
  └── 1:N ──→ TB_CUST (고객)
                │
                └── 1:N ──→ TB_CUST_ORD (주문)
```

---

## 8. Seed Scripts

### 8.1 직원 Seed

#### 파일: `prisma/seed-crawl.ts`

```bash
npm run db:seed:crawl
# 또는
npx tsx prisma/seed-crawl.ts
```

| 속성 | 값 |
|-----|-----|
| 수량 | 50명 |
| 직원 번호 | `NV-{index}` |
| 부서 | 무작위 (COMPANY 제외) |
| 생성자 | `CRAWL_SEED` |

### 8.2 고객 Seed

#### 파일: `prisma/seed-customers.ts`

```bash
npm run db:seed:customers
# 또는
npx tsx prisma/seed-customers.ts
```

| 속성 | 값 |
|-----|-----|
| 수량 | 1,000명 |
| 배치 크기 | 100명/요청 |
| 배치 간 지연 | 1초 |
| 고객 번호 | `KH-000001` → `KH-001000` |
| 국적 | US, GB, FR, DE, AU, BR |
| 생성자 | `CRAWL_SEED` |

### 8.3 주문 Seed

#### 파일: `prisma/seed-orders.ts`

```bash
npm run db:seed:orders
# 또는
npx tsx prisma/seed-orders.ts
```

| 속성 | 값 |
|-----|-----|
| 수량 | 고객당 1-5개 주문 (총 3,000건+) |
| 주문 번호 | `ORD-000001` → `ORD-00xxxx` |
| 제품 | 15개 전자제품 샘플 |
| 주문일 | 최근 90일 내 무작위 |
| 수량 | 제품당 1-3개 |
| 생성자 | `CRAWL_SEED` |

### 샘플 제품 목록

Laptop, Smartphone, 이어폰, 키보드, 마우스, 모니터, 태블릿, 스마트워치, 블루투스 스피커, 보조 배터리, SSD, 웹캠, 프린터, WiFi 라우터, USB 플래시 드라이브.

### 결제 방법

| 코드 | 설명 |
|------|------|
| `CARD` | 신용/체크카드 |
| `BANK_TRANSFER` | 계좌이체 |
| `COD` | 착불 |
| `MOMO` | MoMo 월렛 |
| `ZALOPAY` | ZaloPay |

### 주문 상태

| 코드 | 설명 |
|------|------|
| `PENDING` | 처리 대기 |
| `CONFIRMED` | 확인됨 |
| `SHIPPING` | 배송 중 |
| `DELIVERED` | 배송 완료 |
| `CANCELLED` | 취소됨 |

---

## 9. 환경 변수

### 파일: `.env`

```env
# Cron Job 인증
CRON_SECRET=your_secret_token

# 데이터베이스 (크롤 서비스에 필수)
DATABASE_URL=postgresql://user:pass@host:port/db
DIRECT_URL=postgresql://user:pass@host:port/db   # Vercel 프로덕션
```

### 참고 사항

- `CRON_SECRET`은 Vercel Environment Variables와 Authorization 헤더 간에 일치해야 합니다
- Vercel은 cron 트리거 시 자동으로 `Authorization: Bearer <CRON_SECRET>` 헤더를 전송합니다
- 수동 테스트 시 직접 헤더를 추가해야 합니다

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

### 올바른 Seed 실행 순서

```bash
# 1. 직원을 먼저 Seed (고객이 직원에 FK 참조)
npm run db:seed:crawl

# 2. 고객 Seed
npm run db:seed:customers

# 3. 주문 Seed (고객에 의존)
npm run db:seed:orders
```

---

## 11. 데이터 생성 규칙

### 직원 번호 (emplNo)

```
NV-{timestamp}{random}
│    │          │
│    │          └── 2자리 무작위 문자 (0-9, a-z)
│    └── Unix timestamp (밀리초)
└── 고정 접두사 "NV-" (Nhân Viên = 직원)

예: NV-1711497600ab
```

### 직원 이메일

```
{first}.{last}{random2}@gmail.com

예: john.doe42@gmail.com
```

### 베트남 전화번호

```
{접두사}{7자리 무작위 숫자}

접두사: 090, 091, 093, 094, 096, 097, 098, 032, 033, 034
예: 0901234567
```

### 입사일

```
[오늘 - 5년, 오늘] 범위 내 무작위 날짜
```

---

## 12. 중복 처리

### 전략

```typescript
// 1. 삽입 전 확인
const existingEmails = await prisma.employee.findMany({
  select: { email: true }
});
const emailSet = new Set(existingEmails.map(e => e.email));

// 2. 중복 레코드 필터링
const newEmployees = employees.filter(e => !emailSet.has(e.email));

// 3. skipDuplicates로 배치 삽입
await prisma.employee.createMany({
  data: newEmployees,
  skipDuplicates: true,  // unique constraint 충돌 시 건너뜀
});
```

### 확인되는 Unique Constraints

| 테이블 | Unique 컬럼 | 중복 시 동작 |
|--------|------------|------------|
| TB_EMPL | EMPL_NO, EMAIL | 건너뜀 (skipDuplicates) |
| TB_CUST | CUST_NO, EMAIL | 건너뜀 (skipDuplicates) |
| TB_CUST_ORD | ORD_NO | 건너뜀 (skipDuplicates) |

---

## 13. Local Cron Script

### 파일: `scripts/crawl-cron.sh`

```bash
#!/bin/bash
# crontab 설치:
# 0 * * * * /Applications/Workspace/HRLite/scripts/crawl-cron.sh >> /Applications/Workspace/HRLite/logs/crawl.log 2>&1

cd /Applications/Workspace/HRLite
npx tsx prisma/seed-crawl.ts
```

### Local crontab 설치

```bash
# crontab 편집기 열기
crontab -e

# 다음 줄 추가 (매시간 실행)
0 * * * * /Applications/Workspace/HRLite/scripts/crawl-cron.sh >> /Applications/Workspace/HRLite/logs/crawl.log 2>&1
```

### 참고 사항

- 로컬 스크립트는 API 엔드포인트를 거치지 않고 `seed-crawl.ts`를 직접 실행합니다
- crontab의 PATH에 `npx`가 포함되어 있는지 확인해야 합니다
- 로그는 `logs/crawl.log`에 기록됩니다

---

## 14. 개발 이력

| 커밋 | 날짜 | 변경 사항 |
|------|------|----------|
| `83057ca` | 2026-03-26 | feat: randomuser.me에서 웹 크롤링 + 고객 모듈 추가 |
| `26583b8` | 2026-03-26 | fix: 프로덕션 타임아웃 방지를 위한 크롤 cron job 최적화 |
| `e5dc6f5` | 2026-03-27 | fix: 크롤 스크립트를 curl 대신 Node.js로 직접 실행으로 변경 |
| `d28856f` | 2026-03-27 | fix: Hobby 플랜 호환을 위해 Vercel cron을 daily로 변경 |

### 해결된 문제

1. **프로덕션 타임아웃**: 기본 크롤링 수량 줄이고 쿼리 최적화
2. **cron에서 curl 작동 안 함**: `npx tsx`로 직접 실행으로 전환
3. **Vercel Hobby 플랜 제한**: 스케줄을 매시간에서 매일로 변경

---

## 15. 자주 발생하는 문제 해결

### 오류: 크롤 API 호출 시 `401 Unauthorized`

**원인**: Authorization 헤더가 없거나 잘못됨.
**해결**:
- Vercel Environment Variables에서 `CRON_SECRET` 변수 확인
- 헤더 형식 확인: `Authorization: Bearer <CRON_SECRET>`

### 오류: crontab에서 `npx: command not found`

**원인**: crontab의 PATH에 Node.js가 포함되지 않음.
**해결**:
```bash
# crawl-cron.sh 스크립트 시작 부분에 PATH 추가
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

### 오류: `randomuser.me API timeout`

**원인**: 외부 API 응답이 느리거나 사용 불가.
**해결**:
- `count`를 줄임 (500 대신 20-50)
- exponential backoff을 사용한 재시도 로직 추가
- https://randomuser.me/ 에서 API 상태 확인

### 오류: skipDuplicates인데 `Unique constraint violation`

**원인**: 동시에 여러 크롤링 실행 시 Race condition.
**해결**:
- 동시에 여러 크롤링 세션이 실행되지 않도록 확인
- 필요시 distributed lock 사용

### 크롤링 데이터가 프론트엔드에 표시되지 않음

**원인**: 캐시 또는 필터 조건 문제.
**해결**:
- 쿼리에서 `delYn = 'N'` 확인
- `emplSttsCd = 'WORKING'` 또는 `custSttsCd = 'ACTIVE'` 확인
- 캐시 삭제 후 페이지 새로고침

### Vercel Cron이 실행되지 않음

**원인**: 구성 오류 또는 플랜 제한 초과.
**해결**:
- `vercel.json` 형식이 올바른지 확인
- Hobby 플랜은 최소 빈도가 매일인 1개의 cron job만 지원
- Vercel Dashboard의 **Cron Jobs** 탭에서 실행 이력 확인
- `CRON_SECRET`이 Vercel Environment Variables에 설정되어 있는지 확인
