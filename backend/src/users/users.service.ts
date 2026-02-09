import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '@prisma/client';


@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,

  ) {}

  // ===============================
  // ADMIN: CREATE USER
  // ===============================
  async create(dto: CreateUserDto) {
    // Check if nip or nisn already exists
    if (dto.nip) {
      const existing = await this.prisma.user.findUnique({
        where: { nip: dto.nip },
      });
      if (existing) {
        throw new ForbiddenException('NIP sudah terdaftar');
      }
    }
    if (dto.nisn) {
      const existing = await this.prisma.user.findUnique({
        where: { nisn: dto.nisn },
      });
      if (existing) {
        throw new ForbiddenException('NISN sudah terdaftar');
      }
    }

    const user = await this.prisma.user.create({
      data: {
        nama: dto.nama,
        password: dto.password,
        role: dto.role,
        nip: dto.nip || null,
        nisn: dto.nisn || null,
      },
    });

    return {
      id: user.id,
      nama: user.nama,
      email: user.nisn || user.nip || null,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  // ===============================
  // ADMIN: SEMUA USER
  // ===============================
  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        nisn: true,
        nip: true,
        nama: true,
        role: true,
        createdAt: true,
      },
    });

    return users.map(u => ({
      id: u.id,
      email: u.nisn || u.nip || null,
      nama: u.nama,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  // ===============================
  // ADMIN: DETAIL USER
  // ===============================
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return {
      id: user.id,
      nama: user.nama,
      email: user.nisn || user.nip || null,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ===============================
  // USER: PROFIL SENDIRI
  // ===============================
  async findMe(userId: string) {
    return this.findById(userId);
  }

  // ===============================
  // UPDATE USER
  // ===============================
  async update(
    targetUserId: string,
    requester: { id: string; role: Role; nama?: string },
    dto: UpdateUserDto,
  ) {
    const existing = await this.findById(targetUserId);

    // SISWA hanya boleh update dirinya sendiri
    if (
      requester.role === Role.PEMINJAM &&
      requester.id !== targetUserId
    ) {
      throw new ForbiddenException(
        'Tidak boleh mengubah user lain',
      );
    }

    // SISWA tidak boleh ubah role
    if (
      requester.role === Role.PEMINJAM &&
      dto.role
    ) {
      throw new ForbiddenException(
        'Tidak boleh mengubah role',
      );
    }

    const result = await this.prisma.user.update({
      where: { id: targetUserId },
      data: dto as any,
    });

    
    return result;
  }

  // ===============================
  // ADMIN: HAPUS USER
  // ===============================
  async remove(id: string, adminName?: string) {
    const existing = await this.findById(id);

    const result = await this.prisma.user.delete({
      where: { id },
    });

    // Audit log
  
    return result;
  }
}
