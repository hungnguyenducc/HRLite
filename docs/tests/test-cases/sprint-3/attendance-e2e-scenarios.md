# Attendance E2E Test Scenarios

## Overview
- **Feature**: Chấm công — Check-in/Check-out, CRUD Admin, Báo cáo tổng hợp, Thống kê dashboard
- **Related Modules**: Auth (JWT, phân quyền), Employee (TB_EMPL), Department (TB_DEPT)
- **API Endpoints**: POST /api/attendance/check-in, POST /api/attendance/check-out, GET /api/attendance/today, GET/POST /api/attendance, PATCH/DELETE /api/attendance/[id], GET /api/attendance/summary, GET /api/attendance/stats
- **DB Tables**: TH_ATND, TB_EMPL, TB_DEPT, TB_COMM_USER
- **Blueprint**: docs/blueprints/004-attendance/blueprint.md

---

## Scenario Group 1: Check-in/Check-out Flow (User self-service)

### E2E-A001: Check-in thanh cong (PRESENT, truoc 09:00)
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Dang nhap USER, tai khoan da lien ket voi nhan vien dang WORKING, chua check-in hom nay, gio hien tai truoc 09:00
- **User Journey**:
  1. Dang nhap voi tai khoan USER (user@hrlite.com)
  2. Xem widget Check-in tren dashboard — hien thi nut "Check-in" (mau xanh)
  3. Click nut "Check-in"
  4. He thong ghi nhan gio vao = thoi diem hien tai
- **Expected Results**:
  - UI: Widget chuyen sang trang thai "Da check-in" — hien thi gio check-in, nut "Check-out" (mau cam), dong ho dem gio lam
  - API: POST /api/attendance/check-in → 201 Created, response: `{ success: true, data: { atndDt: "2026-03-24", chkInTm: "2026-03-24T08:30:00.000Z", chkOutTm: null, workHour: null, atndSttsCd: "PRESENT" } }`
  - DB: TH_ATND co ban ghi moi voi EMPL_ID = ID nhan vien lien ket, ATND_DT = hom nay, CHK_IN_TM = now(), ATND_STTS_CD = 'PRESENT', CREAT_BY = email user
- **Verification Method**: snapshot / network
- **Test Data**: `{ user: "user@hrlite.com", expectedStatus: "PRESENT" }`

### E2E-A002: Check-out thanh cong (tinh workHour)
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Dang nhap USER, da check-in hom nay luc 08:30, chua check-out
- **User Journey**:
  1. Xem widget — hien thi gio check-in 08:30 va nut "Check-out"
  2. Click nut "Check-out"
  3. He thong ghi nhan gio ra va tinh so gio lam
- **Expected Results**:
  - UI: Widget chuyen sang trang thai "Da check-out" — hien thi gio in/out + tong gio lam (mau xam, khong co nut)
  - API: POST /api/attendance/check-out → 200 OK, response: `{ success: true, data: { chkInTm: "2026-03-24T08:30:00.000Z", chkOutTm: "2026-03-24T17:30:00.000Z", workHour: 9.00, atndSttsCd: "PRESENT" } }`
  - DB: TH_ATND cap nhat CHK_OUT_TM = now(), WORK_HOUR = (chkOutTm - chkInTm) / 3600000 lam tron 2 chu so, UPDT_DT populated
- **Verification Method**: snapshot / network
- **Test Data**: `{ chkInTm: "08:30", expectedWorkHour: 9.00 }`

### E2E-A003: Check-in sau 09:00 (LATE status)
- **Type**: Alternative Path
- **Priority**: Critical
- **Preconditions**: Dang nhap USER, tai khoan lien ket NV, chua check-in hom nay, gio hien tai sau 09:00
- **User Journey**:
  1. Dang nhap luc 09:15
  2. Click nut "Check-in" tren widget
- **Expected Results**:
  - UI: Widget hien thi trang thai "Da check-in", gio vao 09:15
  - API: POST /api/attendance/check-in → 201 Created, response: `{ data: { atndSttsCd: "LATE" } }`
  - DB: TH_ATND.ATND_STTS_CD = 'LATE', CHK_IN_TM sau 09:00
- **Verification Method**: network
- **Test Data**: `{ checkInTime: "09:15", expectedStatus: "LATE" }`

### E2E-A004: Check-in trung (da check-in roi)
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Dang nhap USER, da check-in hom nay
- **User Journey**:
  1. Goi API POST /api/attendance/check-in lan thu 2 trong ngay
