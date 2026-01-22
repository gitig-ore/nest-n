import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { LoanService } from './loan.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Role } from '../auth/decorators/role.decorator';

@Controller('loan')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  // ===============================
  // PEMINJAM: AJUKAN PEMINJAMAN
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('PEMINJAM')
  @Post()
  create(@Req() req, @Body() dto: CreateLoanDto) {
    return this.loanService.createLoan(
      req.user.id,
      dto.barangId,
    );
  }

  // ===============================
  // ADMIN: KEMBALIKAN BARANG
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Post('return')
  return(@Body() dto: ReturnLoanDto) {
    return this.loanService.returnLoan(dto.loanId);
  }

  // ===============================
  // PEMINJAM: RIWAYAT SENDIRI
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('PEMINJAM')
  @Get('me')
  myLoans(@Req() req) {
    return this.loanService.getLoansByUser(req.user.id);
  }

  // ===============================
  // ADMIN: LIHAT SEMUA LOAN
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Get()
  findAll() {
    return this.loanService.getAllLoans();
  }
}
