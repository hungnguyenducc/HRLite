import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
  Matches,
  IsIn,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã phòng ban không được trống' })
  @MaxLength(20, { message: 'Mã phòng ban tối đa 20 ký tự' })
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Mã phòng ban chỉ chứa chữ hoa, số và dấu gạch ngang',
  })
  deptCd: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên phòng ban không được trống' })
  @MaxLength(100, { message: 'Tên phòng ban tối đa 100 ký tự' })
  deptNm: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID phòng ban cha không hợp lệ' })
  upperDeptId?: string | null;

  @IsOptional()
  @IsUUID('4', { message: 'ID trưởng phòng không hợp lệ' })
  deptHeadId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Thứ tự phải >= 0' })
  sortOrd?: number | null;

  @IsOptional()
  @IsIn(['Y', 'N'])
  useYn?: string = 'Y';
}
