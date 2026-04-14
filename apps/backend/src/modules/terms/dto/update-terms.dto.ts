import { IsString, IsOptional, IsBoolean, IsIn, IsDateString } from 'class-validator';

export class UpdateTermsDto {
  @IsOptional()
  @IsString()
  @IsIn(['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'OTHER'], {
    message: 'Loại điều khoản không hợp lệ. Cho phép: TERMS_OF_SERVICE, PRIVACY_POLICY, OTHER',
  })
  type?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày hiệu lực không hợp lệ.' })
  effectiveDate?: string;
}
