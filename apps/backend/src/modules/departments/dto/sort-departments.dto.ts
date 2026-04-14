import { Type } from 'class-transformer';
import { IsArray, ArrayMinSize, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';

class SortItem {
  @IsUUID('4', { message: 'ID phòng ban không hợp lệ' })
  id: string;

  @IsInt()
  @Min(0)
  sortOrd: number;
}

export class SortDepartmentsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Danh sách sắp xếp không được trống' })
  @ValidateNested({ each: true })
  @Type(() => SortItem)
  items: SortItem[];
}
