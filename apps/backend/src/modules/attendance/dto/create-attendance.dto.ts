import { IsUUID, IsDateString, IsOptional, IsString, IsIn, MaxLength } from 'class-validator';

export class CreateAttendanceDto {
  @IsUUID()
  emplId: string;

  @IsDateString()
  atndDt: string;

  @IsOptional()
  @IsDateString()
  chkInTm?: string;

  @IsOptional()
  @IsDateString()
  chkOutTm?: string;

  @IsString()
  @IsIn(['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'HOLIDAY'])
  atndSttsCd: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rmk?: string;
}
