import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ===============================
  // ADMIN: SEMUA USER
  // ===============================
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nama: true,
        role: true,
        createdAt: true,
      },
    });
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

    return user;
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
    requester: { id: string; role: Role },
    dto: UpdateUserDto,
  ) {
    const user = await this.findById(targetUserId);

    // PEMINJAM hanya boleh update dirinya sendiri
    if (
      requester.role === Role.PEMINJAM &&
      requester.id !== targetUserId
    ) {
      throw new ForbiddenException(
        'Tidak boleh mengubah user lain',
      );
    }

    // PEMINJAM tidak boleh ubah role
    if (
      requester.role === Role.PEMINJAM &&
      dto.role
    ) {
      throw new ForbiddenException(
        'Tidak boleh mengubah role',
      );
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: dto as any,
    });
  }

  // ===============================
  // ADMIN: HAPUS USER
  // ===============================
  async remove(id: string) {
    await this.findById(id);

    return this.prisma.user.delete({
      where: { id },
    });
  }
}
