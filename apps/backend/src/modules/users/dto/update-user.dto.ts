import { IsOptional, IsString, IsUrl, IsIn } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  displayName?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsUrl({}, { message: 'URL ảnh không hợp lệ' })
  photoUrl?: string | null;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsIn(['ADMIN', 'USER'], { message: 'Vai trò không hợp lệ.' })
  role?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'], { message: 'Trạng thái không hợp lệ.' })
  status?: string;
}
