import { Injectable, UnauthorizedException, ConflictException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    // Find user by nisn, nip, or nama (allow admin login via nama)
    let user;
    try {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [{ nisn: identifier }, { nip: identifier }, { nama: identifier }],
        },
      });
    } catch (err: any) {
      throw new ServiceUnavailableException('Cannot connect to database. Ensure Postgres is running and DATABASE_URL is correct.');
    }

    if (!user) {
      throw new UnauthorizedException('Identifier atau password salah');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifier atau password salah');
    }

    // Use identifier (nisn or nip) as compatibility field
    const userIdentifier = user.nisn || user.nip || '';

    // Generate tokens
    const tokens = this.generateTokens(user.id, userIdentifier);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        nama: user.nama,
        email: userIdentifier,
        role: user.role,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      });

      let user;
      try {
        user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      } catch (err: any) {
        throw new ServiceUnavailableException('Cannot connect to database. Ensure Postgres is running and DATABASE_URL is correct.');
      }

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newTokens = this.generateTokens(user.id, user.nisn || user.nip || '');

      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nama: true,
          nisn: true,
          nip: true,
          role: true,
          createdAt: true,
        },
      });
    } catch (err: any) {
      throw new ServiceUnavailableException('Cannot connect to database. Ensure Postgres is running and DATABASE_URL is correct.');
    }

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    // Map to keep compatibility with frontend expecting `email`
    return {
      id: user.id,
      nama: user.nama,
      email: user.nisn || user.nip || null,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private generateTokens(userId: string, identifier: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, identifier },
      {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, identifier },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }
}
