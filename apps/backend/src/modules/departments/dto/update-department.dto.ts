import { IsString, IsOptional, IsUUID, IsInt, Min, MaxLength, IsIn } from 'class-validator';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tên phòng ban tối đa 100 ký tự' })
  deptNm?: string;

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
  useYn?: string;
}
