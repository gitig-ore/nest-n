import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoanStatus } from '@prisma/client';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { CreateLoanDto } from './dto/create-loan.dto';

@Injectable()
export class LoanService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLoanDto) {
    const barang = await this.prisma.barang.findUnique({
      where: { id: dto.barangId },
    });

    if (!barang || barang.stok <= 0) {
      throw new BadRequestException('Stok barang tidak tersedia');
    }

    return this.prisma.$transaction([
      this.prisma.loan.create({
        data: {
          peminjamId: dto.peminjamId,
          adminId: dto.adminId,
          barangId: dto.barangId,
          status: LoanStatus.DIPINJAM,
        },
      }),
      this.prisma.barang.update({
        where: { id: dto.barangId },
        data: { stok: { decrement: 1 } },
      }),
    ]);
  }

  async return(dto: ReturnLoanDto) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: dto.loanId },
    });

    if (!loan || loan.status !== LoanStatus.DIPINJAM) {
      throw new BadRequestException('Loan tidak valid');
    }

    return this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id: dto.loanId },
        data: {
          status: LoanStatus.DIKEMBALIKAN,
          tanggalKembali: new Date(),
        },
      }),
      this.prisma.barang.update({
        where: { id: loan.barangId },
        data: { stok: { increment: 1 } },
      }),
    ]);
  }

  async findAll() {
    return this.prisma.loan.findMany({
      include: {
        barang: true,
        peminjam: true,
        admin: true,
      },
    });
  }

  createLoan(peminjamId: string, barangId: string) {
    // Implement loan creation logic
    return { success: true, message: 'Loan created' };
  }

  returnLoan(loanId: string) {
    // Implement return loan logic
    return { success: true, message: 'Loan returned' };
  }

  getLoansByUser(userId: string) {
    // Implement get user loans logic
    return [];
  }

  getAllLoans() {
    // Implement get all loans logic
    return [];
  }
}
