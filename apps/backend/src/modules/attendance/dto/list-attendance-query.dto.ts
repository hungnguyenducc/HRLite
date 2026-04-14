import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListAttendanceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  emplId?: string;

  @IsOptional()
  @IsString()
  deptId?: string;

  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
