import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUUID,
  MaxLength,
  Matches,
  IsIn,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được trống' })
  @MaxLength(100, { message: 'Họ tên tối đa 100 ký tự' })
  emplNm: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255, { message: 'Email tối đa 255 ký tự' })
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+]+$/, { message: 'Số điện thoại chỉ chứa số và dấu +' })
  phoneNo?: string | null;

  @IsOptional()
  @IsUUID('4', { message: 'ID phòng ban không hợp lệ' })
  deptId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Chức vụ tối đa 50 ký tự' })
  posiNm?: string | null;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày vào làm phải có format YYYY-MM-DD',
  })
  joinDt: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày nghỉ việc phải có format YYYY-MM-DD',
  })
  resignDt?: string | null;

  @IsOptional()
  @IsIn(['WORKING', 'ON_LEAVE', 'RESIGNED'])
  emplSttsCd?: string = 'WORKING';

  @IsOptional()
  @IsUUID('4', { message: 'ID tài khoản không hợp lệ' })
  userId?: string | null;
}