- **Expected Results**:
  - UI: Toast loi "Ban da check-in hom nay roi."
  - API: POST /api/attendance/check-in → 400 Bad Request, error: "Ban da check-in hom nay roi."
  - DB: Khong thay doi, van chi 1 ban ghi cho ngay hom nay
- **Verification Method**: network
- **Test Data**: Khong can them

### E2E-A005: Check-out khi chua check-in
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Dang nhap USER, chua check-in hom nay
- **User Journey**:
  1. Goi API POST /api/attendance/check-out khi chua co ban ghi check-in
- **Expected Results**:
  - UI: Toast loi "Ban chua check-in hom nay."
  - API: POST /api/attendance/check-out → 400 Bad Request, error: "Ban chua check-in hom nay."
  - DB: Khong thay doi
- **Verification Method**: network
- **Test Data**: Khong can them

### E2E-A006: Check-out trung (da check-out roi)
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Dang nhap USER, da check-in va check-out hom nay
- **User Journey**:
  1. Goi API POST /api/attendance/check-out lan thu 2 trong ngay
- **Expected Results**:
  - UI: Toast loi "Ban da check-out hom nay roi."
  - API: POST /api/attendance/check-out → 400 Bad Request, error: "Ban da check-out hom nay roi."
  - DB: Khong thay doi, WORK_HOUR giu nguyen gia tri lan check-out dau
- **Verification Method**: network
- **Test Data**: Khong can them

### E2E-A007: Check-in khi chua lien ket Employee
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Dang nhap USER, tai khoan chua lien ket voi nhan vien nao (TB_EMPL.USER_ID khong co)
- **User Journey**:
  1. Click nut "Check-in" tren widget
- **Expected Results**:
  - UI: Toast loi "Tai khoan chua lien ket voi nhan vien nao."
  - API: POST /api/attendance/check-in → 400 Bad Request, error: "Tai khoan chua lien ket voi nhan vien nao."
  - DB: Khong tao ban ghi moi
- **Verification Method**: network
- **Test Data**: `{ user: "unlinked-user@hrlite.com" }`

### E2E-A008: Check-in khi NV da nghi viec
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Dang nhap USER, tai khoan lien ket voi NV co EMPL_STTS_CD = 'RESIGNED'
- **User Journey**:
  1. Click nut "Check-in" tren widget
- **Expected Results**:
  - UI: Toast loi "Nhan vien khong o trang thai dang lam viec."
  - API: POST /api/attendance/check-in → 400 Bad Request, error: "Nhan vien khong o trang thai dang lam viec."
  - DB: Khong tao ban ghi moi
- **Verification Method**: network
- **Test Data**: `{ user: "resigned-employee-user@hrlite.com", emplSttsCd: "RESIGNED" }`

### E2E-A009: Xem trang thai hom nay (GET /api/attendance/today)
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap USER, da check-in hom nay luc 08:30
- **User Journey**:
  1. Goi API GET /api/attendance/today
  2. Kiem tra response tra ve trang thai check-in hien tai
- **Expected Results**:
  - API: GET /api/attendance/today → 200 OK, response: `{ success: true, data: { atndDt: "2026-03-24", chkInTm: "2026-03-24T08:30:00.000Z", chkOutTm: null, workHour: null, atndSttsCd: "PRESENT" } }`
  - API (chua check-in): response: `{ success: true, data: null }`
- **Verification Method**: network
- **Test Data**: Khong can them

---

## Scenario Group 2: CRUD Cham cong (Admin)

### E2E-A010: Tao cham cong thu cong thanh cong
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Dang nhap ADMIN, nhan vien NV-0001 ton tai va dang WORKING, ngay 2026-03-20 chua co ban ghi cham cong cho NV-0001
- **User Journey**:
  1. Navigate to `/attendance`
  2. Click nut "Tao cham cong"
  3. Chon Nhan vien: "Nguyen Van An (NV-0001)"
  4. Chon Ngay: 2026-03-20
  5. Nhap Gio vao: 08:30
  6. Nhap Gio ra: 17:30
  7. Chon Trang thai: PRESENT
  8. Nhap Ghi chu: "Bo sung cham cong"
  9. Click "Tao moi"
