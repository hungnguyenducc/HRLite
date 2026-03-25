# Sprint 5 Prompt Map

## Sprint Goal
Xây dựng hạ tầng email service sử dụng AWS SES, tích hợp gửi thông báo email cho module nghỉ phép (duyệt/từ chối). Đảm bảo email gửi async, không chặn luồng nghiệp vụ, có logging đầy đủ.

## Feature 1: Email Service (AWS SES)

### 1.1 Design Prompt
/feature-dev "Viết tài liệu thiết kế cho Email Service (AWS SES)
vào docs/blueprints/007-email/blueprint.md.
- Dịch vụ gửi email tập trung cho toàn hệ thống
- Sử dụng AWS SES làm provider (@aws-sdk/client-ses v3)
- Template-based email (HTML)
- Fire-and-forget pattern (async, không chặn nghiệp vụ)
- Environment-aware: dev mode chỉ log, production gửi thật
- Tham chiếu docs/database/database-design.md cho DB schema.
Chưa chỉnh sửa code."

> **Trạng thái**: ✅ Blueprint đã hoàn thành tại `docs/blueprints/007-email/blueprint.md`

### 1.2 DB Design Reflection Prompt
/feature-dev "Module Email Service không cần bảng DB riêng ở giai đoạn này.
Email gửi fire-and-forget, log qua logger hệ thống.
Giai đoạn sau có thể thêm bảng TL_EMAIL_LOG nếu cần tracking.
Chưa chỉnh sửa code."

> **Ghi chú**: Không cần thay đổi DB schema cho sprint này.

### 1.3 Test Case Prompt
/feature-dev "Dựa trên tài liệu thiết kế tại docs/blueprints/007-email/blueprint.md,
viết test cases vào docs/tests/test-cases/sprint-5/email-service-test-cases.md.
Sử dụng format Given-When-Then, bao gồm:
- Unit test: SES client initialization, sendEmail function, template rendering
- Integration test: gửi email qua SES sandbox
- Edge cases: credentials sai, email không hợp lệ, SES rate limit, dev mode
Chưa chỉnh sửa code."

### 1.4 Implementation Prompt
/feature-dev "Tuân thủ nội dung docs/blueprints/007-email/blueprint.md để triển khai.
Phase 1 — Hạ tầng:
- Cài package @aws-sdk/client-ses
- Thêm env vars vào .env.example
- Tạo src/lib/email/ses-client.ts
- Tạo src/lib/email/send-email.ts
Phase 2 — Templates:
- Tạo src/lib/email/templates/base-layout.ts
- Tạo src/lib/email/templates/leave-approved.ts
- Tạo src/lib/email/templates/leave-rejected.ts
Phase 3 — Tích hợp:
- Tạo src/lib/email/notifications/leave-email.ts
- Tích hợp vào src/app/api/leave/[id]/approve/route.ts
- Tích hợp vào src/app/api/leave/[id]/reject/route.ts
Viết tests tham chiếu docs/tests/test-cases/sprint-5/email-service-test-cases.md,
hoàn thành xong chạy tất cả tests và báo cáo kết quả vào docs/tests/test-reports/."

## Feature 2: Email Templates mở rộng (Stretch Goal)

### 2.1 Design Prompt
/feature-dev "Mở rộng email templates cho các use case bổ sung:
- Template nhắc nhở quên chấm công (attendance-reminder)
- Template mời nhân viên tham gia hệ thống (welcome/invite)
Chỉ viết thiết kế template, chưa tích hợp vào module.
Tham chiếu docs/blueprints/007-email/blueprint.md.
Chưa chỉnh sửa code."

### 2.2 Implementation Prompt
/feature-dev "Triển khai email templates bổ sung:
- src/lib/email/templates/attendance-reminder.ts
- src/lib/email/templates/welcome-invite.ts
- src/lib/email/notifications/attendance-email.ts
- src/lib/email/notifications/auth-email.ts
Chưa tích hợp vào API routes — chỉ tạo sẵn templates và notification functions.
Viết unit tests cho template rendering."
