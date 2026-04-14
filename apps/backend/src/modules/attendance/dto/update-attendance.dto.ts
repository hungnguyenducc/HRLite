import { IsOptional, IsDateString, IsString, IsIn, MaxLength } from 'class-validator';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsDateString()
  chkInTm?: string;

  @IsOptional()
  @IsDateString()
  chkOutTm?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'HOLIDAY'])
  atndSttsCd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rmk?: string;
}
