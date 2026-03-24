# Test Report: Chức năng đăng nhập Firebase

## Test Environment
- **Date**: 2026-03-24
- **Server**: Next.js 15 + Firebase Auth (hungnd-bb801)
- **Browser**: Chrome (Playwright MCP)
- **Port**: localhost:3002

## Test Result Summary

| Item | Result | Notes |
|------|--------|-------|
| Console Errors (auth pages) | **0** | |
| Network Failures | **0** | Tất cả API 200/201 |
| Responsive Layout | **PASS** | Mobile 375x812 OK |
| Scenario Tests | **8/8 PASS** | |

## Detailed Results

| ID | Test Case | Result | Details |
|----|-----------|--------|---------|
| TC-L01 | Login thành công (Firebase) | **PASS** | Firebase signInWithPassword → 200, POST /api/auth/session → 200, redirect /dashboard, "Login Tester" hiển thị |
| TC-L02 | Login sai password | **PASS** | Toast: "Email hoặc mật khẩu không đúng", vẫn ở /login |
| TC-L03 | Login email không tồn tại | **PASS** | Toast: "Email hoặc mật khẩu không đúng" — không leak user existence |
| TC-L04 | Login form trống | **PASS** | Validation: "Địa chỉ email không hợp lệ" + "Mật khẩu không được để trống" |
| TC-L05 | Session cookie + dashboard load | **PASS** | Cookie `__session` set, GET /api/users/me → 200, dashboard stats all 200 |
| TC-L06 | Navigate trang protected | **PASS** | /employees (11 NV), /departments (6 PB), /leave — tất cả OK |
| TC-L07 | Login responsive mobile | **PASS** | 375x812 layout đẹp, form hiển thị đúng |
| TC-L08 | Logout → Login lại | **PASS** | Logout clear session, login lại tạo session mới |

## Network Flow (TC-L01)

```
1. Firebase signInWithPassword → 200
2. Firebase accounts:lookup → 200
3. POST /api/auth/session → 200 OK (set __session cookie)
4. GET /dashboard → 200
5. GET /api/users/me → 200
6. GET /api/dashboard/stats → 200
7. GET /api/employees/stats → 200
```

## Security Verification

| Check | Result |
|-------|--------|
| Sai password → không leak user info | **PASS** — same message cho wrong password và nonexistent email |
| Session cookie HttpOnly | **PASS** — không accessible từ JS |
| Session cookie SameSite=Strict | **PASS** |
| User role hiển thị đúng | **PASS** — "Người dùng" (không phải ADMIN) |
| Admin API blocked cho user thường | **PASS** — /api/users → 403 Forbidden |

## Issues Found

Không có issues mới.

## Conclusion

Chức năng đăng nhập Firebase hoạt động hoàn hảo: **8/8 test cases PASS**. Flow Firebase signIn → server session → protected routes hoạt động ổn định.
