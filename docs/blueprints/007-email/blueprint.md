# Blueprint 007: Email Service (AWS SES)

> Tài liệu thiết kế chi tiết cho module dịch vụ email — HRLite

## 1. Tổng quan

Module Email cung cấp dịch vụ gửi email tập trung cho toàn bộ hệ thống HRLite, sử dụng **AWS SES (Simple Email Service)** làm provider. Đây là module hạ tầng (infrastructure), không có giao diện riêng, phục vụ cho các module nghiệp vụ khác.

### Đặc điểm chính
- **Dịch vụ gửi email tập trung**: Một điểm duy nhất để gửi email, các module khác gọi qua hàm utility
- **Template-based**: Email được render từ template HTML có sẵn, hỗ trợ biến động (dynamic variables)
- **Async & Non-blocking**: Gửi email không chặn luồng xử lý chính, lỗi gửi email không ảnh hưởng đến nghiệp vụ
- **Logging**: Ghi log mỗi lần gửi email (thành công/thất bại) để theo dõi và debug

### Phạm vi
- Khởi tạo AWS SES client
- Hàm gửi email dùng chung (sendEmail)
- Hệ thống email template (HTML)
- Tích hợp gửi email cho các sự kiện nghiệp vụ:
  - Nghỉ phép: Thông báo duyệt/từ chối yêu cầu
  - Chấm công: Nhắc nhở quên chấm công (giai đoạn sau)
  - Auth: Email mời nhân viên tham gia hệ thống (giai đoạn sau)

### Ngoài phạm vi (Out of Scope)
- Email marketing / bulk email
- Email tracking (open rate, click rate)
- Giao diện quản lý template trên UI
- Gửi email qua kênh khác (SMS, push notification)
- Queue system (SQS/Bull) — giai đoạn sau khi volume tăng

### Phụ thuộc
- **Module Auth (001/006)**: Xác thực Firebase, lấy thông tin user
- **Module Employee (003)**: Lấy email nhân viên
- **Module Leave (005)**: Trigger gửi email khi duyệt/từ chối nghỉ phép

---

## 2. Kiến trúc

### 2.1 Tổng quan kiến trúc

```
┌──────────────────────────────────────────────────────────────┐
│                    Business Modules                           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │  Leave     │  │ Attendance│  │   Auth    │  ...           │
│  │  Module    │  │  Module   │  │  Module   │               │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘               │
│        │               │               │                     │
│        └───────────────┼───────────────┘                     │
│                        │                                     │
│  ┌─────────────────────┼─────────────────────────────────┐  │
│  │              Email Service Layer                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │ sendEmail()  │  │ Email        │  │ Template    │ │  │
│  │  │ (core)       │  │ Templates    │  │ Renderer    │ │  │
│  │  └──────┬───────┘  └──────────────┘  └─────────────┘ │  │
│  └─────────┼─────────────────────────────────────────────┘  │
│            │                                                 │
└────────────┼─────────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │   AWS SES API   │
    │  (ap-southeast-1)│
    └─────────────────┘
             │
        Email Delivery
```

### 2.2 Luồng gửi email

```
Module nghiệp vụ                Email Service                    AWS SES
      │                               │                              │
      │  sendLeaveApprovalEmail()     │                              │
      │──────────────────────────────>│                              │
      │                               │  1. Load template            │
      │                               │  2. Render HTML (biến động)  │
      │                               │  3. SES.sendEmail()          │
      │                               │─────────────────────────────>│
      │                               │                              │  Deliver
      │                               │  4. Log kết quả              │
      │  return (không chờ email)     │                              │
      │<──────────────────────────────│                              │
```

### 2.3 Nguyên tắc thiết kế

1. **Fire-and-forget**: Gửi email bất đồng bộ, không chặn response API. Nếu gửi thất bại, log lỗi nhưng không throw exception lên nghiệp vụ.
2. **Single Responsibility**: Module email chỉ lo gửi email. Logic quyết định "khi nào gửi" nằm ở module nghiệp vụ.
3. **Template Separation**: HTML template tách riêng, dễ chỉnh sửa mà không đụng logic.
4. **Environment-aware**: Sandbox mode trong development (chỉ log, không gửi thật), production mới gửi qua SES.

