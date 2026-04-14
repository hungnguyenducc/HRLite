import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty({ message: 'ID Token không được để trống' })
  idToken: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsArray()
  @IsUUID('4', { each: true, message: 'ID điều khoản không hợp lệ' })
  agreedTermsIds: string[];
}
