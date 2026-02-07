import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarangDto } from './dto/create-barang.dto';
import { UpdateBarangDto } from './dto/update-barang.dto';


@Injectable()
export class BarangService {
  constructor(
    private prisma: PrismaService,

  ) {}

  // ===============================
  // ADMIN: TAMBAH BARANG
  // ===============================
  async create(dto: CreateBarangDto, adminName?: string) {
    const result = await this.prisma.barang.create({
      data: dto as any,
    });

   

    return result;
  }

  // ===============================
  // SEMUA ROLE: LIHAT BARANG
  // ===============================
  async findAll() {
    return this.prisma.barang.findMany({
      orderBy: { namaBarang: 'asc' },
    });
  }

  // ===============================
  // SEMUA ROLE: DETAIL BARANG
  // ===============================
  async findOne(id: string) {
    const barang = await this.prisma.barang.findUnique({
      where: { id },
    });

    if (!barang) {
      throw new NotFoundException('Barang tidak ditemukan');
    }

    return barang;
  }

  // ===============================
  // ADMIN: UPDATE BARANG
  // ===============================
  async update(id: string, dto: UpdateBarangDto, adminName?: string) {
    const existing = await this.findOne(id);

    const result = await this.prisma.barang.update({
      where: { id },
      data: dto as any,
    });

    

    return result;
  }

  // ===============================
  // ADMIN: HAPUS BARANG
  // ===============================
  async remove(id: string, adminName?: string) {
    const existing = await this.findOne(id);

    const result = await this.prisma.barang.delete({
      where: { id },
    });

   

    return result;
  }
}