---

## 3. Tech Stack

| Công nghệ | Lựa chọn | Lý do |
|-----------|---------|-------|
| Email Provider | AWS SES | Chi phí thấp ($0.10/1000 email), độ tin cậy cao, tích hợp tốt với Node.js |
| SDK | @aws-sdk/client-ses (v3) | AWS SDK v3, tree-shakeable, nhẹ hơn v2 |
| Template Engine | String interpolation | Đơn giản, không cần thêm dependency cho giai đoạn đầu |
| Hosting | Vercel (Serverless Functions) | Hiện tại app đã deploy trên Vercel |

---

## 4. Cấu hình

### 4.1 Environment Variables

| Biến | Mô tả | Ví dụ | Bắt buộc |
|------|--------|-------|----------|
| `AWS_SES_REGION` | AWS Region cho SES | `ap-southeast-1` | Có |
| `AWS_SES_ACCESS_KEY_ID` | IAM Access Key | `AKIA...` | Có |
| `AWS_SES_SECRET_ACCESS_KEY` | IAM Secret Key | `...` | Có |
| `AWS_SES_FROM_EMAIL` | Email người gửi (đã verify trên SES) | `noreply@hrlite.com` | Có |
| `AWS_SES_FROM_NAME` | Tên hiển thị người gửi | `HRLite` | Không (mặc định: HRLite) |

### 4.2 IAM Policy (Tối thiểu)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "arn:aws:ses:ap-southeast-1:ACCOUNT_ID:identity/*"
    }
  ]
}
```

---

## 5. Thiết kế chi tiết

### 5.1 SES Client (`src/lib/email/ses-client.ts`)

```typescript
import { SESClient } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
  },
});

export default sesClient;
```

### 5.2 Core Send Function (`src/lib/email/send-email.ts`)

```typescript
import { SendEmailCommand } from '@aws-sdk/client-ses';
import sesClient from './ses-client';
import logger from '@/lib/logger';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, html, replyTo } = params;
  const toAddresses = Array.isArray(to) ? to : [to];
  const fromName = process.env.AWS_SES_FROM_NAME || 'HRLite';
  const fromEmail = process.env.AWS_SES_FROM_EMAIL!;

  // Development: chỉ log, không gửi thật
  if (process.env.NODE_ENV === 'development') {
    logger.info('[Email] DEV MODE — không gửi thật', {
      to: toAddresses,
      subject,
    });
    return true;
  }

  try {
    const command = new SendEmailCommand({
      Source: `${fromName} <${fromEmail}>`,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
        },
      },
      ...(replyTo && { ReplyToAddresses: [replyTo] }),
    });

    const result = await sesClient.send(command);
    logger.info('[Email] Gửi thành công', {
      messageId: result.MessageId,
      to: toAddresses,
      subject,
    });
    return true;
  } catch (error) {
    logger.error('[Email] Gửi thất bại', {
      to: toAddresses,
      subject,
      error: error instanceof Error ? error.message : error,
    });
    return false;
  }
}
```

### 5.3 Email Templates (`src/lib/email/templates/`)

#### Base Layout (`base-layout.ts`)

```typescript
export function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e40af;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">HRLite</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">
                Email này được gửi tự động từ hệ thống HRLite. Vui lòng không trả lời email này.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

#### Leave Approval Template (`leave-approved.ts`)

