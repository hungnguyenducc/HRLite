import { IsString, IsNotEmpty, IsOptional, IsInt, IsPositive, MaxLength, Matches } from 'class-validator';

export class CreateLeaveTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã loại nghỉ không được trống' })
  @MaxLength(20, { message: 'Mã loại nghỉ tối đa 20 ký tự' })
  @Matches(/^[A-Z_]+$/, {
    message: 'Mã loại nghỉ chỉ chứa chữ hoa và dấu gạch dưới',
  })
  lvTypeCd: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên loại nghỉ không được trống' })
  @MaxLength(50, { message: 'Tên loại nghỉ tối đa 50 ký tự' })
  lvTypeNm: string;

  @IsOptional()
  @IsInt({ message: 'Số ngày phải là số nguyên' })
  @IsPositive({ message: 'Số ngày phải lớn hơn 0' })
  maxDays?: number | null;
}

export class UpdateLeaveTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lvTypeNm?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxDays?: number | null;

  @IsOptional()
  @IsString()
  useYn?: string;
}
