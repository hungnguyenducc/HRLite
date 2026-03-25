# Thiết kế cơ sở dữ liệu — HRLite

> Tài liệu này là nguồn duy nhất (SSoT) cho tất cả thiết kế DB của dự án.

## Quy tắc chung

### Tiền tố bảng
| Tiền tố | Ý nghĩa | Ví dụ |
|---------|---------|-------|
| TB_ | Bảng thông thường | TB_EMPL (Nhân viên) |
| TC_ | Bảng mã | TC_DEPT_TYPE (Loại phòng ban) |
| TH_ | Bảng lịch sử | TH_ATND (Lịch sử chấm công) |
| TL_ | Bảng log | TL_SYS_LOG (Log hệ thống) |
| TR_ | Bảng quan hệ | TR_EMPL_DEPT (Quan hệ nhân viên-phòng ban) |

### Quy tắc cột chung
- Khóa chính: `{TABLE_PREFIX}_ID` (UUID)
- Thời gian tạo: `CREAT_DT` (TIMESTAMP)
- Người tạo: `CREAT_BY` (VARCHAR)
- Thời gian cập nhật: `UPDT_DT` (TIMESTAMP)
- Người cập nhật: `UPDT_BY` (VARCHAR)
- Trạng thái xóa: `DEL_YN` (CHAR(1), mặc định 'N')

## ERD tổng quan

```
TB_EMPL (Nhân viên)
  ├── TB_DEPT (Phòng ban) [N:1]
  ├── TH_ATND (Chấm công) [1:N]
  └── TB_LV_REQ (Yêu cầu nghỉ phép) [1:N]
       └── TC_LV_TYPE (Loại nghỉ phép) [N:1]
```

## Thiết kế chi tiết theo module

### Module 001: Quản lý nhân viên

#### TB_EMPL (Nhân viên)
| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| EMPL_ID | UUID | ID nhân viên | PK |
| EMPL_NO | VARCHAR(20) | Mã nhân viên | UNIQUE, NOT NULL |
| EMPL_NM | VARCHAR(100) | Tên nhân viên | NOT NULL |
| EMAIL | VARCHAR(255) | Email | UNIQUE, NOT NULL |
| PHONE_NO | VARCHAR(20) | Số điện thoại | |
| DEPT_ID | UUID | ID phòng ban | FK → TB_DEPT |
| POSI_NM | VARCHAR(50) | Chức vụ | |
| JOIN_DT | DATE | Ngày vào làm | NOT NULL |
| RESIGN_DT | DATE | Ngày nghỉ việc | |
| EMPL_STTS_CD | VARCHAR(20) | Mã trạng thái | NOT NULL |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật | |
| UPDT_BY | VARCHAR(100) | Người cập nhật | |
| DEL_YN | CHAR(1) | Đã xóa | DEFAULT 'N' |

### Module 002: Quản lý phòng ban

#### TB_DEPT (Phòng ban)
| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| DEPT_ID | UUID | ID phòng ban | PK |
| DEPT_CD | VARCHAR(20) | Mã phòng ban | UNIQUE, NOT NULL |
| DEPT_NM | VARCHAR(100) | Tên phòng ban | NOT NULL |
| UPPER_DEPT_ID | UUID | ID phòng ban cấp trên | FK → TB_DEPT |
| DEPT_HEAD_ID | UUID | ID trưởng phòng | FK → TB_EMPL |
| SORT_ORD | INT | Thứ tự sắp xếp | |
| USE_YN | CHAR(1) | Đang sử dụng | DEFAULT 'Y' |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật | |
| UPDT_BY | VARCHAR(100) | Người cập nhật | |
| DEL_YN | CHAR(1) | Đã xóa | DEFAULT 'N' |

### Module 003: Chấm công

