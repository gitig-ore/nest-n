import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoanStatus, ReturnCondition } from '@prisma/client';

// ===============================================================
// DOMAIN RULES ENFORCEMENT (WAJIB, TIDAK BOLEH DILANGGAR)
// ===============================================================
// 1. Setiap PEMINJAM hanya boleh memiliki 1 peminjaman aktif
// 2. Peminjaman aktif = status: PENDING | DISETUJUI | DIPINJAM | PENGEMBALIAN
// 3. Durasi peminjaman FIXED 24 JAM
// 4. tanggalJatuhTempo = tanggalPinjam + 24 jam (tidak boleh diinput user)
// 5. Status TERLAMBAT TIDAK disimpan di database (harus dihitung runtime)
// 6. Jika terlambat: alert di dashboard + TIDAK boleh ajukan baru
// 7. Pengembalian hanya untuk loan dengan status DIPINJAM
// 8. Peminjam mengajukan pengembalian → status PENGEMBALIAN
// 9. Admin konfirmasi pengembalian → status DIKEMBALIKAN
// 10. Admin wajib memilih kondisi (NORMAL, RUSAK, HILANG)
// 11. NORMAL → stok bertambah, RUSAK/HILANG → stok tidak berubah
// ==========================================================================================

@Injectable()
export class LoanService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if peminjam has any active loan (PENDING, DISETUJUI, or DIPINJAM)
   * Domain Rule #1: Setiap PEMINJAM hanya boleh memiliki 1 peminjaman aktif
   * Active loan means: status is one of PENDING/DISETUJUI/DIPINJAM AND tanggalDikembalikan is null
   */
  async hasActiveLoan(peminjamId: string): Promise<boolean> {
    const activeLoan = await this.prisma.loan.findFirst({
      where: {
        peminjamId,
        status: {
          in: [LoanStatus.PENDING, LoanStatus.DISETUJUI, LoanStatus.DIPINJAM],
        },
        tanggalDikembalikan: null, // Not yet returned
      },
    });
    return !!activeLoan;
  }

  /**
   * Check if peminjam has late loan (calculated at runtime)
   * Domain Rule #5: TERLAMBAT harus dihitung secara runtime (tidak disimpan di DB)
   * Late if: now > tanggalJatuhTempo AND tanggalDikembalikan == null
   */
  async hasLateLoan(peminjamId: string): Promise<boolean> {
    const now = new Date();
    const lateLoan = await this.prisma.loan.findFirst({
      where: {
        peminjamId,
        tanggalJatuhTempo: { lt: now }, // Jatuh tempo passed
        tanggalDikembalikan: null, // Not yet returned
      },
    });
    return !!lateLoan;
  }

  /**
   * Get late loan details for display (returns null if not late)
   */
  async getLateLoanDetails(peminjamId: string) {
    const now = new Date();
    const lateLoan = await this.prisma.loan.findFirst({
      where: {
        peminjamId,
        tanggalJatuhTempo: { lt: now },
        tanggalDikembalikan: null,
      },
      include: {
        barang: true,
      },
    });
    return lateLoan;
  }

  /**
   * PEMINJAM: Ajukan peminjaman barang
   * Domain Rules Enforced:
   * 1. Peminjam hanya boleh memiliki 1 peminjaman aktif
   * 2. Jika terlambat, tidak boleh mengajukan baru (Domain Rule #6)
   * 3. tanggalJatuhTempo dihitung otomatis = tanggalPinjam + 24 jam (Domain Rule #3, #4)
   */
  async createLoan(peminjamId: string, barangId: string) {
    // ============================================================
    // BACKEND VALIDATION - WAJIB, TIDAK BOLEH CUKUP UI ONLY
    // ============================================================

    // VALIDASI 1: Check if user already has active loan
    // Domain Rule #1: Setiap PEMINJAM hanya boleh memiliki 1 peminjaman aktif
    const hasActive = await this.hasActiveLoan(peminjamId);
    if (hasActive) {
      throw new BadRequestException({
        code: 'ACTIVE_LOAN_EXISTS',
        message: 'Anda sudah memiliki peminjaman aktif. Silakan kembalikan barang terlebih dahulu sebelum mengajukan pinjaman baru.',
        domainRule: 'Setiap PEMINJAM hanya boleh memiliki 1 peminjaman aktif',
      });
    }

    // VALIDASI 2: Check if user has late loan
    // Check barang availability
    const barang = await this.prisma.barang.findUnique({
      where: { id: barangId },
    });

    if (!barang || barang.stok <= 0) {
      throw new BadRequestException({
        code: 'OUT_OF_STOCK',
        message: 'Stok barang tidak tersedia',
      });
    }

    // Create loan with PENDING status
    // tanggalPinjam and tanggalJatuhTempo will be set when admin verifies
    // Domain Rule #4: tanggalJatuhTempo TIDAK boleh diinput user
    const loan = await this.prisma.loan.create({
      data: {
        peminjamId,
        barangId,
        status: LoanStatus.PENDING,
      },
    });

    return {
      success: true,
      code: 'LOAN_REQUEST_SUBMITTED',
      message: 'Pengajuan peminjaman berhasil dikirim dan menunggu persetujuan admin.',
      data: {
        loanId: loan.id,
        status: loan.status,
        submittedAt: loan.createdAt,
      },
    };
  }

  /**
   * ADMIN/PETUGAS: Verifikasi dan setujui peminjaman
   * Domain Rules Enforced:
   * - Set tanggalPinjam = now (tidak boleh user input)
   * - Set tanggalJatuhTempo = tanggalPinjam + 24 jam (tidak boleh user input)
   * - Decrement stok barang
   * Domain Rule #3: Durasi peminjaman FIXED 24 JAM
   * Domain Rule #4: tanggalJatuhTempo = tanggalPinjam + 24 jam (tidak boleh diinput user)
   */
  async verifyLoan(loanId: string, adminId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { barang: true },
    });

    if (!loan || loan.status !== LoanStatus.PENDING) {
      throw new BadRequestException({
        code: 'INVALID_LOAN_STATUS',
        message: 'Pengajuan tidak valid atau sudah diproses',
      });
    }

    const barang = await this.prisma.barang.findUnique({
      where: { id: loan.barangId },
    });

    if (!barang || barang.stok <= 0) {
      throw new BadRequestException({
        code: 'OUT_OF_STOCK',
        message: 'Stok barang tidak tersedia',
      });
    }

    // ============================================================
    // Domain Rule #4: tanggalJatuhTempo dihitung otomatis
    // NOT ALLOWED: User input untuk tanggalJatuhTempo
    // ============================================================
    const now = new Date();
    const tanggalJatuhTempo = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours

    const result = await this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.DISETUJUI,
          adminId,
          tanggalPinjam: now,
          tanggalJatuhTempo: tanggalJatuhTempo,
        },
      }),
      this.prisma.barang.update({
        where: { id: loan.barangId },
        data: { stok: { decrement: 1 } },
      }),
    ]);

    return {
      success: true,
      code: 'LOAN_APPROVED',
      message: 'Peminjaman berhasil disetujui',
      data: {
        loanId: loanId,
        status: LoanStatus.DISETUJUI,
        tanggalPinjam: now,
        tanggalJatuhTempo: tanggalJatuhTempo,
        durasiJam: 24,
        note: 'Barang harus dikembalikan dalam 24 jam',
      },
    };
  }

  /**
   * ADMIN/PETUGAS: Barang sudah diambil oleh peminjam
   * Status berubah dari DISETUJUI -> DIPINJAM
   */
  async markAsBorrowed(loanId: string, adminId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.status !== LoanStatus.DISETUJUI) {
      throw new BadRequestException('Peminjaman tidak dalam status DISETUJUI');
    }

    const updatedLoan = await this.prisma.loan.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.DIPINJAM,
        adminId,
      },
    });

    return {
      message: 'Barang telah diambil',
      loan: {
        id: updatedLoan.id,
        status: updatedLoan.status,
        tanggalPinjam: updatedLoan.tanggalPinjam,
        tanggalJatuhTempo: updatedLoan.tanggalJatuhTempo,
      },
    };
  }

  /**
   * PEMINJAM: Ajukan pengembalian barang
   * Domain Rules:
   * - Hanya bisa untuk loan dengan status DIPINJAM
   * - Status berubah menjadi PENGEMBALIAN
   * - Admin akan melakukan konfirmasi
   */
  async requestReturn(loanId: string, peminjamId: string, note?: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new BadRequestException({
        code: 'LOAN_NOT_FOUND',
        message: 'Peminjaman tidak ditemukan',
      });
    }

    if (loan.peminjamId !== peminjamId) {
      throw new BadRequestException({
        code: 'FORBIDDEN',
        message: 'Anda tidak berhak mengakses peminjaman ini',
      });
    }

    if (loan.status !== LoanStatus.DIPINJAM) {
      throw new BadRequestException({
        code: 'INVALID_LOAN_STATUS',
        message: `Pengembalian hanya bisa diajukan untuk peminjaman dengan status DIPINJAM. Status saat ini: ${loan.status}`,
      });
    }

    const updatedLoan = await this.prisma.loan.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.PENGEMBALIAN,
        returnReason: note || 'Pengembalian diajukan oleh peminjam',
      },
    });

    return {
      success: true,
      code: 'RETURN_REQUESTED',
      message: 'Pengembalian berhasil diajukan. Menunggu konfirmasi admin.',
      data: {
        loanId: loanId,
        status: LoanStatus.PENGEMBALIAN,
        submittedAt: new Date(),
      },
    };
  }

  /**
   * ADMIN/PETUGAS: Konfirmasi pengembalian barang
   * Domain Rules:
   * - Pengembalian hanya untuk loan dengan status DIPINJAM atau PENGEMBALIAN
   * - Admin wajib memilih kondisi (NORMAL, RUSAK, HILANG)
   * - NORMAL → stok bertambah
   * - RUSAK → stok tidak bertambah, simpan catatan
   * - HILANG → stok tidak bertambah, tandai kehilangan
   * - Jika melewati batas waktu → status TERLAMBAT
   */
  async returnLoan(loanId: string, adminId: string, condition: ReturnCondition, reason?: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { barang: true },
    });

    if (!loan) {
      throw new BadRequestException({
        code: 'LOAN_NOT_FOUND',
        message: 'Peminjaman tidak ditemukan',
      });
    }

    // Accept both DIPINJAM (direct return) and PENGEMBALIAN (after peminjam request)
    if (loan.status !== LoanStatus.DIPINJAM && loan.status !== LoanStatus.PENGEMBALIAN) {
      throw new BadRequestException({
        code: 'INVALID_LOAN_STATUS',
        message: `Pengembalian hanya bisa diproses untuk peminjaman dengan status DIPINJAM atau PENGEMBALIAN. Status saat ini: ${loan.status}`,
      });
    }

    if (loan.tanggalDikembalikan !== null) {
      throw new BadRequestException({
        code: 'ALREADY_RETURNED',
        message: 'Peminjaman ini sudah dikembalikan sebelumnya',
      });
    }

    // Calculate if late
    const now = new Date();
    const isLate = loan.tanggalJatuhTempo ? now > loan.tanggalJatuhTempo : false;

    // Build update data
    const updateData: any = {
      status: LoanStatus.DIKEMBALIKAN,
      tanggalDikembalikan: now,
      returnReason: reason || loan.returnReason || null,
      returnCondition: condition,
      adminId: adminId,
    };

    // Transaction: Update loan + optionally update stock
    const stockUpdate = condition === ReturnCondition.NORMAL 
      ? this.prisma.barang.update({
          where: { id: loan.barangId },
          data: { stok: { increment: 1 } },
        })
      : null;

    const result = await this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id: loanId },
        data: updateData,
      }),
      ...(stockUpdate ? [stockUpdate] : []),
    ]);

    // Build response message based on condition
    let message = 'Pengembalian berhasil dikonfirmasi';
    let punishmentType: 'NONE' | 'LATE' | 'DAMAGED' | 'LOST' | 'BOTH' = 'NONE';
    let punishmentMessage = '';

    if (condition === ReturnCondition.RUSAK) {
      message = 'Pengembalian dikonfirmasi dengan kondisi RUSAK. Stok tidak bertambah.';
      punishmentType = 'DAMAGED';
      punishmentMessage = '⚠️ PERINGATAN: Barang dikembalikan dalam kondisi RUSAK. Harap kembalikan barang dalam kondisi yang layak di masa depan.';
    } else if (condition === ReturnCondition.HILANG) {
      message = 'Pengembalian dikonfirmasi. Barang ditandai HILANG. Stok tidak bertambah.';
      punishmentType = 'LOST';
      punishmentMessage = '❌ PERINGATAN: Barang tidak dikembalikan (HILANG). Harap tanggung jawab atas kehilangan ini.';
    }

    if (isLate) {
      const lateHours = Math.ceil((now.getTime() - loan.tanggalJatuhTempo!.getTime()) / (1000 * 60 * 60));
      message += ` (TERLAMBAT: ${lateHours} jam)`;
      
      if (punishmentType === 'NONE') {
        punishmentType = 'LATE';
        punishmentMessage = `🕐 PERINGATAN: Pengembalian TERLAMBAT ${lateHours} jam. Harap kembalikan barang tepat waktu.`;
      } else {
        punishmentType = 'BOTH';
        punishmentMessage = `🕐❌ PERINGATAN GANDA: Pengembalian TERLAMBAT ${lateHours} jam DAN kondisi ${condition}. Harap kembalikan barang tepat waktu dan dalam kondisi layak.`;
      }
    }

    return {
      success: true,
      code: 'RETURN_CONFIRMED',
      message,
      data: {
        loanId: loanId,
        status: LoanStatus.DIKEMBALIKAN,
        condition: condition,
        isLate: isLate,
        lateHours: isLate ? Math.ceil((now.getTime() - loan.tanggalJatuhTempo!.getTime()) / (1000 * 60 * 60)) : null,
        tanggalDikembalikan: now,
        returnReason: reason || null,
        stockUpdated: condition === ReturnCondition.NORMAL,
        punishment: {
          type: punishmentType,
          message: punishmentMessage,
        },
      },
    };
  }

  /**
   * ADMIN/PETUGAS: Tolak pengajuan
   */
  async rejectLoan(loanId: string, adminId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.status !== LoanStatus.PENDING) {
      throw new BadRequestException('Pengajuan tidak valid');
    }

    const updatedLoan = await this.prisma.loan.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.DITOLAK,
        adminId,
      },
    });

    return {
      message: 'Pengajuan ditolak',
      loan: {
        id: updatedLoan.id,
        status: updatedLoan.status,
      },
    };
  }

  /**
   * Check keterlambatan secara runtime (TIDAK disimpan di DB)
   * Returns late status for display purposes
   * Domain Rule #5: TERLAMBAT = now > tanggalJatuhTempo AND tanggalDikembalikan == null
   * PENDING loans tidak bisa terlambat karena tanggalJatuhTempo belum diset
   */
  private checkIsLate(loan: {
    tanggalJatuhTempo: Date | null;
    tanggalDikembalikan: Date | null;
  }): boolean {
    // PENDING loans tidak bisa terlambat - tanggalJatuhTempo belum diset
    if (loan.tanggalJatuhTempo === null) {
      return false;
    }
    const now = new Date();
    return now > loan.tanggalJatuhTempo && loan.tanggalDikembalikan === null;
  }

  /**
   * PEMINJAM: Get loans saya dengan status keterlambatan (runtime)
   * Domain Rule #5: TERLAMBAT harus dihitung runtime (tidak disimpan di DB)
   */
  async getMyLoans(peminjamId: string) {
    const loans = await this.prisma.loan.findMany({
      where: { peminjamId },
      include: {
        barang: true,
        admin: {
          select: { id: true, nama: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ============================================================
    // Domain Rule #5: TERLAMBAT dihitung runtime, TIDAK disimpan di DB
    // Late if: now > tanggalJatuhTempo AND tanggalDikembalikan == null
    // ============================================================
    const loansWithLateStatus = loans.map((loan) => ({
      ...loan,
      // Runtime calculation of late status
      isLate: this.checkIsLate({
        tanggalJatuhTempo: loan.tanggalJatuhTempo,
        tanggalDikembalikan: loan.tanggalDikembalikan,
      }),
    }));

    // Also check if user has active/late loan (for frontend UI)
    const hasActiveLoan = await this.hasActiveLoan(peminjamId);
    const hasLateLoan = await this.hasLateLoan(peminjamId);
    const lateLoanDetails = await this.getLateLoanDetails(peminjamId);

    return {
      success: true,
      hasActiveLoan,
      hasLateLoan,
      lateLoanDetails: lateLoanDetails
        ? (() => {
            const jatuhTempo = lateLoanDetails.tanggalJatuhTempo!;
            return {
              loanId: lateLoanDetails.id,
              barangNama: lateLoanDetails.barang.namaBarang,
              tanggalJatuhTempo: jatuhTempo,
              terlambatJam: Math.floor(
                (new Date().getTime() - new Date(jatuhTempo).getTime()) / (1000 * 60 * 60)
              ),
            };
          })()
        : null,
      loans: loansWithLateStatus,
    };
  }

  // Alias method for controller compatibility
  async getLoansByUser(peminjamId: string) {
    return this.getMyLoans(peminjamId);
  }

  /**
   * ADMIN/PETUGAS: Get all loans dengan late status (runtime)
   */
  async findAll() {
    const loans = await this.prisma.loan.findMany({
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

    // Calculate late status at runtime
    const loansWithLateStatus = loans.map((loan) => ({
      ...loan,
      isLate: this.checkIsLate({
        tanggalJatuhTempo: loan.tanggalJatuhTempo,
        tanggalDikembalikan: loan.tanggalDikembalikan,
      }),
    }));

    return loansWithLateStatus;
  }

  /**
   * ADMIN/PETUGAS: Get pending loans
   */
  async getPendingLoans() {
    return this.prisma.loan.findMany({
      where: { status: LoanStatus.PENDING },
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

  /**
   * ADMIN/PETUGAS: Get active loans (DISETUJUI + DIPINJAM)
   */
  async getActiveLoans() {
    const loans = await this.prisma.loan.findMany({
      where: {
        status: {
          in: [LoanStatus.DISETUJUI, LoanStatus.DIPINJAM],
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

    // Calculate late status at runtime
    return loans.map((loan) => ({
      ...loan,
      isLate: this.checkIsLate({
        tanggalJatuhTempo: loan.tanggalJatuhTempo,
        tanggalDikembalikan: loan.tanggalDikembalikan,
      }),
    }));
  }

  /**
   * ADMIN/PETUGAS: Get late loans (runtime calculation)
   * Domain Rule #5: TERLAMBAT dihitung runtime
   */
  async getLateLoans() {
    const loans = await this.prisma.loan.findMany({
      where: {
        status: LoanStatus.DIPINJAM, // Only DIPINJAM can be late
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
    });

    // Filter late loans at runtime
    // Domain Rule #5: Late if now > tanggalJatuhTempo AND tanggalDikembalikan == null
    return loans.filter((loan) =>
      this.checkIsLate({
        tanggalJatuhTempo: loan.tanggalJatuhTempo,
        tanggalDikembalikan: loan.tanggalDikembalikan,
      })
    );
  }

  // Alias for consistency
  async getOverdueLoans() {
    return this.getLateLoans();
  }
}




