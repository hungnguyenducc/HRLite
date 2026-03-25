# Integration Test Report — Sprint 5: Email Service

## Test Environment
- **Date**: 2026-03-25
- **Server**: Next.js 15.5.13, dev mode (NODE_ENV=development)
- **Browser**: Playwright MCP (Chromium)
- **Database**: PostgreSQL 16 (Docker local)
- **SMTP**: AWS SES SMTP (dev mode — chỉ log, không gửi thật)

## Test Result Summary

| Item | Result | Notes |
|------|--------|-------|
| Server Startup | PASS | Ready in 1396ms |
| Console Errors | 3 (expected) | Từ các test case error path (400, 404) |
| Network Failures | 0 unexpected | |
| Server Log Errors | 0 | |
| Scenario Tests | **6/6 PASS** | |

## Detailed Scenario Results

### E2E-EM001: Approve → email thông báo duyệt
- **Result**: PASS
- **API**: PATCH /api/leave/[id]/approve → 200 OK, `aprvlSttsCd: "APPROVED"`
- **Server Log**: `[Email] DEV MODE — không gửi thật {"to":"khoa.mai@hrlite.com","subject":"[HRLite] Yêu cầu nghỉ phép đã được duyệt — Nghỉ phép năm"}`
- **Verification**: Email trigger confirmed qua server log

### E2E-EM005: Reject với lý do → email thông báo từ chối
- **Result**: PASS
- **API**: PATCH /api/leave/[id]/reject → 200 OK, `aprvlSttsCd: "REJECTED"`, `rjctRsn: "Thiếu giấy xác nhận y tế"`
- **Server Log**: `[Email] DEV MODE — không gửi thật {"to":"khoa.mai@hrlite.com","subject":"[HRLite] Yêu cầu nghỉ phép bị từ chối — Nghỉ ốm"}`
- **Verification**: Reject reason lưu DB + email trigger confirmed

### E2E-EM006: Reject không lý do → rjctRsn = null
- **Result**: PASS
- **API**: PATCH /api/leave/[id]/reject → 200 OK, `rjctRsn: null`
- **Server Log**: Email trigger confirmed (subject chứa loại nghỉ)

### E2E-EM010: Approve yêu cầu không tồn tại → 404
- **Result**: PASS
- **API**: PATCH /api/leave/00000000-.../approve → 404, `error: "Yêu cầu nghỉ phép không tồn tại."`

### E2E-EM011: Approve yêu cầu đã REJECTED → 400
- **Result**: PASS
- **API**: PATCH /api/leave/[rejected-id]/approve → 400, `error: "Chỉ có thể phê duyệt yêu cầu đang chờ duyệt."`
- **Verification**: Atomic updateMany hoạt động đúng

### E2E-EM004: Dev mode → chỉ log, không gửi email thật
- **Result**: PASS
- **Verification**: Tất cả các test trên đều chạy ở dev mode, server log hiển thị `DEV MODE — không gửi thật`. Không có network call đến AWS SES SMTP.

## Server Log Analysis
- Không có exception hoặc stack trace
- Không có N+1 query warning
- Tất cả API response time < 2s (acceptable cho dev mode với compilation)
- Winston logger hoạt động đúng format: `timestamp [level]: message {meta}`

## SMTP Production Test (trước đó)
- Script `test-email.ts` đã xác nhận SMTP connection OK
- Email gửi thành công qua AWS SES SMTP (MessageId received)
- Credentials hoạt động: `email-smtp.ap-southeast-1.amazonaws.com:587`

## Issues Found
Không có issues.

## Scenarios chưa test (cần production/staging)
| Scenario | Lý do chưa test |
|----------|-----------------|
| E2E-EM002 (NV không có email) | Cần seed NV với email = null |
| E2E-EM003 (SMTP lỗi) | Cần thay đổi SMTP credentials runtime |
| E2E-EM009 (Race condition) | Cần concurrent requests tool |
| E2E-EM012-013 (Template content) | Cần production mode để nhận email thật |
| E2E-EM014-015 (Missing env) | Cần restart server với env khác |

## Next Steps
1. Thêm SMTP env vars vào Vercel → deploy production
2. Test E2E-EM001/EM005 trên production (email gửi thật)
3. Verify email template HTML rendering trong email client
4. Request SES production access (thoát sandbox)
