import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBarangDto {
  @IsOptional()
  @IsString()
  namaBarang?: string;

  @IsOptional()
  @IsString()
  kondisi?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stok?: number;
}
