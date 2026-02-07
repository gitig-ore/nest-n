import { IsUUID, IsOptional, IsString } from 'class-validator';

export class ReturnLoanDto {
  @IsUUID()
  loanId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
