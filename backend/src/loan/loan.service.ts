import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoanStatus } from '@prisma/client';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { CreateLoanDto } from './dto/create-loan.dto';

@Injectable()
export class LoanService {
  constructor(private prisma: PrismaService) {}

  async createLoan(peminjamId: string, barangId: string) {
    // Check if user already has an active loan
    const existingLoan = await this.prisma.loan.findFirst({
      where: {
        peminjamId,
        status: {
          in: [LoanStatus.DIPINJAM, 'PENDING'],
        },
      },
    });

    if (existingLoan) {
      throw new BadRequestException('Anda sudah memiliki peminjaman aktif');
    }

    const barang = await this.prisma.barang.findUnique({
      where: { id: barangId },
    });

    if (!barang || barang.stok <= 0) {
      throw new BadRequestException('Stok barang tidak tersedia');
    }

    // Create loan with PENDING status (requires admin verification)
    return this.prisma.$transaction([
      this.prisma.loan.create({
        data: {
          peminjamId,
          barangId,
          status: 'PENDING' as LoanStatus,
        },
      }),
    ]);
  }

  async verifyLoan(loanId: string, adminId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.status !== 'PENDING') {
      throw new BadRequestException('Pengajuan tidak valid');
    }

    const barang = await this.prisma.barang.findUnique({
      where: { id: loan.barangId },
    });

    if (!barang || barang.stok <= 0) {
      throw new BadRequestException('Stok barang tidak tersedia');
    }

    return this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.DIPINJAM,
          adminId,
          tanggalPinjam: new Date(),
        },
      }),
      this.prisma.barang.update({
        where: { id: loan.barangId },
        data: { stok: { decrement: 1 } },
      }),
    ]);
  }

  async returnLoan(loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.status !== LoanStatus.DIPINJAM) {
      throw new BadRequestException('Loan tidak valid');
    }

    return this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id: loanId },
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

  async rejectLoan(loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.status !== 'PENDING') {
      throw new BadRequestException('Pengajuan tidak valid');
    }

    return this.prisma.loan.update({
      where: { id: loanId },
      data: { status: LoanStatus.DIKEMBALIKAN },
    });
  }

  async checkOverdueLoans() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Mark loans as TERLAMBAT if not returned within 24 hours
    await this.prisma.loan.updateMany({
      where: {
        status: LoanStatus.DIPINJAM,
        tanggalPinjam: {
          lt: twentyFourHoursAgo,
        },
      },
      data: {
        status: LoanStatus.TERLAMBAT,
      },
    });
  }

  async getOverdueLoans() {
    await this.checkOverdueLoans();

    return this.prisma.loan.findMany({
      where: {
        status: LoanStatus.TERLAMBAT,
      },
      include: {
        barang: true,
        peminjam: true,
      },
    });
  }

  async findAll() {
    await this.checkOverdueLoans();

    return this.prisma.loan.findMany({
      include: {
        barang: true,
        peminjam: {
          select: {
            id: true,
            nama: true,
            nip: true,
            nisn: true,
          },
        },
        admin: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLoansByUser(userId: string) {
    await this.checkOverdueLoans();

    return this.prisma.loan.findMany({
      where: { peminjamId: userId },
      include: {
        barang: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingLoans() {
    return this.prisma.loan.findMany({
      where: { status: 'PENDING' },
      include: {
        barang: true,
        peminjam: {
          select: {
            id: true,
            nama: true,
            nip: true,
            nisn: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getActiveLoans() {
    await this.checkOverdueLoans();

    return this.prisma.loan.findMany({
      where: {
        status: {
          in: [LoanStatus.DIPINJAM, LoanStatus.TERLAMBAT],
        },
      },
      include: {
        barang: true,
        peminjam: {
          select: {
            id: true,
            nama: true,
            nip: true,
            nisn: true,
          },
        },
      },
      orderBy: { tanggalPinjam: 'asc' },
    });
  }
}
