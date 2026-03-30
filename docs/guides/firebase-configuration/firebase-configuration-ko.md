# HRLite 프로젝트의 Firebase 구성

## 목차

1. [개요](#1-개요)
2. [사용 중인 Firebase 서비스](#2-사용-중인-firebase-서비스)
3. [종속성 설치](#3-종속성-설치)
4. [환경 변수](#4-환경-변수)
5. [Client SDK 구성](#5-client-sdk-구성)
6. [Admin SDK 구성](#6-admin-sdk-구성)
7. [데이터베이스 통합](#7-데이터베이스-통합)
8. [인증 플로우](#8-인증-플로우)
9. [API Endpoints](#9-api-endpoints)
10. [인증 미들웨어](#10-인증-미들웨어)
11. [오류 처리](#11-오류-처리)
12. [데이터 마이그레이션](#12-데이터-마이그레이션)
13. [파일 구조](#13-파일-구조)
14. [Firebase Console 설정 가이드](#14-firebase-console-설정-가이드)
15. [자주 발생하는 문제 해결](#15-자주-발생하는-문제-해결)

---

## 1. 개요

HRLite는 **Firebase Authentication**을 주요 인증 제공자로 사용합니다. Firebase가 비밀번호 관리, 토큰 생성 및 사용자 인증을 전체적으로 처리하며, PostgreSQL은 사용자의 비즈니스 데이터를 저장합니다.

### 전체 아키텍처

```
[클라이언트 (Next.js)]
       │
       ├── Firebase Client SDK ──→ Firebase Auth (Google Cloud)
       │         │
       │    ID Token
       │         │
       ▼         ▼
[API Routes (Next.js)]
       │
       ├── Firebase Admin SDK ──→ 토큰 검증 / 세션 관리
       │
       ▼
[PostgreSQL] ←── Prisma ORM ──→ 사용자 데이터 (firebaseUid 연결)
```

### Firebase 프로젝트 정보

| 속성 | 값 |
|-----|-----|
| Project ID | `hungnd-bb801` |
| Auth Domain | `hungnd-bb801.firebaseapp.com` |
| 로그인 방법 | Email/Password, Google OAuth 2.0 |

---

## 2. 사용 중인 Firebase 서비스

| 서비스 | 목적 | SDK |
|-------|------|-----|
| Authentication | 회원가입, 로그인, 비밀번호 관리 | Client SDK + Admin SDK |
| Google Sign-In | Google 계정으로 로그인 | Client SDK |
| Session Cookie | 서버 측 세션 관리 | Admin SDK |
| Token Verification | 클라이언트 ID 토큰 검증 | Admin SDK |
| User Management | 계정 삭제, 토큰 철회 | Admin SDK |

---

## 3. 종속성 설치

### 설치된 패키지

```json
{
  "dependencies": {
    "firebase": "^12.11.0",
    "firebase-admin": "^13.7.0"
  }
}
```

### 신규 설치 (필요시)

```bash
npm install firebase firebase-admin
```

- **firebase**: Client SDK - 브라우저에서 사용 (회원가입, 로그인, 비밀번호 변경)
- **firebase-admin**: Admin SDK - 서버에서 사용 (토큰 검증, 세션 관리, 사용자 삭제)

---

## 4. 환경 변수

### 파일: `.env`

```env
# Firebase Client (Public - 브라우저에 노출됨)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Firebase Admin (Private - 서버 전용)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# 세션
SESSION_COOKIE_MAX_AGE=432000  # 5일 (초 단위)
```

### 중요 사항

- `NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트 코드에 번들됩니다 — Firebase의 의도된 설계입니다
- `FIREBASE_PRIVATE_KEY`는 반드시 큰따옴표로 감싸고 `\n` 문자를 유지해야 합니다
- **절대** `.env` 파일을 git에 커밋하지 마세요

---

## 5. Client SDK 구성

### 파일: `src/lib/firebase/config.ts`

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Next.js 핫 리로드 시 중복 초기화 방지
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const firebaseAuth = getAuth(app);
```

### 설명

- `getApps()`로 Firebase가 이미 초기화되었는지 확인하여 Next.js 핫 리로드 시 오류를 방지합니다
- `firebaseAuth`는 클라이언트 측 인증 함수에서 사용하기 위해 export됩니다

---

## 6. Admin SDK 구성

### 파일: `src/lib/firebase/admin.ts`

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();
```

### 설명

- Admin SDK는 **Service Account**를 사용하여 인증하며, Firebase Auth 전체를 관리할 수 있는 권한을 갖습니다
- `privateKey.replace(/\\n/g, '\n')`는 환경 변수의 이스케이프 문자를 실제 줄 바꿈으로 변환합니다
- `adminAuth`는 토큰 검증, 세션 쿠키 생성, 사용자 삭제를 위해 export됩니다

---

## 7. 데이터베이스 통합

### Prisma 스키마

```prisma
model User {
  id          String    @id @default(uuid()) @map("USER_ID")
  firebaseUid String?   @unique @map("FIREBASE_UID") @db.VarChar(128)
  email       String    @unique @map("EML_ADDR")
  passwdHash  String?   @map("PASSWD_HASH")  // Firebase 사용자는 Nullable
  // ... 기타 필드
}
```

### Firebase - PostgreSQL 관계

| Firebase Auth | PostgreSQL (TB_COMM_USER) | 설명 |
|--------------|--------------------------|------|
| uid | FIREBASE_UID | Firebase 식별자 |
| email | EML_ADDR | 이메일 주소 |
| (Firebase 관리) | PASSWD_HASH | Firebase 사용자는 Null |
| (해당 없음) | ROLE_CD | 사용자 역할 |
| (해당 없음) | DEPT_CD | 부서 코드 |

- Firebase가 인증 관리 (비밀번호, 토큰)
- PostgreSQL이 비즈니스 데이터 관리 (역할, 부서, 개인정보)

---

## 8. 인증 플로우

### 8.1 이메일/비밀번호 회원가입

```
1. 클라이언트: firebaseSignUp(email, password)
   └→ Firebase 사용자 생성 → ID Token 반환

2. 클라이언트: POST /api/auth/signup (ID Token 전송)
   └→ 서버: adminAuth.verifyIdToken(token)
   └→ 서버: PostgreSQL에 사용자 생성 (firebaseUid 포함)
   └→ 서버: adminAuth.createSessionCookie(token)
   └→ 서버: 쿠키 설정 → 사용자 데이터 반환

3. DB 사용자 생성 실패 시:
   └→ 클라이언트: Firebase 사용자 삭제 (롤백)
```

### 8.2 이메일/비밀번호 로그인

```
1. 클라이언트: firebaseSignIn(email, password)
   └→ Firebase 검증 → ID Token 반환

2. 클라이언트: POST /api/auth/session (ID Token 전송)
   └→ 서버: adminAuth.verifyIdToken(token)
   └→ 서버: firebaseUid로 DB에서 사용자 조회
   └→ 서버: adminAuth.createSessionCookie(token)
   └→ 서버: 쿠키 설정 → 사용자 데이터 반환
```

### 8.3 Google 로그인

```
1. 클라이언트: firebaseGoogleSignIn()
   └→ Google OAuth 팝업 → Firebase 자격 증명 수신 → ID Token

2. 클라이언트: POST /api/auth/session (ID Token 전송)
   └→ 서버: adminAuth.verifyIdToken(token)
   └→ 서버: firebaseUid로 DB에서 사용자 조회
      ├── 있음: 일반 로그인 처리
      └── 없음: 자동 회원가입 (약관 동의 시)
```

### 8.4 로그아웃

```
1. 클라이언트: POST /api/auth/logout
   └→ 서버: adminAuth.revokeRefreshTokens(uid)
   └→ 서버: 세션 쿠키 삭제

2. 클라이언트: firebaseSignOut()
   └→ 클라이언트 측 상태 초기화
```

---

## 9. API Endpoints

| Method | Endpoint | 설명 | Firebase SDK |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | 신규 계정 등록 | `verifyIdToken`, `createSessionCookie` |
| POST | `/api/auth/session` | 세션 생성 (로그인) | `verifyIdToken`, `createSessionCookie` |
| POST | `/api/auth/logout` | 로그아웃 | `revokeRefreshTokens` |
| GET | `/api/users/me` | 현재 사용자 정보 조회 | `verifySessionCookie` |
| DELETE | `/api/users/me` | 계정 삭제 | `deleteUser`, `revokeRefreshTokens` |

---

## 10. 인증 미들웨어

### 파일: `src/lib/auth/middleware.ts`

```typescript
// 세션 쿠키에서 사용자 인증
export async function withAuth(handler) {
  // 1. request에서 세션 쿠키 가져오기
  // 2. adminAuth.verifySessionCookie(sessionCookie, true)
  // 3. firebaseUid로 DB에서 사용자 조회
  // 4. 사용자 정보와 함께 handler 호출
}

// 역할 확인
export async function withRole(roles, handler) {
  // 1. withAuth 먼저 호출
  // 2. user.role이 roles 목록에 있는지 확인
  // 3. 권한 부족 시 403 반환
}
```

---

## 11. 오류 처리

### 파일: `src/lib/firebase/errors.ts`

Firebase는 `auth/error-code` 형식의 오류 코드를 반환합니다. 이 파일은 베트남어 메시지로 매핑합니다.

| Firebase 오류 코드 | 사용자 메시지 |
|-------------------|-------------|
| `auth/email-already-in-use` | 이미 사용 중인 이메일 |
| `auth/invalid-credential` | 잘못된 로그인 정보 |
| `auth/user-not-found` | 계정을 찾을 수 없음 |
| `auth/wrong-password` | 비밀번호가 올바르지 않음 |
| `auth/too-many-requests` | 요청이 너무 많음, 잠시 후 재시도 |
| `auth/network-request-failed` | 네트워크 연결 오류 |
| `auth/popup-closed-by-user` | 로그인 창이 닫힘 |
| `auth/weak-password` | 비밀번호가 너무 약함 (최소 6자) |

---

## 12. 데이터 마이그레이션

### 스크립트: `scripts/migrate-to-firebase.ts`

기존 사용자 (bcrypt 비밀번호 해시 사용)를 Firebase Auth로 마이그레이션하는 스크립트입니다.

```bash
# 테스트 실행 (데이터 변경 없음)
npx tsx scripts/migrate-to-firebase.ts --dry-run

# 실제 실행
npx tsx scripts/migrate-to-firebase.ts
```

### 마이그레이션 프로세스

1. PostgreSQL에서 모든 사용자 읽기 (`passwdHash` 있고, `firebaseUid` 없는)
2. 배치 단위 (100명/배치)로 Firebase Auth에 비밀번호 해시와 함께 가져오기
3. PostgreSQL에서 `firebaseUid` 업데이트
4. 결과 보고 (성공/실패)

---

## 13. 파일 구조

```
src/lib/firebase/
├── config.ts          # Client SDK 구성 (firebaseAuth)
├── admin.ts           # Admin SDK 구성 (adminAuth)
├── auth.ts            # 인증 함수 (signUp, signIn, signOut, ...)
└── errors.ts          # Firebase 오류 코드 → 사용자 메시지 매핑

src/lib/auth/
├── middleware.ts       # withAuth(), withRole() 미들웨어
└── auth-context.tsx    # 인증 상태 React Context

src/app/api/auth/
├── signup/route.ts     # 회원가입 API
├── session/route.ts    # 세션 생성 API
└── logout/route.ts     # 로그아웃 API

scripts/
└── migrate-to-firebase.ts  # 데이터 마이그레이션 스크립트
```

---

## 14. Firebase Console 설정 가이드

### 1단계: Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com) 접속
2. **"Add project"** 클릭 → 프로젝트 이름 입력 → 생성

### 2단계: 인증 방법 활성화

1. **Authentication** → **Sign-in method** 이동
2. **Email/Password** 활성화
3. **Google** 활성화 → OAuth consent screen 구성

### 3단계: Client 구성 가져오기

1. **Project Settings** → **General** 이동
2. **"Your apps"** 섹션에서 Web 아이콘 (`</>`) 클릭
3. `apiKey`, `authDomain`, `projectId` 값을 `.env`에 복사

### 4단계: Service Account 생성

1. **Project Settings** → **Service accounts** 이동
2. **"Generate new private key"** 클릭
3. `project_id`, `client_email`, `private_key` 값을 `.env`에 복사

---

## 15. 자주 발생하는 문제 해결

### 오류: `auth/configuration-not-found`

**원인**: `NEXT_PUBLIC_FIREBASE_*` 환경 변수가 설정되지 않음.
**해결**: `.env` 파일을 확인하고 서버를 재시작합니다.

### 오류: `Firebase Admin SDK initialization failed`

**원인**: `FIREBASE_PRIVATE_KEY` 형식이 잘못됨.
**해결**: private key가 큰따옴표로 감싸져 있고 `\n`을 포함하는지 확인합니다.

### 오류: `auth/session-cookie-expired`

**원인**: 세션 쿠키가 만료됨.
**해결**: `SESSION_COOKIE_MAX_AGE`를 조정하거나 로그인 페이지로 리다이렉트합니다.

### 오류: `Cannot create user - Firebase user already exists`

**원인**: Firebase에 이메일이 등록되어 있지만 PostgreSQL에는 없음.
**해결**: Firebase Auth와 PostgreSQL 간 데이터를 동기화합니다.

### 오류: Google Sign-In 팝업 차단

**원인**: 브라우저가 팝업을 차단함.
**해결**: 애플리케이션 도메인의 팝업을 허용하거나 `signInWithRedirect`로 전환합니다.
