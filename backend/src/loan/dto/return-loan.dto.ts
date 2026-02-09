import { IsUUID, IsOptional, IsString, IsEnum } from 'class-validator';

/**
 * Enum kondisi pengembalian barang
 * - NORMAL: Barang kembali dan layak pakai
 * - RUSAK: Barang kembali tapi tidak layak
 * - HILANG: Barang tidak dikembalikan
 */
export enum ReturnCondition {
  NORMAL = 'NORMAL',
  RUSAK = 'RUSAK',
  HILANG = 'HILANG',
}

export class ReturnLoanDto {
  @IsUUID()
  loanId: string;

  /**
   * Kondisi barang saat dikembalikan
   * Wajib diisi oleh admin
   */
  @IsEnum(ReturnCondition, {
    message: 'kondisi harus salah satu dari: NORMAL, RUSAK, HILANG',
  })
  condition: ReturnCondition;

  @IsOptional()
  @IsString()
  reason?: string;
}
