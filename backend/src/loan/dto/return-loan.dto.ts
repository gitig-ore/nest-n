import { IsUUID } from 'class-validator';

export class ReturnLoanDto {
  @IsUUID()
  loanId: string;
}
