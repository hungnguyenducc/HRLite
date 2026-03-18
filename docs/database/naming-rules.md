# Quy tắc đặt tên DB — HRLite

## Quy tắc tên bảng

### Tiền tố
| Tiền tố | Ý nghĩa | Ví dụ |
|---------|---------|-------|
| TB_ | Bảng thông thường | TB_EMPL, TB_DEPT |
| TC_ | Bảng mã (code) | TC_LV_TYPE, TC_DEPT_TYPE |
| TH_ | Bảng lịch sử | TH_ATND, TH_SALARY |
| TL_ | Bảng log | TL_SYS_LOG, TL_API_LOG |
| TR_ | Bảng quan hệ (N:N) | TR_EMPL_ROLE |

### Quy tắc chung
- Tất cả viết hoa, phân cách bằng dấu gạch dưới (_)
- Dùng viết tắt tiếng Anh theo từ điển thuật ngữ chuẩn
- Tối đa 30 ký tự

## Quy tắc tên cột

### Cột chung (có trong mọi bảng)
| Cột | Kiểu | Mô tả |
|-----|------|--------|
| {PREFIX}_ID | UUID | Khóa chính |
| CREAT_DT | TIMESTAMP | Thời gian tạo |
| CREAT_BY | VARCHAR(100) | Người tạo |
| UPDT_DT | TIMESTAMP | Thời gian cập nhật |
| UPDT_BY | VARCHAR(100) | Người cập nhật |
| DEL_YN | CHAR(1) | Cờ xóa mềm (Y/N) |

### Quy ước hậu tố cột
| Hậu tố | Ý nghĩa | Kiểu | Ví dụ |
|--------|---------|------|-------|
| _ID | Khóa chính/ngoại | UUID | EMPL_ID, DEPT_ID |
| _CD | Mã code | VARCHAR | STTS_CD, LV_TYPE_CD |
| _NM | Tên | VARCHAR | EMPL_NM, DEPT_NM |
| _NO | Số hiệu | VARCHAR | EMPL_NO, PHONE_NO |
| _DT | Ngày tháng | DATE/TIMESTAMP | JOIN_DT, CREAT_DT |
| _TM | Thời gian | TIMESTAMP | CHK_IN_TM |
| _YN | Cờ có/không | CHAR(1) | DEL_YN, USE_YN |
| _CN | Số đếm | INT | RETRY_CN |
| _AM | Số tiền | DECIMAL | SALARY_AM |
| _RT | Tỷ lệ | DECIMAL | TAX_RT |
| _ORD | Thứ tự | INT | SORT_ORD |

## Ánh xạ thuật ngữ chuẩn

| Tiếng Việt | Viết tắt tiếng Anh | Mô tả |
|-----------|-------------------|-------|
| Nhân viên | EMPL | Employee |
| Phòng ban | DEPT | Department |
| Chấm công | ATND | Attendance |
| Nghỉ phép | LV | Leave |
| Trạng thái | STTS | Status |
| Phê duyệt | APRVL | Approval |
| Người phê duyệt | APRVR | Approver |
| Chức vụ | POSI | Position |
| Ghi chú | RMK | Remark |
| Lý do | RSN | Reason |
| Tạo | CREAT | Create |
| Cập nhật | UPDT | Update |
| Xóa | DEL | Delete |
| Sử dụng | USE | Use |

## Quy tắc Index
- Tên: `IDX_{TABLE}_{COLUMN(S)}`
- Ví dụ: `IDX_TB_EMPL_EMAIL`, `IDX_TH_ATND_EMPL_DT`

## Quy tắc Foreign Key
- Tên: `FK_{SOURCE_TABLE}_{TARGET_TABLE}`
- Ví dụ: `FK_EMPL_DEPT`, `FK_ATND_EMPL`