#### TH_ATND (Lịch sử chấm công)
| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| ATND_ID | UUID | ID chấm công | PK |
| EMPL_ID | UUID | ID nhân viên | FK → TB_EMPL, NOT NULL |
| ATND_DT | DATE | Ngày chấm công | NOT NULL |
| CHK_IN_TM | TIMESTAMP | Giờ vào | |
| CHK_OUT_TM | TIMESTAMP | Giờ ra | |
| WORK_HOUR | DECIMAL(4,2) | Số giờ làm | |
| ATND_STTS_CD | VARCHAR(20) | Mã trạng thái | NOT NULL |
| RMK | TEXT | Ghi chú | |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật | |
| UPDT_BY | VARCHAR(100) | Người cập nhật | |

### Module 004: Nghỉ phép

#### TB_LV_REQ (Yêu cầu nghỉ phép)
| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| LV_REQ_ID | UUID | ID yêu cầu | PK |
| EMPL_ID | UUID | ID nhân viên | FK → TB_EMPL, NOT NULL |
| LV_TYPE_CD | VARCHAR(20) | Mã loại nghỉ | FK → TC_LV_TYPE, NOT NULL |
| START_DT | DATE | Ngày bắt đầu | NOT NULL |
| END_DT | DATE | Ngày kết thúc | NOT NULL |
| LV_DAYS | DECIMAL(3,1) | Số ngày nghỉ | NOT NULL |
| RSN | TEXT | Lý do | NOT NULL |
| APRVL_STTS_CD | VARCHAR(20) | Mã trạng thái phê duyệt | NOT NULL |
| APRVR_ID | UUID | ID người phê duyệt | FK → TB_EMPL |
| APRVL_DT | TIMESTAMP | Thời gian phê duyệt | |
| RJCT_RSN | TEXT | Lý do từ chối | |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật | |
| UPDT_BY | VARCHAR(100) | Người cập nhật | |

#### TC_LV_TYPE (Loại nghỉ phép)
| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| LV_TYPE_CD | VARCHAR(20) | Mã loại nghỉ | PK |
| LV_TYPE_NM | VARCHAR(50) | Tên loại nghỉ | NOT NULL |
| MAX_DAYS | INT | Số ngày tối đa/năm | |
| USE_YN | CHAR(1) | Đang sử dụng | DEFAULT 'Y' |

### Module Auth: Xác thực & Phân quyền

#### TB_COMM_USER (Tài khoản người dùng)
| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| USER_ID | UUID | ID người dùng | PK, DEFAULT gen_random_uuid() |
| EML_ADDR | VARCHAR(255) | Địa chỉ email | UNIQUE, NOT NULL |
| PASSWD_HASH | VARCHAR(256) | Mật khẩu đã mã hóa (bcrypt) | NOT NULL |
| INDCT_NM | VARCHAR(100) | Tên hiển thị | |
| TELNO | VARCHAR(20) | Số điện thoại | |
| PHOTO_URL | VARCHAR(500) | URL ảnh đại diện | |
| ROLE_CD | VARCHAR(20) | Mã vai trò (ADMIN, USER) | NOT NULL, DEFAULT 'USER' |
| STTS_CD | VARCHAR(20) | Mã trạng thái (ACTIVE, INACTIVE, SUSPENDED) | NOT NULL, DEFAULT 'ACTIVE' |
| LAST_LOGIN_DT | TIMESTAMP | Thời gian đăng nhập cuối | |
| WHDWL_DT | TIMESTAMP | Thời gian rút lui (yêu cầu xóa tài khoản) | |
| DEL_DT | TIMESTAMP | Thời gian xóa | |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL, DEFAULT NOW() |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật | |
| UPDT_BY | VARCHAR(100) | Người cập nhật | |
| DEL_YN | CHAR(1) | Đã xóa | DEFAULT 'N' |

#### TB_COMM_TRMS (Điều khoản sử dụng)
| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| TRMS_ID | UUID | ID điều khoản | PK, DEFAULT gen_random_uuid() |
| TY_CD | VARCHAR(20) | Mã loại điều khoản | NOT NULL |
| VER_NO | INT | Số phiên bản | NOT NULL |
| TTL | VARCHAR(200) | Tiêu đề | NOT NULL |
| CN | TEXT | Nội dung | NOT NULL |
| REQD_YN | CHAR(1) | Bắt buộc đồng ý | NOT NULL, DEFAULT 'Y' |
| ENFC_DT | TIMESTAMP | Ngày hiệu lực | NOT NULL |
| ACTV_YN | CHAR(1) | Đang hoạt động | DEFAULT 'Y' |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL, DEFAULT NOW() |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật | |
| UPDT_BY | VARCHAR(100) | Người cập nhật | |
| DEL_YN | CHAR(1) | Đã xóa | DEFAULT 'N' |

