import { IsUUID, IsOptional, IsString } from 'class-validator';

export class RequestReturnDto {
  @IsUUID()
  loanId: string;

  @IsOptional()
  @IsString()
  note?: string;
}
