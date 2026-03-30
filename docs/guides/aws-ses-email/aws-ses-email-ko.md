# HRLite 프로젝트의 AWS SES 이메일 구성

## 목차

1. [개요](#1-개요)
2. [이메일 시스템 아키텍처](#2-이메일-시스템-아키텍처)
3. [종속성 설치](#3-종속성-설치)
4. [환경 변수](#4-환경-변수)
5. [SMTP Transport 구성](#5-smtp-transport-구성)
6. [핵심 이메일 전송 함수](#6-핵심-이메일-전송-함수)
7. [이메일 템플릿 시스템](#7-이메일-템플릿-시스템)
8. [휴가 알림 함수](#8-휴가-알림-함수)
9. [API 통합](#9-api-통합)
10. [보안](#10-보안)
11. [오류 처리 및 로깅](#11-오류-처리-및-로깅)
12. [Development vs Production 모드](#12-development-vs-production-모드)
13. [파일 구조](#13-파일-구조)
14. [AWS SES Console 설정 가이드](#14-aws-ses-console-설정-가이드)
15. [자주 발생하는 문제 해결](#15-자주-발생하는-문제-해결)

---

## 1. 개요

HRLite는 **AWS SES (Simple Email Service)**를 **SMTP** 프로토콜과 **nodemailer** 라이브러리를 통해 사용하여 자동 이메일 알림을 전송합니다. 현재 시스템은 휴가 신청이 승인 또는 거절되었을 때 알림을 지원합니다.

### 주요 특징

| 특징 | 설명 |
|------|------|
| 프로토콜 | TLS를 통한 SMTP (포트 587) |
| 제공자 | AWS SES (ap-southeast-1) |
| 라이브러리 | nodemailer |
| 패턴 | Fire-and-forget (API 응답 차단 없음) |
| 템플릿 | String interpolation을 사용한 HTML |
| 보안 | XSS 방지를 위한 HTML 이스케이프 |

---

## 2. 이메일 시스템 아키텍처

### 이메일 전송 플로우

```
[API Route (Leave Approve/Reject)]
       │
       ▼
[Notification Function]
  sendLeaveApprovedEmail() / sendLeaveRejectedEmail()
       │
       ▼
[Template Engine]
  baseLayout() + leaveApprovedTemplate() / leaveRejectedTemplate()
       │
       ▼
[Send Email Function]
  sendEmail({ to, subject, html })
       │
       ├── DEV MODE: 이메일 내용 로그 → 실제 전송 안 함
       │
       └── PRODUCTION: nodemailer SMTP transporter
                │
                ▼
          [AWS SES SMTP]
          email-smtp.ap-southeast-1.amazonaws.com:587
                │
                ▼
          [수신자 메일함]
```

### Fire-and-Forget 패턴

```
API 요청 → 비즈니스 로직 처리 → 응답 반환 → 이메일 전송 (비동기, 대기 없음)
```

이메일은 API가 클라이언트에 응답을 반환한 **후에** 전송됩니다. 이메일 전송이 실패하더라도 API는 성공합니다 — 오류는 로그에만 기록됩니다.

---

## 3. 종속성 설치

### 설치된 패키지

```json
{
  "dependencies": {
    "nodemailer": "^8.0.3"
  },
  "devDependencies": {
    "@types/nodemailer": "^7.0.11"
  }
}
```

### 신규 설치 (필요시)

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

### @aws-sdk/client-ses 대신 nodemailer를 사용하는 이유

- **간편함**: SMTP 구성은 host/port/user/pass만 필요
- **유연성**: 다른 이메일 제공자 (SendGrid, Mailgun)로 쉽게 전환 가능
- **호환성**: 모든 SMTP 서버와 작동, AWS SDK 종속 없음

---

## 4. 환경 변수

### 파일: `.env`

```env
# AWS SES SMTP 구성
SMTP_HOST="email-smtp.ap-southeast-1.amazonaws.com"
SMTP_PORT=587
SMTP_USER="your-aws-ses-smtp-username"
SMTP_PASS="your-aws-ses-smtp-password"
SMTP_FROM_EMAIL="noreply@yourdomain.com"
SMTP_FROM_NAME="HRLite"
```

### 변수 설명

| 변수 | 설명 | 예시 |
|------|------|------|
| `SMTP_HOST` | AWS SES 리전별 SMTP 엔드포인트 | `email-smtp.ap-southeast-1.amazonaws.com` |
| `SMTP_PORT` | TLS를 사용하는 SMTP 포트 | `587` |
| `SMTP_USER` | SMTP 사용자 이름 (AWS IAM에서 생성) | `AKIA...` |
| `SMTP_PASS` | SMTP 비밀번호 (AWS IAM에서 생성) | `BE3L...` |
| `SMTP_FROM_EMAIL` | 발신자 이메일 주소 (SES에서 인증됨) | `noreply@yourdomain.com` |
| `SMTP_FROM_NAME` | 발신자 표시 이름 | `HRLite` |

### 리전별 AWS SES SMTP 엔드포인트

| 리전 | 엔드포인트 |
|------|-----------|
| ap-southeast-1 (싱가포르) | `email-smtp.ap-southeast-1.amazonaws.com` |
| us-east-1 (N. 버지니아) | `email-smtp.us-east-1.amazonaws.com` |
| eu-west-1 (아일랜드) | `email-smtp.eu-west-1.amazonaws.com` |
| ap-northeast-1 (도쿄) | `email-smtp.ap-northeast-1.amazonaws.com` |

### 중요 사항

- `SMTP_USER`와 `SMTP_PASS`는 **SMTP 자격 증명**이며, 일반 AWS Access Key가 아닙니다
- SMTP 자격 증명은 AWS SES Console에서 별도로 생성됩니다
- `SMTP_FROM_EMAIL`은 AWS SES에서 **인증된** (verified) 이메일/도메인이어야 합니다
- **절대** `.env` 파일을 git에 커밋하지 마세요

---

## 5. SMTP Transport 구성

### 파일: `src/lib/email/smtp-transport.ts`

```typescript
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

// 구성 확인
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  logger.warn('[Email] SMTP 자격 증명이 구성되지 않았습니다');
}

// SMTP transporter 생성
export const smtpTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: false,  // SSL이 아닌 STARTTLS를 통한 TLS
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});
```

### 설명

- `secure: false` + 포트 587 = **STARTTLS** 사용 (연결을 TLS로 업그레이드)
- `secure: true` + 포트 465 = **SSL** 직접 사용
- AWS SES는 포트 587과 STARTTLS 사용을 권장합니다
- 자격 증명이 없으면 경고를 로그하지만 애플리케이션을 중단하지 않습니다

---

## 6. 핵심 이메일 전송 함수

### 파일: `src/lib/email/send-email.ts`

```typescript
interface SendEmailParams {
  to: string | string[];    // 수신자 (단일 또는 복수)
  subject: string;          // 제목
  html: string;             // HTML 내용
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  // DEV MODE: 로그만, 실제 전송 안 함
  if (process.env.NODE_ENV === 'development') {
    logger.info('[Email] DEV MODE — 실제 전송 안 함', { to, subject });
    return true;
  }

  // PRODUCTION: AWS SES SMTP를 통해 전송
  try {
    const info = await smtpTransporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    logger.info('[Email] 전송 성공', { messageId: info.messageId, to });
    return true;
  } catch (error) {
    logger.error('[Email] 전송 실패', { error, to, subject });
    return false;
  }
}
```

### 특징

- **단일 또는 복수** 수신자 지원
- **예외를 throw하지 않음** — `boolean` 반환으로 caller가 처리 결정
- DEV MODE에서 자동으로 실제 전송 건너뜀, 로컬 개발에 편리
- 완전한 메타데이터 로깅 (messageId, to, subject, error)

---

## 7. 이메일 템플릿 시스템

### 7.1 Base Layout

#### 파일: `src/lib/email/templates/base-layout.ts`

```typescript
export function baseLayout(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background:#f4f4f4;">
      <table width="600" align="center" style="background:#fff;">
        <!-- 헤더: HRLite 로고 (파란색 배경 #1e40af) -->
        <tr>
          <td style="background:#1e40af; color:#fff; padding:20px; text-align:center;">
            <h1>HRLite</h1>
          </td>
        </tr>
        <!-- 내용 -->
        <tr>
          <td style="padding:30px;">
            ${content}
          </td>
        </tr>
        <!-- 푸터 -->
        <tr>
          <td style="padding:20px; text-align:center; color:#888; font-size:12px;">
            이 이메일은 HRLite 시스템에서 자동 발송되었습니다.
            이 이메일에 답장하지 마세요.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
```

### 7.2 휴가 승인 템플릿

#### 파일: `src/lib/email/templates/leave-approved.ts`

| 표시 정보 | 변수 |
|----------|------|
| 직원 이름 | `employeeName` |
| 휴가 유형 | `leaveType` |
| 시작일 | `startDate` |
| 종료일 | `endDate` |
| 총 일수 | `totalDays` |
| 승인자 | `approverName` |

- **초록색** 배너와 체크마크 아이콘
- 휴가 신청 상세 정보 테이블

### 7.3 휴가 거절 템플릿

#### 파일: `src/lib/email/templates/leave-rejected.ts`

승인 템플릿과 동일하며 추가 사항:
- **빨간색** 배너로 거절 알림
- **거절 사유** 필드 (선택 사항, 조건부 렌더링)

### 보안 유틸리티

#### 파일: `src/lib/email/utils.ts`

```typescript
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

모든 동적 변수는 HTML 템플릿에 삽입되기 전에 이스케이프되어 **XSS를 방지**합니다.

---

## 8. 휴가 알림 함수

### 파일: `src/lib/email/notifications/leave-email.ts`

```typescript
// 휴가 신청이 승인되었을 때 이메일 전송
export async function sendLeaveApprovedEmail(params: {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  approverName: string;
}): Promise<void> {
  const html = baseLayout(leaveApprovedTemplate(params));
  await sendEmail({
    to: params.employeeEmail,
    subject: `[HRLite] 휴가 신청이 승인되었습니다`,
    html,
  });
}

// 휴가 신청이 거절되었을 때 이메일 전송
export async function sendLeaveRejectedEmail(params: {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  approverName: string;
  reason?: string;         // 거절 사유 (선택 사항)
}): Promise<void> {
  const html = baseLayout(leaveRejectedTemplate(params));
  await sendEmail({
    to: params.employeeEmail,
    subject: `[HRLite] 휴가 신청이 거절되었습니다`,
    html,
  });
}
```

---

## 9. API 통합

### 9.1 휴가 승인 API

#### 파일: `src/app/api/leave/[id]/approve/route.ts`

```
PATCH /api/leave/:id/approve
  │
  ├── 1. 사용자 인증 (withAuth 미들웨어)
  ├── 2. DB에서 휴가 신청 조회
  ├── 3. 상태 → APPROVED로 업데이트 (atomic updateMany)
  ├── 4. 클라이언트에 성공 응답 반환
  └── 5. 승인 알림 이메일 전송 (fire-and-forget)
         └── sendLeaveApprovedEmail(...)
```

### 9.2 휴가 거절 API

#### 파일: `src/app/api/leave/[id]/reject/route.ts`

```
PATCH /api/leave/:id/reject
  Body: { reason?: string }  // Zod 유효성 검사
  │
  ├── 1. 사용자 인증 (withAuth 미들웨어)
  ├── 2. Zod 스키마로 body 유효성 검사
  ├── 3. DB에서 휴가 신청 조회
  ├── 4. 상태 → REJECTED + 사유로 업데이트 (atomic updateMany)
  ├── 5. 클라이언트에 성공 응답 반환
  └── 6. 거절 알림 이메일 전송 (fire-and-forget)
         └── sendLeaveRejectedEmail(...)
```

### Atomic Update

```typescript
// Race condition 방지: 상태가 PENDING일 때만 업데이트
await prisma.leaveRequest.updateMany({
  where: {
    id: leaveId,
    status: 'PENDING',  // ← 현재 상태 확인
  },
  data: {
    status: 'APPROVED',
    // ...
  },
});
```

---

## 10. 보안

| 보안 조치 | 상세 내용 |
|----------|----------|
| HTML 이스케이프 | 모든 동적 변수는 `escapeHtml()`로 이스케이프 후 템플릿에 삽입 |
| 자격 증명 | 환경 변수에 저장, 하드코딩 없음 |
| TLS/STARTTLS | SMTP 연결 암호화 (포트 587) |
| 인증된 발신자 | AWS SES에서 인증된 도메인/이메일에서만 발송 |
| No Reply | noreply@ 주소 사용으로 회신 방지 |
| XSS 방지 | E2E 테스트 케이스로 직원 이름에 스크립트 삽입 검증 |

### SMTP 사용자를 위한 IAM 정책

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ses:SendRawEmail",
      "Resource": "*"
    }
  ]
}
```

---

## 11. 오류 처리 및 로깅

### 오류 처리 전략

| 상황 | 동작 |
|------|------|
| SMTP 자격 증명 누락 | 시작 시 경고 로그, 이메일 전송 불가 |
| 이메일 전송 실패 | 상세 오류 로그, API는 성공으로 반환 |
| 잘못된 이메일 | 오류 로그, 예외 throw 안 함 |
| SMTP 연결 오류 | 오류 로그, nodemailer 자동 재시도 |

### 로그 예시

```
// 성공
[Email] 전송 성공 { messageId: "0100018...", to: "user@example.com" }

// 실패
[Email] 전송 실패 { error: "Connection timeout", to: "user@example.com", subject: "..." }

// DEV 모드
[Email] DEV MODE — 실제 전송 안 함 { to: "user@example.com", subject: "..." }
```

---

## 12. Development vs Production 모드

| 특징 | Development | Production |
|------|-------------|------------|
| 실제 이메일 전송 | 안 함 | 함 |
| SMTP 연결 | 연결 안 함 | AWS SES 연결 |
| 출력 | 이메일 내용 로그 | SES의 messageId 로그 |
| 자격 증명 필요 | 필수 아님 | 필수 |
| 확인 | 로그로 내용 검증 | 수신자 메일함 확인 |

### 모드 전환

```env
# Development (next dev 실행 시 기본값)
NODE_ENV=development

# Production
NODE_ENV=production
```

---

## 13. 파일 구조

```
src/lib/email/
├── smtp-transport.ts              # SMTP transporter 초기화 (AWS SES)
├── send-email.ts                  # 핵심 이메일 전송 함수
├── utils.ts                       # HTML 이스케이프 유틸리티 (XSS 방지)
├── templates/
│   ├── base-layout.ts             # 공통 HTML 레이아웃 (헤더 + 푸터)
│   ├── leave-approved.ts          # 승인 알림 템플릿
│   └── leave-rejected.ts          # 거절 알림 템플릿
└── notifications/
    └── leave-email.ts             # 휴가 알림 함수

통합 지점:
├── src/app/api/leave/[id]/approve/route.ts
└── src/app/api/leave/[id]/reject/route.ts

문서:
├── docs/blueprints/007-email/blueprint.md
├── docs/sprints/sprint-5-email-service/
│   ├── prompt-map.md
│   ├── progress.md
│   └── retrospective.md
└── docs/tests/
    ├── test-cases/sprint-5/email-service-e2e-scenarios.md
    └── test-reports/sprint-5-email-service-report.md
```

---

## 14. AWS SES Console 설정 가이드

### 1단계: 발신 이메일/도메인 인증

1. [AWS SES Console](https://console.aws.amazon.com/ses/) 접속
2. 리전 **ap-southeast-1** (싱가포르) 선택
3. **Verified identities** → **Create identity** 이동
4. **Email address** 또는 **Domain** 선택
5. 인증 완료 (이메일 링크 클릭 또는 DNS 설정)

### 2단계: SMTP 자격 증명 생성

1. SES Console에서 **SMTP settings** 이동
2. **"Create SMTP credentials"** 클릭
3. SMTP용 IAM 사용자 생성
4. SMTP Username과 Password **저장** (한 번만 표시됨)
5. `.env`의 `SMTP_USER`와 `SMTP_PASS`에 복사

### 3단계: Sandbox 모드 해제 (프로덕션)

> 기본적으로 AWS SES는 **Sandbox** 모드입니다 — 인증된 이메일로만 전송 가능합니다.

1. **Account dashboard** → **Request production access** 이동
2. 정보 입력:
   - Mail type: Transactional
   - Website URL: 애플리케이션 URL
   - Use case: 내부 직원을 위한 휴가 알림
3. AWS 승인 대기 (보통 24-48시간)

### 4단계: 연결 테스트

```bash
# 터미널에서 SMTP 연결 테스트
openssl s_client -starttls smtp -connect email-smtp.ap-southeast-1.amazonaws.com:587
```

---

## 15. 자주 발생하는 문제 해결

### 오류: `Connection timeout` 이메일 전송 시

**원인**: 방화벽 또는 보안 그룹이 포트 587을 차단.
**해결**:
- 포트 587에 대한 아웃바운드 규칙 확인
- 587이 차단된 경우 포트 465 (SSL) 시도
- `SMTP_HOST`가 올바른 리전인지 확인

### 오류: `535 Authentication failed`

**원인**: SMTP 자격 증명이 잘못됨.
**해결**:
- SES Console에서 SMTP 자격 증명 재생성
- **SMTP 자격 증명**을 사용하는지 확인 (AWS Access Key 아님)
- IAM 사용자에 `ses:SendRawEmail` 정책이 있는지 확인

### 오류: `554 Message rejected: Email address is not verified`

**원인**: Sandbox 모드에서 수신자 이메일이 인증되지 않음.
**해결**:
- **Verified identities**에 수신자 이메일 추가 (Sandbox용)
- 또는 **Production access** 요청하여 모든 이메일로 전송

### 오류: `Daily sending quota exceeded`

**원인**: 일일 이메일 전송 한도 초과.
**해결**:
- Sandbox: 200통/일
- Production: AWS Support를 통해 한도 증가 요청
- `Account dashboard`에서 현재 한도 확인

### 이메일 전송 성공했으나 수신 안 됨

**원인**: 이메일이 스팸으로 분류되었거나 바운스됨.
**해결**:
- 스팸/정크 폴더 확인
- 도메인에 **SPF**, **DKIM**, **DMARC** 설정
- SES Console에서 **Bounce** 및 **Complaint** 지표 확인
- Gmail 대신 인증된 도메인 이메일 사용

### 로그에 `[Email] DEV MODE` 표시되는데 프로덕션 환경인 경우

**원인**: `NODE_ENV`가 `production`으로 설정되지 않음.
**해결**: 서버에서 `NODE_ENV=production` 환경 변수를 확인합니다.
