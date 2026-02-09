import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
} from '@nestjs/common';
import { LoanService } from './loan.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { RequestReturnDto } from './dto/request-return.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Role } from '../auth/decorators/role.decorator';

@Controller('loan')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  // ===============================
  // PEMINJAM: AJUKAN PEMINJAMAN
  // ===============================
  // Domain Rules Enforced:
  // - Backend validation for active loan (1 peminjaman aktif)
  // - Backend validation for late loan (tidak boleh ajukan baru)
  @UseGuards(JwtGuard, RoleGuard)
  @Role('PEMINJAM')
  @Post()
  create(@Req() req, @Body() dto: CreateLoanDto) {
    return this.loanService.createLoan(req.user.id, dto.barangId);
  }

  // ===============================
  // ADMIN: VERIFIKASI PEMINJAMAN
  // ===============================
  // Domain Rules:
  // - tanggalPinjam = now (tidak user input)
  // - tanggalJatuhTempo = now + 24 jam (tidak user input)
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Post('verify/:id')
  verify(@Param('id') id: string, @Req() req) {
    return this.loanService.verifyLoan(id, req.user.id);
  }

  // ===============================
  // ADMIN: BARANG TELAH DIAMBIL (DISETUJUI -> DIPINJAM)
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Post('borrow/:id')
  markAsBorrowed(@Param('id') id: string, @Req() req) {
    return this.loanService.markAsBorrowed(id, req.user.id);
  }

  // ===============================
  // ADMIN: TOLAK PEMINJAMAN
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Post('reject/:id')
  reject(@Param('id') id: string, @Req() req) {
    return this.loanService.rejectLoan(id, req.user.id);
  }

  // ===============================
  // ADMIN: KEMBALIKAN BARANG (CONFIRM)
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Post('return')
  return(@Body() dto: ReturnLoanDto, @Req() req) {
    return this.loanService.returnLoan(dto.loanId, req.user.id, dto.condition, dto.reason);
  }

  // ===============================
  // PEMINJAM: AJUKAN PENGEMBALIAN
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('PEMINJAM')
  @Post('request-return')
  requestReturn(@Body() dto: RequestReturnDto, @Req() req) {
    return this.loanService.requestReturn(dto.loanId, req.user.id, dto.note);
  }

  // ===============================
  // ADMIN: LIHAT PEMINJAMAN TERLAMBAT
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Get('overdue')
  getOverdue() {
    return this.loanService.getOverdueLoans();
  }

  // ===============================
  // ADMIN: LIHAT PEMINJAMAN PENDING
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Get('pending')
  getPending() {
    return this.loanService.getPendingLoans();
  }

  // ===============================
  // ADMIN: LIHAT PEMINJAMAN AKTIF
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Get('active')
  getActive() {
    return this.loanService.getActiveLoans();
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
    return this.loanService.findAll();
  }
}