- **Expected Results**:
  - UI: Toast "Da tao cham cong", dialog dong, ban ghi moi hien thi trong bang
  - API: POST /api/attendance → 201 Created, response chua workHour = 9.00 (tu tinh tu chkInTm va chkOutTm)
  - DB: TH_ATND co ban ghi moi voi EMPL_ID = NV-0001 ID, ATND_DT = '2026-03-20', WORK_HOUR = 9.00, RMK = 'Bo sung cham cong', CREAT_BY = admin email
- **Verification Method**: snapshot / network
- **Test Data**: `{ emplId: "NV-0001-uuid", atndDt: "2026-03-20", chkInTm: "2026-03-20T08:30:00.000Z", chkOutTm: "2026-03-20T17:30:00.000Z", atndSttsCd: "PRESENT", rmk: "Bo sung cham cong" }`

### E2E-A011: Tao cham cong trung ngay (409)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Dang nhap ADMIN, NV-0001 da co ban ghi cham cong ngay 2026-03-20
- **User Journey**:
  1. Goi API POST /api/attendance voi body: `{ emplId: "NV-0001-uuid", atndDt: "2026-03-20", atndSttsCd: "PRESENT" }`
- **Expected Results**:
  - UI: Toast loi "Nhan vien da co ban ghi cham cong cho ngay nay."
  - API: POST /api/attendance → 409 Conflict
  - DB: Khong tao ban ghi trung lap, unique constraint (emplId, atndDt) duoc bao ve
- **Verification Method**: network
- **Test Data**: `{ emplId: "NV-0001-uuid", atndDt: "2026-03-20" }`

### E2E-A012: Tao cham cong NV khong ton tai (400)
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Dang nhap ADMIN
- **User Journey**:
  1. Goi API POST /api/attendance voi body: `{ emplId: "non-existent-uuid", atndDt: "2026-03-20", atndSttsCd: "PRESENT" }`
- **Expected Results**:
  - API: POST /api/attendance → 400 Bad Request, error: "Nhan vien khong ton tai hoac khong o trang thai lam viec."
  - DB: Khong tao ban ghi
- **Verification Method**: network
- **Test Data**: `{ emplId: "00000000-0000-0000-0000-000000000000" }`

### E2E-A013: Sua cham cong (cap nhat gio, tinh lai workHour)
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap ADMIN, ban ghi cham cong ATND-001 ton tai voi chkInTm=08:30, chkOutTm=17:30, workHour=9.00
- **User Journey**:
  1. Navigate to `/attendance`
  2. Click icon sua (Pencil) o dong cham cong can sua
  3. Doi Gio vao thanh 09:15
  4. Doi Trang thai thanh LATE
  5. Click "Cap nhat"
- **Expected Results**:
  - UI: Toast "Da cap nhat cham cong", bang cap nhat gio vao moi va workHour moi
  - API: PATCH /api/attendance/[id] → 200 OK, response chua workHour duoc tinh lai = 8.25 (17:30 - 09:15)
  - DB: TH_ATND.CHK_IN_TM cap nhat, WORK_HOUR = 8.25, ATND_STTS_CD = 'LATE', UPDT_BY = admin email, UPDT_DT populated
- **Verification Method**: snapshot / network
- **Test Data**: `{ chkInTm: "2026-03-20T09:15:00.000Z", atndSttsCd: "LATE" }`

### E2E-A014: Xoa cham cong thanh cong
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap ADMIN, ban ghi cham cong test ton tai
- **User Journey**:
  1. Navigate to `/attendance`
  2. Click icon xoa (Trash) o dong cham cong can xoa
  3. Xac nhan xoa trong dialog
- **Expected Results**:
  - UI: Toast "Da xoa cham cong", ban ghi bien mat khoi bang
  - API: DELETE /api/attendance/[id] → 200 OK
  - DB: Ban ghi TH_ATND bi xoa vinh vien (hard delete)
- **Verification Method**: snapshot / network
- **Test Data**: Tao ban ghi cham cong test truoc khi xoa

### E2E-A015: Tao cham cong voi gio ra truoc gio vao (400)
- **Type**: Error Path
- **Priority**: High
- **Preconditions**: Dang nhap ADMIN
- **User Journey**:
  1. Goi API POST /api/attendance voi body: `{ emplId: "NV-0001-uuid", atndDt: "2026-03-20", chkInTm: "2026-03-20T17:30:00.000Z", chkOutTm: "2026-03-20T08:30:00.000Z", atndSttsCd: "PRESENT" }`