#### TH_COMM_USER_AGRE (Lịch sử đồng ý điều khoản)
| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| AGRE_ID | UUID | ID bản ghi đồng ý | PK, DEFAULT gen_random_uuid() |
| USER_ID | UUID | ID người dùng | FK → TB_COMM_USER, NOT NULL |
| TRMS_ID | UUID | ID điều khoản | FK → TB_COMM_TRMS, NOT NULL |
| AGRE_YN | CHAR(1) | Đã đồng ý | NOT NULL, DEFAULT 'Y' |
| AGRE_DT | TIMESTAMP | Thời gian đồng ý | NOT NULL, DEFAULT NOW() |
| IP_ADDR | VARCHAR(45) | Địa chỉ IP | |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL, DEFAULT NOW() |
| CREAT_BY | VARCHAR(100) | Người tạo | NOT NULL |

#### TB_COMM_RFRSH_TKN (Refresh Token)
| Cột | Kiểu | Mô tả | Ràng buộc |
|-----|------|--------|-----------|
| TKN_ID | UUID | ID token | PK, DEFAULT gen_random_uuid() |
| USER_ID | UUID | ID người dùng | FK → TB_COMM_USER, NOT NULL |
| TKN_HASH | VARCHAR(512) | Hash của refresh token | NOT NULL |
| EXPR_DT | TIMESTAMP | Thời gian hết hạn | NOT NULL |
| REVK_YN | CHAR(1) | Đã thu hồi | DEFAULT 'N' |
| REVK_DT | TIMESTAMP | Thời gian thu hồi | |
| USR_AGNT | VARCHAR(500) | User agent của trình duyệt | |
| IP_ADDR | VARCHAR(45) | Địa chỉ IP | |
| CREAT_DT | TIMESTAMP | Thời gian tạo | NOT NULL, DEFAULT NOW() |

## ERD tổng quan (cập nhật)

```
TB_COMM_USER (Tài khoản)
  ├── TH_COMM_USER_AGRE (Đồng ý điều khoản) [1:N]
  │     └── TB_COMM_TRMS (Điều khoản) [N:1]
  └── TB_COMM_RFRSH_TKN (Refresh Token) [1:N]

TB_EMPL (Nhân viên)
  ├── TB_DEPT (Phòng ban) [N:1]
  ├── TH_ATND (Chấm công) [1:N]
  └── TB_LV_REQ (Yêu cầu nghỉ phép) [1:N]
       └── TC_LV_TYPE (Loại nghỉ phép) [N:1]
```

## Tóm tắt quan hệ Foreign Key

| FK | Bảng nguồn | Bảng đích | Cột |
|----|-----------|-----------|-----|
| FK_EMPL_DEPT | TB_EMPL | TB_DEPT | DEPT_ID |
| FK_DEPT_UPPER | TB_DEPT | TB_DEPT | UPPER_DEPT_ID |
| FK_DEPT_HEAD | TB_DEPT | TB_EMPL | DEPT_HEAD_ID |
| FK_ATND_EMPL | TH_ATND | TB_EMPL | EMPL_ID |
| FK_LV_REQ_EMPL | TB_LV_REQ | TB_EMPL | EMPL_ID |
| FK_LV_REQ_TYPE | TB_LV_REQ | TC_LV_TYPE | LV_TYPE_CD |
| FK_LV_REQ_APRVR | TB_LV_REQ | TB_EMPL | APRVR_ID |
| FK_USER_AGRE_USER | TH_COMM_USER_AGRE | TB_COMM_USER | USER_ID |
| FK_USER_AGRE_TRMS | TH_COMM_USER_AGRE | TB_COMM_TRMS | TRMS_ID |
| FK_RFRSH_TKN_USER | TB_COMM_RFRSH_TKN | TB_COMM_USER | USER_ID |
