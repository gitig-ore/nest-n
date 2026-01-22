import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateBarangDto {
  @IsString()
  @IsNotEmpty()
  kodeBarang: string;

  @IsString()
  @IsNotEmpty()
  namaBarang: string;

  @IsString()
  kondisi: string;

  @IsInt()
  @Min(0)
  stok: number;
}