- **Expected Results**:
  - UI: Hien thi loi validation "Gio ra phai sau gio vao"
  - API: POST /api/attendance → 400 Bad Request, error: "Gio ra phai sau gio vao"
  - DB: Khong tao ban ghi
- **Verification Method**: network
- **Test Data**: `{ chkInTm: "2026-03-20T17:30:00.000Z", chkOutTm: "2026-03-20T08:30:00.000Z" }`

---

## Scenario Group 3: Danh sach va loc

### E2E-A016: Danh sach cham cong (phan trang)
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap ADMIN, seed data cham cong cho 10 NV trong 2-3 tuan (khoang 50+ ban ghi)
- **User Journey**:
  1. Navigate to `/attendance`
  2. Kiem tra bang hien thi toi da 20 ban ghi (limit mac dinh)
  3. Kiem tra pagination: tong so trang, nut chuyen trang
  4. Click trang 2
- **Expected Results**:
  - UI: Bang hien thi 20 ban ghi/trang, cac cot: Ngay | Ma NV | Ho ten | Phong ban | Gio vao | Gio ra | So gio | Trang thai | Hanh dong
  - API: GET /api/attendance?page=1&limit=20 → 200 OK, meta: `{ total: 50, page: 1, limit: 20, totalPages: 3 }`
  - API: GET /api/attendance?page=2&limit=20 → trang 2
- **Verification Method**: snapshot / network
- **Test Data**: Seed data 50+ ban ghi cham cong

### E2E-A017: Loc theo thang
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap ADMIN, co du lieu cham cong thang 03/2026 va 02/2026
- **User Journey**:
  1. Navigate to `/attendance`
  2. Chon bo loc thang: "2026-02"
  3. Kiem tra bang chi hien thi ban ghi thang 2
- **Expected Results**:
  - UI: Bang chi hien thi cac ban ghi co ATND_DT trong thang 2/2026
  - API: GET /api/attendance?month=2026-02 → 200 OK, tat ca ban ghi co atndDt bat dau bang "2026-02"
- **Verification Method**: network
- **Test Data**: `{ month: "2026-02" }`

### E2E-A018: Loc theo phong ban
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap ADMIN, co du lieu cham cong nhieu phong ban
- **User Journey**:
  1. Navigate to `/attendance`
  2. Chon bo loc phong ban: "Phong Ky thuat"
- **Expected Results**:
  - UI: Bang chi hien thi ban ghi cham cong cua NV thuoc Phong Ky thuat
  - API: GET /api/attendance?deptId=[DEPT-TECH-id] → 200 OK, tat ca ban ghi co employee.department.deptNm = "Phong Ky thuat"
- **Verification Method**: network
- **Test Data**: `{ deptId: "DEPT-TECH-uuid" }`

### E2E-A019: Loc theo trang thai
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap ADMIN, co du lieu cham cong voi nhieu trang thai (PRESENT, LATE, ABSENT)
- **User Journey**:
  1. Navigate to `/attendance`
  2. Chon bo loc trang thai: "LATE" (Di tre)
- **Expected Results**:
  - UI: Bang chi hien thi ban ghi co badge "LATE" (mau cam)
  - API: GET /api/attendance?status=LATE → 200 OK, tat ca ban ghi co atndSttsCd = "LATE"
- **Verification Method**: network
- **Test Data**: `{ status: "LATE" }`

### E2E-A020: USER chi xem duoc ban ghi cua minh
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Dang nhap USER (user@hrlite.com), tai khoan lien ket voi NV-0005
- **User Journey**:
  1. Goi API GET /api/attendance?page=1&limit=20 voi token USER
  2. Kiem tra response chi chua ban ghi cua NV-0005
  3. Thu goi API GET /api/attendance?emplId=[NV-0001-id] voi token USER
- **Expected Results**:
  - API: GET /api/attendance → 200 OK, tat ca ban ghi co emplId = NV-0005 ID (khong hien thi NV khac)
  - API: Tham so emplId bi bo qua khi USER goi — luon chi tra ve ban ghi cua chinh minh
  - DB: Chi truy van WHERE EMPL_ID = NV lien ket voi USER hien tai
- **Verification Method**: network
- **Test Data**: `{ user: "user@hrlite.com", linkedEmplNo: "NV-0005" }`

---

## Scenario Group 4: Bao cao va thong ke