```typescript
import { baseLayout } from './base-layout';

interface LeaveApprovedData {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  approverName: string;
}

export function leaveApprovedTemplate(data: LeaveApprovedData): string {
  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">Yêu cầu nghỉ phép đã được duyệt</h2>
    <p style="margin:0 0 24px;color:#374151;line-height:1.6;">
      Xin chào <strong>${data.employeeName}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;line-height:1.6;">
      Yêu cầu nghỉ phép của bạn đã được phê duyệt với thông tin sau:
    </p>
    <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
      <tr style="background-color:#f9fafb;">
        <td style="font-weight:600;color:#374151;width:40%;">Loại nghỉ</td>
        <td style="color:#111827;">${data.leaveType}</td>
      </tr>
      <tr>
        <td style="font-weight:600;color:#374151;">Từ ngày</td>
        <td style="color:#111827;">${data.startDate}</td>
      </tr>
      <tr style="background-color:#f9fafb;">
        <td style="font-weight:600;color:#374151;">Đến ngày</td>
        <td style="color:#111827;">${data.endDate}</td>
      </tr>
      <tr>
        <td style="font-weight:600;color:#374151;">Số ngày</td>
        <td style="color:#111827;">${data.days} ngày</td>
      </tr>
      <tr style="background-color:#f9fafb;">
        <td style="font-weight:600;color:#374151;">Người duyệt</td>
        <td style="color:#111827;">${data.approverName}</td>
      </tr>
    </table>
    <div style="padding:16px;background-color:#ecfdf5;border-radius:6px;border-left:4px solid #10b981;">
      <p style="margin:0;color:#065f46;font-size:14px;">
        ✅ Yêu cầu nghỉ phép của bạn đã được chấp thuận. Chúc bạn nghỉ ngơi vui vẻ!
      </p>
    </div>`;

  return baseLayout(content);
}
```

#### Leave Rejected Template (`leave-rejected.ts`)

```typescript
import { baseLayout } from './base-layout';

interface LeaveRejectedData {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  approverName: string;
  reason?: string;
}

