import { IsOptional, IsUUID } from 'class-validator';

export class LinkUserDto {
  @IsOptional()
  @IsUUID('4', { message: 'ID tài khoản không hợp lệ' })
  userId: string | null;
}
