# Cấu hình AWS SES Email trong dự án HRLite

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc hệ thống email](#2-kiến-trúc-hệ-thống-email)
3. [Cài đặt phụ thuộc](#3-cài-đặt-phụ-thuộc)
4. [Biến môi trường](#4-biến-môi-trường)
5. [Cấu hình SMTP Transport](#5-cấu-hình-smtp-transport)
6. [Hàm gửi email chính](#6-hàm-gửi-email-chính)
7. [Hệ thống template email](#7-hệ-thống-template-email)
8. [Hàm thông báo nghỉ phép](#8-hàm-thông-báo-nghỉ-phép)
9. [Tích hợp API](#9-tích-hợp-api)
10. [Bảo mật](#10-bảo-mật)
11. [Xử lý lỗi và Logging](#11-xử-lý-lỗi-và-logging)
12. [Chế độ Development vs Production](#12-chế-độ-development-vs-production)
13. [Cấu trúc file](#13-cấu-trúc-file)
14. [Hướng dẫn thiết lập AWS SES Console](#14-hướng-dẫn-thiết-lập-aws-ses-console)
15. [Xử lý sự cố thường gặp](#15-xử-lý-sự-cố-thường-gặp)

---

## 1. Tổng quan

HRLite sử dụng **AWS SES (Simple Email Service)** qua giao thức **SMTP** với thư viện **nodemailer** để gửi email thông báo tự động. Hiện tại hệ thống hỗ trợ gửi thông báo khi đơn nghỉ phép được phê duyệt hoặc từ chối.

### Đặc điểm chính

| Đặc điểm | Mô tả |
|----------|-------|
| Giao thức | SMTP qua TLS (port 587) |
| Nhà cung cấp | AWS SES (ap-southeast-1) |
| Thư viện | nodemailer |
| Pattern | Fire-and-forget (không chặn API response) |
| Template | String interpolation với HTML |
| Bảo mật | HTML escaping chống XSS |

---

## 2. Kiến trúc hệ thống email

### Luồng gửi email

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
       ├── DEV MODE: Log nội dung email → Không gửi thật
       │
       └── PRODUCTION: nodemailer SMTP transporter
                │
                ▼
          [AWS SES SMTP]
          email-smtp.ap-southeast-1.amazonaws.com:587
                │
                ▼
          [Hộp thư người nhận]
```

### Pattern Fire-and-Forget

```
API Request → Xử lý nghiệp vụ → Trả response → Gửi email (async, không chờ)
```

Email được gửi **sau khi** API đã trả response cho client. Nếu gửi email thất bại, API vẫn thành công — lỗi chỉ được log lại.

---

## 3. Cài đặt phụ thuộc

### Package đã cài đặt

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

### Cài đặt mới (nếu cần)

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

### Tại sao dùng nodemailer thay vì @aws-sdk/client-ses?

- **Đơn giản hơn**: Cấu hình SMTP chỉ cần host/port/user/pass
- **Linh hoạt**: Dễ chuyển sang nhà cung cấp email khác (SendGrid, Mailgun)
- **Tương thích**: Hoạt động với mọi SMTP server, không bị lock-in AWS SDK

---

## 4. Biến môi trường

### File: `.env`

```env
# AWS SES SMTP Configuration
SMTP_HOST="email-smtp.ap-southeast-1.amazonaws.com"
SMTP_PORT=587
SMTP_USER="your-aws-ses-smtp-username"
SMTP_PASS="your-aws-ses-smtp-password"
SMTP_FROM_EMAIL="noreply@yourdomain.com"
SMTP_FROM_NAME="HRLite"
```

### Giải thích các biến

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `SMTP_HOST` | SMTP endpoint của AWS SES theo region | `email-smtp.ap-southeast-1.amazonaws.com` |
| `SMTP_PORT` | Port SMTP với TLS | `587` |
| `SMTP_USER` | SMTP username (từ AWS IAM) | `AKIA...` |
| `SMTP_PASS` | SMTP password (từ AWS IAM) | `BE3L...` |
| `SMTP_FROM_EMAIL` | Địa chỉ email người gửi (đã xác minh trên SES) | `noreply@yourdomain.com` |
| `SMTP_FROM_NAME` | Tên hiển thị người gửi | `HRLite` |

### AWS SES SMTP Endpoints theo Region

| Region | Endpoint |
|--------|----------|
| ap-southeast-1 (Singapore) | `email-smtp.ap-southeast-1.amazonaws.com` |
| us-east-1 (N. Virginia) | `email-smtp.us-east-1.amazonaws.com` |
| eu-west-1 (Ireland) | `email-smtp.eu-west-1.amazonaws.com` |
| ap-northeast-1 (Tokyo) | `email-smtp.ap-northeast-1.amazonaws.com` |

### Lưu ý quan trọng

- `SMTP_USER` và `SMTP_PASS` là **SMTP credentials**, KHÔNG phải AWS Access Key thông thường
- SMTP credentials được tạo riêng trong AWS SES Console
- `SMTP_FROM_EMAIL` phải là email/domain đã được **xác minh** (verified) trên AWS SES
- **KHÔNG BAO GIỜ** commit file `.env` vào git

---

## 5. Cấu hình SMTP Transport

### File: `src/lib/email/smtp-transport.ts`

```typescript
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

// Kiểm tra cấu hình
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  logger.warn('[Email] SMTP credentials chưa được cấu hình');
}

// Tạo SMTP transporter
export const smtpTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: false,  // TLS qua STARTTLS, không phải SSL
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});
```

### Giải thích

- `secure: false` + port 587 = sử dụng **STARTTLS** (nâng cấp kết nối lên TLS)
- `secure: true` + port 465 = sử dụng **SSL** trực tiếp
- AWS SES khuyến nghị dùng port 587 với STARTTLS
- Nếu thiếu credentials, log cảnh báo nhưng không crash ứng dụng

---

## 6. Hàm gửi email chính

### File: `src/lib/email/send-email.ts`

```typescript
interface SendEmailParams {
  to: string | string[];    // Người nhận (1 hoặc nhiều)
  subject: string;          // Tiêu đề
  html: string;             // Nội dung HTML
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  // DEV MODE: Chỉ log, không gửi thật
  if (process.env.NODE_ENV === 'development') {
    logger.info('[Email] DEV MODE — không gửi thật', { to, subject });
    return true;
  }

  // PRODUCTION: Gửi qua AWS SES SMTP
  try {
    const info = await smtpTransporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    logger.info('[Email] Gửi thành công', { messageId: info.messageId, to });
    return true;
  } catch (error) {
    logger.error('[Email] Gửi thất bại', { error, to, subject });
    return false;
  }
}
```

### Đặc điểm

- Hỗ trợ gửi cho **1 hoặc nhiều** người nhận
- **Không throw exception** — trả về `boolean` để caller quyết định xử lý
- DEV MODE tự động bỏ qua gửi thật, tiện cho phát triển local
- Log đầy đủ metadata (messageId, to, subject, error)

---

## 7. Hệ thống template email

### 7.1 Base Layout

#### File: `src/lib/email/templates/base-layout.ts`

```typescript
export function baseLayout(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background:#f4f4f4;">
      <table width="600" align="center" style="background:#fff;">
        <!-- Header: Logo HRLite (nền xanh #1e40af) -->
        <tr>
          <td style="background:#1e40af; color:#fff; padding:20px; text-align:center;">
            <h1>HRLite</h1>
          </td>
        </tr>
        <!-- Nội dung -->
        <tr>
          <td style="padding:30px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px; text-align:center; color:#888; font-size:12px;">
            Email này được gửi tự động từ hệ thống HRLite.
            Vui lòng không trả lời email này.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
```

### 7.2 Template phê duyệt nghỉ phép

#### File: `src/lib/email/templates/leave-approved.ts`

| Thông tin hiển thị | Biến |
|-------------------|------|
| Tên nhân viên | `employeeName` |
| Loại nghỉ phép | `leaveType` |
| Ngày bắt đầu | `startDate` |
| Ngày kết thúc | `endDate` |
| Số ngày nghỉ | `totalDays` |
| Người phê duyệt | `approverName` |

- Banner màu **xanh lá** với biểu tượng checkmark
- Bảng thông tin chi tiết đơn nghỉ phép

### 7.3 Template từ chối nghỉ phép

#### File: `src/lib/email/templates/leave-rejected.ts`

Giống template phê duyệt, thêm:
- Banner màu **đỏ** cho thông báo từ chối
- Trường **lý do từ chối** (tùy chọn, hiển thị có điều kiện)

### Tiện ích bảo mật

#### File: `src/lib/email/utils.ts`

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

Tất cả biến động được escape trước khi chèn vào HTML template để **chống XSS**.

---

## 8. Hàm thông báo nghỉ phép

### File: `src/lib/email/notifications/leave-email.ts`

```typescript
// Gửi email khi đơn nghỉ phép được PHÊ DUYỆT
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
    subject: `[HRLite] Đơn nghỉ phép đã được phê duyệt`,
    html,
  });
}

// Gửi email khi đơn nghỉ phép bị TỪ CHỐI
export async function sendLeaveRejectedEmail(params: {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  approverName: string;
  reason?: string;         // Lý do từ chối (tùy chọn)
}): Promise<void> {
  const html = baseLayout(leaveRejectedTemplate(params));
  await sendEmail({
    to: params.employeeEmail,
    subject: `[HRLite] Đơn nghỉ phép đã bị từ chối`,
    html,
  });
}
```

---

## 9. Tích hợp API

### 9.1 API phê duyệt nghỉ phép

#### File: `src/app/api/leave/[id]/approve/route.ts`

```
PATCH /api/leave/:id/approve
  │
  ├── 1. Xác thực user (withAuth middleware)
  ├── 2. Tìm đơn nghỉ phép trong DB
  ├── 3. Cập nhật trạng thái → APPROVED (atomic updateMany)
  ├── 4. Trả response thành công cho client
  └── 5. Gửi email thông báo phê duyệt (fire-and-forget)
         └── sendLeaveApprovedEmail(...)
```

### 9.2 API từ chối nghỉ phép

#### File: `src/app/api/leave/[id]/reject/route.ts`

```
PATCH /api/leave/:id/reject
  Body: { reason?: string }  // Zod validation
  │
  ├── 1. Xác thực user (withAuth middleware)
  ├── 2. Validate body với Zod schema
  ├── 3. Tìm đơn nghỉ phép trong DB
  ├── 4. Cập nhật trạng thái → REJECTED + lý do (atomic updateMany)
  ├── 5. Trả response thành công cho client
  └── 6. Gửi email thông báo từ chối (fire-and-forget)
         └── sendLeaveRejectedEmail(...)
```

### Atomic Update

```typescript
// Ngăn chặn race condition: chỉ cập nhật nếu trạng thái vẫn là PENDING
await prisma.leaveRequest.updateMany({
  where: {
    id: leaveId,
    status: 'PENDING',  // ← Kiểm tra trạng thái hiện tại
  },
  data: {
    status: 'APPROVED',
    // ...
  },
});
```

---

## 10. Bảo mật

| Biện pháp | Chi tiết |
|----------|---------|
| HTML Escaping | Tất cả biến động được escape bằng `escapeHtml()` trước khi chèn vào template |
| Credentials | Lưu trong biến môi trường, không hardcode |
| TLS/STARTTLS | Mã hóa kết nối SMTP (port 587) |
| Verified Sender | Email gửi đi phải từ domain/email đã xác minh trên AWS SES |
| No Reply Content | Sử dụng noreply@ để tránh phản hồi |
| XSS Prevention | Test case E2E kiểm tra chèn script vào tên nhân viên |

### IAM Policy yêu cầu cho SMTP User

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

## 11. Xử lý lỗi và Logging

### Chiến lược xử lý lỗi

| Tình huống | Hành vi |
|-----------|---------|
| Thiếu SMTP credentials | Log cảnh báo khi khởi động, email không gửi được |
| Email gửi thất bại | Log lỗi chi tiết, API vẫn trả thành công |
| Email không hợp lệ | Log lỗi, không throw exception |
| Lỗi kết nối SMTP | Log lỗi, retry tự động bởi nodemailer |

### Ví dụ log

```
// Thành công
[Email] Gửi thành công { messageId: "0100018...", to: "user@example.com" }

// Thất bại
[Email] Gửi thất bại { error: "Connection timeout", to: "user@example.com", subject: "..." }

// DEV mode
[Email] DEV MODE — không gửi thật { to: "user@example.com", subject: "..." }
```

---

## 12. Chế độ Development vs Production

| Đặc điểm | Development | Production |
|----------|-------------|------------|
| Gửi email thật | Không | Có |
| SMTP connection | Không kết nối | Kết nối AWS SES |
| Output | Log nội dung email | Log messageId từ SES |
| Yêu cầu credentials | Không bắt buộc | Bắt buộc |
| Kiểm tra | Xem log để verify nội dung | Kiểm tra hộp thư người nhận |

### Chuyển đổi chế độ

```env
# Development (mặc định khi chạy next dev)
NODE_ENV=development

# Production
NODE_ENV=production
```

---

## 13. Cấu trúc file

```
src/lib/email/
├── smtp-transport.ts              # Khởi tạo SMTP transporter (AWS SES)
├── send-email.ts                  # Hàm gửi email chính
├── utils.ts                       # Tiện ích escape HTML (chống XSS)
├── templates/
│   ├── base-layout.ts             # Layout HTML chung (header + footer)
│   ├── leave-approved.ts          # Template thông báo phê duyệt
│   └── leave-rejected.ts          # Template thông báo từ chối
└── notifications/
    └── leave-email.ts             # Hàm thông báo nghỉ phép

Điểm tích hợp:
├── src/app/api/leave/[id]/approve/route.ts
└── src/app/api/leave/[id]/reject/route.ts

Tài liệu:
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

## 14. Hướng dẫn thiết lập AWS SES Console

### Bước 1: Xác minh email/domain gửi

1. Truy cập [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Chọn region **ap-southeast-1** (Singapore)
3. Vào **Verified identities** → **Create identity**
4. Chọn **Email address** hoặc **Domain**
5. Hoàn thành xác minh (click link trong email hoặc cấu hình DNS)

### Bước 2: Tạo SMTP Credentials

1. Vào **SMTP settings** trong SES Console
2. Nhấn **"Create SMTP credentials"**
3. Tạo IAM user cho SMTP
4. **Lưu lại** SMTP Username và Password (chỉ hiển thị 1 lần)
5. Copy vào `SMTP_USER` và `SMTP_PASS` trong `.env`

### Bước 3: Thoát Sandbox Mode (Production)

> Mặc định AWS SES ở chế độ **Sandbox** — chỉ gửi được đến email đã xác minh.

1. Vào **Account dashboard** → **Request production access**
2. Điền thông tin:
   - Mail type: Transactional
   - Website URL: URL ứng dụng
   - Use case: Thông báo nghỉ phép cho nhân viên nội bộ
3. Chờ AWS phê duyệt (thường 24-48 giờ)

### Bước 4: Kiểm tra kết nối

```bash
# Test kết nối SMTP từ terminal
openssl s_client -starttls smtp -connect email-smtp.ap-southeast-1.amazonaws.com:587
```

---

## 15. Xử lý sự cố thường gặp

### Lỗi: `Connection timeout` khi gửi email

**Nguyên nhân**: Firewall hoặc security group chặn port 587.
**Giải pháp**:
- Kiểm tra outbound rule cho port 587
- Thử port 465 (SSL) nếu 587 bị chặn
- Kiểm tra `SMTP_HOST` đúng region

### Lỗi: `535 Authentication failed`

**Nguyên nhân**: SMTP credentials sai.
**Giải pháp**:
- Tạo lại SMTP credentials trong SES Console
- Đảm bảo dùng **SMTP credentials**, không phải AWS Access Key
- Kiểm tra IAM user có policy `ses:SendRawEmail`

### Lỗi: `554 Message rejected: Email address is not verified`

**Nguyên nhân**: Đang ở Sandbox mode, email người nhận chưa xác minh.
**Giải pháp**:
- Thêm email người nhận vào **Verified identities** (cho Sandbox)
- Hoặc yêu cầu **Production access** để gửi đến mọi email

### Lỗi: `Daily sending quota exceeded`

**Nguyên nhân**: Vượt giới hạn gửi email hàng ngày.
**Giải pháp**:
- Sandbox: 200 email/ngày
- Production: Yêu cầu tăng quota qua AWS Support
- Kiểm tra `Account dashboard` để xem quota hiện tại

### Email gửi thành công nhưng không nhận được

**Nguyên nhân**: Email vào spam hoặc bị bounce.
**Giải pháp**:
- Kiểm tra thư mục Spam/Junk
- Cấu hình **SPF**, **DKIM**, **DMARC** cho domain
- Kiểm tra **Bounce** và **Complaint** metrics trong SES Console
- Sử dụng email domain đã xác minh thay vì Gmail

### Log hiển thị `[Email] DEV MODE` nhưng đang ở production

**Nguyên nhân**: `NODE_ENV` chưa được set thành `production`.
**Giải pháp**: Kiểm tra biến môi trường `NODE_ENV=production` trên server.