export function leaveRejectedTemplate(data: LeaveRejectedData): string {
  const reasonBlock = data.reason
    ? `<tr>
        <td style="font-weight:600;color:#374151;">Lý do từ chối</td>
        <td style="color:#111827;">${data.reason}</td>
      </tr>`
    : '';

  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">Yêu cầu nghỉ phép bị từ chối</h2>
    <p style="margin:0 0 24px;color:#374151;line-height:1.6;">
      Xin chào <strong>${data.employeeName}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;line-height:1.6;">
      Yêu cầu nghỉ phép của bạn đã bị từ chối với thông tin sau:
    </p>
    <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
      <tr style="background-color:#f9fafb;">
        <td style="font-weight:600;color:#374151;width:40%;">Loại nghỉ</td>
        <td style="color:#111827;">${data.leaveType}</td>
      </tr>
      <tr>
        <td style="font-weight:600;color:#374151;">Từ ngày</td>
        <td style="color:#111827;">${data.startDate}</td>
      </tr>
      <tr style="background-color:#f9fafb;">
        <td style="font-weight:600;color:#374151;">Đến ngày</td>
        <td style="color:#111827;">${data.endDate}</td>
      </tr>
      <tr>
        <td style="font-weight:600;color:#374151;">Số ngày</td>
        <td style="color:#111827;">${data.days} ngày</td>
      </tr>
      <tr style="background-color:#f9fafb;">
        <td style="font-weight:600;color:#374151;">Người xử lý</td>
        <td style="color:#111827;">${data.approverName}</td>
      </tr>
      ${reasonBlock}
    </table>
    <div style="padding:16px;background-color:#fef2f2;border-radius:6px;border-left:4px solid #ef4444;">
      <p style="margin:0;color:#991b1b;font-size:14px;">
        Yêu cầu nghỉ phép của bạn đã bị từ chối. Vui lòng liên hệ quản lý nếu cần thêm thông tin.
      </p>
    </div>`;

  return baseLayout(content);
}
```

### 5.4 Convenience Functions (`src/lib/email/notifications/leave-email.ts`)

```typescript
import { sendEmail } from '../send-email';
import { leaveApprovedTemplate } from '../templates/leave-approved';
import { leaveRejectedTemplate } from '../templates/leave-rejected';
import logger from '@/lib/logger';

interface LeaveEmailData {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  approverName: string;
  reason?: string;
}

export async function sendLeaveApprovedEmail(data: LeaveEmailData): Promise<void> {
  const html = leaveApprovedTemplate({
    employeeName: data.employeeName,
    leaveType: data.leaveType,
    startDate: data.startDate,
    endDate: data.endDate,
    days: data.days,
    approverName: data.approverName,
  });

  // Fire-and-forget: không await ở caller
  sendEmail({
    to: data.employeeEmail,
    subject: `[HRLite] Yêu cầu nghỉ phép đã được duyệt — ${data.leaveType}`,
    html,
  }).catch((error) => {
    logger.error('[LeaveEmail] Không gửi được email duyệt nghỉ phép', { error });
  });
}

export async function sendLeaveRejectedEmail(data: LeaveEmailData): Promise<void> {
  const html = leaveRejectedTemplate({
    employeeName: data.employeeName,
    leaveType: data.leaveType,
    startDate: data.startDate,
    endDate: data.endDate,
    days: data.days,
    approverName: data.approverName,
    reason: data.reason,
  });

  sendEmail({
    to: data.employeeEmail,
    subject: `[HRLite] Yêu cầu nghỉ phép bị từ chối — ${data.leaveType}`,
    html,
  }).catch((error) => {
    logger.error('[LeaveEmail] Không gửi được email từ chối nghỉ phép', { error });
  });
}
```

### 5.5 Tích hợp vào API nghỉ phép

#### Approve — `src/app/api/leave/[id]/approve/route.ts`

```typescript
// Thêm vào cuối handler, SAU khi update DB thành công:

import { sendLeaveApprovedEmail } from '@/lib/email/notifications/leave-email';

// ... existing approve logic ...
// Sau khi UPDATE thành công:

sendLeaveApprovedEmail({
  employeeEmail: leaveRequest.employee.email,
  employeeName: leaveRequest.employee.emplNm,
  leaveType: leaveRequest.leaveType.lvTypeNm,
  startDate: leaveRequest.startDt.toLocaleDateString('vi-VN'),
  endDate: leaveRequest.endDt.toLocaleDateString('vi-VN'),
  days: Number(leaveRequest.lvDays),
  approverName: approver.emplNm,
});
// Không await — fire-and-forget
```

#### Reject — `src/app/api/leave/[id]/reject/route.ts`

```typescript
// Tương tự, thêm sau khi UPDATE thành công:

import { sendLeaveRejectedEmail } from '@/lib/email/notifications/leave-email';

sendLeaveRejectedEmail({
  employeeEmail: leaveRequest.employee.email,
  employeeName: leaveRequest.employee.emplNm,
  leaveType: leaveRequest.leaveType.lvTypeNm,
  startDate: leaveRequest.startDt.toLocaleDateString('vi-VN'),
  endDate: leaveRequest.endDt.toLocaleDateString('vi-VN'),
  days: Number(leaveRequest.lvDays),
  approverName: approver.emplNm,
  reason: body.reason,
});
```

---

## 6. Xử lý lỗi & Logging

### 6.1 Chiến lược xử lý lỗi

| Tình huống | Xử lý | Lý do |
|-----------|--------|-------|
| SES credentials sai | Log error, return false | Không chặn nghiệp vụ |
| Email không hợp lệ | Log error, return false | Không chặn nghiệp vụ |
| SES rate limit | Log warning, return false | SES tự retry nội bộ |
| SES sandbox (chưa verify recipient) | Log error, return false | Hướng dẫn verify hoặc request production |
| Template render lỗi | Log error, return false | Không chặn nghiệp vụ |

### 6.2 Nguyên tắc
- **Email gửi thất bại KHÔNG BAO GIỜ làm fail API response**
- Luôn log đầy đủ: to, subject, messageId (thành công) hoặc error (thất bại)
- Development mode: log nội dung email thay vì gửi thật

---

## 7. Bảo mật

| Hạng mục | Biện pháp |
|----------|-----------|
| AWS Credentials | Lưu trong Vercel Environment Variables, KHÔNG commit vào code |
| IAM Policy | Chỉ cấp `ses:SendEmail` và `ses:SendRawEmail`, không cấp full access |
| Email Injection | Validate email address trước khi gửi |
| Template XSS | Escape HTML trong dynamic variables trước khi render |
| Rate Limiting | SES tự có rate limit (14 email/giây mặc định), không cần tự implement |

---

## 8. Cấu trúc thư mục

```
src/
└── lib/
    └── email/
        ├── ses-client.ts              # Khởi tạo AWS SES client
        ├── send-email.ts              # Hàm gửi email core
        ├── templates/
        │   ├── base-layout.ts         # Layout chung (header, footer)
        │   ├── leave-approved.ts      # Template duyệt nghỉ phép
        │   └── leave-rejected.ts      # Template từ chối nghỉ phép
        └── notifications/
            └── leave-email.ts         # Convenience functions cho module nghỉ phép
```

### Mở rộng trong tương lai

```
src/lib/email/
├── templates/
│   ├── base-layout.ts
│   ├── leave-approved.ts
│   ├── leave-rejected.ts
│   ├── attendance-reminder.ts     # Nhắc chấm công
│   ├── welcome.ts                 # Mời nhân viên tham gia
│   └── password-reset.ts          # Đặt lại mật khẩu
└── notifications/
    ├── leave-email.ts
    ├── attendance-email.ts        # Thông báo chấm công
    └── auth-email.ts              # Thông báo tài khoản
```

---

## 9. Testing

### 9.1 Unit Tests

```typescript
// src/tests/unit/lib/email/send-email.test.ts

describe('sendEmail', () => {
  it('gửi email thành công qua SES', async () => {
    // Mock SESClient.send() → return MessageId
    // Assert: gọi SendEmailCommand với đúng params
  });

  it('return false khi SES throw error', async () => {
    // Mock SESClient.send() → throw Error
    // Assert: return false, log error
  });

  it('không gửi thật trong development mode', async () => {
    // Set NODE_ENV=development
    // Assert: SESClient.send() không được gọi
  });
});

describe('leaveApprovedTemplate', () => {
  it('render đúng tên nhân viên và thông tin nghỉ phép', () => {
    const html = leaveApprovedTemplate({...});
    expect(html).toContain('Nguyễn Văn An');
    expect(html).toContain('Nghỉ phép năm');
  });
});
```

### 9.2 Integration Tests

```typescript
// src/tests/integration/email/ses-integration.test.ts

describe('SES Integration (chỉ chạy khi có credentials)', () => {
  it('gửi email test thành công', async () => {
    // Gửi đến email đã verify trong sandbox
    // Assert: return true
  });
});
```

---

## 10. Thứ tự triển khai

### Phase 1: Hạ tầng Email Service
- [ ] Cài package `@aws-sdk/client-ses`
- [ ] Thêm environment variables vào `.env.example` và Vercel
- [ ] Tạo `src/lib/email/ses-client.ts`
- [ ] Tạo `src/lib/email/send-email.ts` (core function)
- [ ] Unit test cho `sendEmail`

### Phase 2: Email Templates
- [ ] Tạo `src/lib/email/templates/base-layout.ts`
- [ ] Tạo `src/lib/email/templates/leave-approved.ts`
- [ ] Tạo `src/lib/email/templates/leave-rejected.ts`
- [ ] Unit test cho template rendering

### Phase 3: Tích hợp Module Nghỉ phép
- [ ] Tạo `src/lib/email/notifications/leave-email.ts`
- [ ] Tích hợp vào `POST /api/leave/[id]/approve`
- [ ] Tích hợp vào `POST /api/leave/[id]/reject`
- [ ] Integration test

### Phase 4: Kiểm thử & Deploy
- [ ] Test trên SES sandbox (gửi đến email đã verify)
- [ ] Verify domain trên SES + Cloudflare DNS
- [ ] Request SES production access
- [ ] Deploy lên Vercel preview → test end-to-end
- [ ] Deploy production

---

## Tài liệu tham chiếu

- `docs/database/database-design.md` — Thiết kế DB (SSoT)
- `docs/blueprints/005-leave/blueprint.md` — Blueprint Nghỉ phép (tích hợp email)
- `docs/blueprints/006-firebase-auth/blueprint.md` — Blueprint Firebase Auth
- AWS SES Developer Guide: https://docs.aws.amazon.com/ses/latest/dg/
- @aws-sdk/client-ses: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ses/
