import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AgreeTermsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất một điều khoản' })
  @IsUUID('4', { each: true, message: 'ID điều khoản không hợp lệ' })
  termsIds: string[];
}