### E2E-A021: Bao cao tong hop thang (GET /api/attendance/summary)
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap ADMIN, seed data cham cong thang 03/2026 cho 10 NV
- **User Journey**:
  1. Goi API GET /api/attendance/summary?month=2026-03
  2. Kiem tra response chua thong tin tong hop cho tung nhan vien
- **Expected Results**:
  - API: GET /api/attendance/summary?month=2026-03 → 200 OK
  - Data: `{ month: "2026-03", workingDays: 22, employees: [{ emplNo: "NV-0001", emplNm: "Nguyen Van An", deptNm: "Phong Nhan su", presentDays: 20, lateDays: 1, absentDays: 1, halfDays: 0, totalWorkHours: 168.50 }, ...] }`
  - Data: So luong employees = 10, tong presentDays + lateDays + absentDays + halfDays <= workingDays cho moi NV
- **Verification Method**: network
- **Test Data**: `{ month: "2026-03" }`

### E2E-A022: Thong ke dashboard (GET /api/attendance/stats)
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap (USER hoac ADMIN), seed data cham cong hom nay cho mot so NV
- **User Journey**:
  1. Goi API GET /api/attendance/stats
  2. Kiem tra response chua thong ke cham cong hom nay
- **Expected Results**:
  - API: GET /api/attendance/stats → 200 OK
  - Data: `{ date: "2026-03-24", totalEmployees: 10, checkedIn: 8, notCheckedIn: 2, checkedOut: 5, lateCount: 1 }`
  - Data: totalEmployees = so NV dang WORKING, checkedIn + notCheckedIn = totalEmployees
- **Verification Method**: network
- **Test Data**: Seed data 8/10 NV da check-in hom nay, 1 NV di tre

---

## Scenario Group 5: Phan quyen

### E2E-A023: USER khong tao cham cong thu cong (403)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Dang nhap USER
- **User Journey**:
  1. Goi API POST /api/attendance voi body: `{ emplId: "any-uuid", atndDt: "2026-03-20", atndSttsCd: "PRESENT" }`
- **Expected Results**:
  - API: POST /api/attendance → 403 Forbidden
  - DB: Khong tao ban ghi
- **Verification Method**: network
- **Test Data**: Token USER

### E2E-A024: USER khong sua/xoa cham cong (403)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Dang nhap USER, ban ghi cham cong ATND-001 ton tai
- **User Journey**:
  1. Goi API PATCH /api/attendance/[ATND-001-id] voi token USER
  2. Goi API DELETE /api/attendance/[ATND-001-id] voi token USER
- **Expected Results**:
  - API: PATCH /api/attendance/[id] → 403 Forbidden
  - API: DELETE /api/attendance/[id] → 403 Forbidden
  - DB: Khong thay doi
- **Verification Method**: network
- **Test Data**: Token USER, ATND-001 ID

### E2E-A025: API khong co token (401)
- **Type**: Error Path
- **Priority**: Critical
- **Preconditions**: Khong dang nhap (khong co JWT token)
- **User Journey**:
  1. Goi API GET /api/attendance khong co header Authorization
  2. Goi API POST /api/attendance/check-in khong co header Authorization
  3. Goi API GET /api/attendance/today khong co header Authorization
  4. Goi API GET /api/attendance/summary khong co header Authorization
  5. Goi API GET /api/attendance/stats khong co header Authorization
- **Expected Results**:
  - API: Tat ca endpoint tra ve 401 Unauthorized
  - Response: `{ success: false, error: "Unauthorized" }` hoac tuong tu
- **Verification Method**: network
- **Test Data**: Khong co token

---

## Scenario Group 6: UI — Trang /attendance

### E2E-A026: Load trang ADMIN hien thi bang + thong ke
- **Type**: Happy Path
- **Priority**: Critical
- **Preconditions**: Dang nhap ADMIN, seed data cham cong
- **User Journey**:
  1. Navigate to `/attendance`
  2. Kiem tra 4 the thong ke: "Co mat hom nay" | "Chua check-in" | "Di tre" | "Da check-out"
  3. Kiem tra bo loc: Thang (month picker) | Phong ban (dropdown) | Trang thai (dropdown)
  4. Kiem tra bang du lieu: cac cot Ngay | Ma NV | Ho ten | Phong ban | Gio vao | Gio ra | So gio | Trang thai | Hanh dong
  5. Kiem tra nut "Tao cham cong" hien thi
  6. Kiem tra badge trang thai: PRESENT (xanh), LATE (cam), HALF_DAY (vang), ABSENT (do), HOLIDAY (xam)
