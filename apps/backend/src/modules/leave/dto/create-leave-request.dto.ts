import { IsUUID, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsOptional()
  @IsUUID()
  emplId?: string;

  @IsString()
  lvTypeCd: string;

  @IsDateString()
  startDt: string;

  @IsDateString()
  endDt: string;

  @IsString()
  @MaxLength(500)
  rsn: string;
}
