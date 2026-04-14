import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'ID Token không được để trống' })
  idToken: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'ID điều khoản không hợp lệ' })
  agreedTermsIds?: string[];
}