- **Expected Results**:
  - UI: Layout day du — 4 the thong ke o tren, bo loc phia duoi, bang du lieu chinh, pagination
  - UI: Badge trang thai hien thi dung mau sac theo quy dinh
  - UI: Moi dong co icon Sua (Pencil) va Xoa (Trash) trong cot Hanh dong
  - API: GET /api/attendance/stats → 200 OK (load thong ke)
  - API: GET /api/attendance?page=1&limit=20 → 200 OK (load bang)
- **Verification Method**: snapshot / network
- **Test Data**: Seed data cham cong da san

### E2E-A027: Dialog tao cham cong
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap ADMIN, trang `/attendance` da load
- **User Journey**:
  1. Click nut "Tao cham cong"
  2. Kiem tra dialog mo ra voi cac truong: Nhan vien (Select search) | Ngay (Date picker) | Gio vao (Time input) | Gio ra (Time input) | Trang thai (Select) | Ghi chu (Textarea)
  3. Kiem tra dropdown Nhan vien chi hien thi NV dang WORKING
  4. Kiem tra dropdown Trang thai co 5 lua chon: PRESENT, LATE, HALF_DAY, ABSENT, HOLIDAY
  5. Nhap day du thong tin hop le
  6. Click "Tao moi"
  7. Kiem tra dialog dong va bang cap nhat
- **Expected Results**:
  - UI: Dialog hien thi day du cac truong form theo thiet ke
  - UI: Truong Nhan vien co chuc nang tim kiem, chi hien thi NV co EMPL_STTS_CD = 'WORKING'
  - UI: Truong Ghi chu co gioi han 500 ky tu
  - UI: Nut "Tao moi" chi enable khi da nhap cac truong bat buoc (Nhan vien, Ngay, Trang thai)
  - UI: Sau khi tao thanh cong, dialog dong va bang reload du lieu moi
- **Verification Method**: snapshot / network
- **Test Data**: Form data hop le

---

## Scenario Group 7: UI — Tab Cham cong trong chi tiet NV

### E2E-A028: Tab hien thi lich su cham cong thang
- **Type**: Happy Path
- **Priority**: High
- **Preconditions**: Dang nhap, xem chi tiet nhan vien NV-0001, co du lieu cham cong thang 03/2026
- **User Journey**:
  1. Navigate to `/employees/[NV-0001-id]`
  2. Click tab "Cham cong" (tab thu 3)
  3. Kiem tra bang lich su cham cong thang hien tai (03/2026)
  4. Kiem tra phan tong hop thang: Ngay cong | Di tre | Vang | Tong gio lam
- **Expected Results**:
  - UI: Bang hien thi cac cot: Ngay | Gio vao | Gio ra | So gio | Trang thai | Ghi chu
  - UI: Phan tong hop phia tren bang hien thi so lieu thong ke thang (vd: 20 ngay cong, 1 di tre, 1 vang, 168.5 gio)
  - UI: Month picker hien thi thang hien tai (03/2026)
  - API: GET /api/attendance?emplId=[NV-0001-id]&month=2026-03 → 200 OK
- **Verification Method**: snapshot / network
- **Test Data**: Seed data cham cong NV-0001 thang 03/2026

### E2E-A029: Doi thang xem lich su
- **Type**: Happy Path
- **Priority**: Medium
- **Preconditions**: Dang nhap, dang xem tab Cham cong cua NV-0001, co du lieu thang 02/2026
- **User Journey**:
  1. Dang o tab Cham cong, thang hien tai 03/2026
  2. Click month picker, chon thang 02/2026
  3. Kiem tra bang cap nhat du lieu thang 2
  4. Kiem tra tong hop thang cap nhat theo thang 2
- **Expected Results**:
  - UI: Bang reload va hien thi ban ghi cham cong thang 02/2026
  - UI: Phan tong hop cap nhat so lieu thang 2
  - API: GET /api/attendance?emplId=[NV-0001-id]&month=2026-02 → 200 OK
- **Verification Method**: snapshot / network
- **Test Data**: Seed data cham cong NV-0001 thang 02/2026

---

## Summary
| Type | Count |
|------|-------|
| Happy Path | 16 |
| Alternative Path | 1 |
| Error Path | 12 |
| **Total** | **29** |
