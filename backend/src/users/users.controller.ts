import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Role } from '../auth/decorators/role.decorator';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ===============================
  // ADMIN: SEMUA USER
  // ===============================
  @UseGuards(RoleGuard)
  @Role('ADMIN')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // ===============================
  // ADMIN: DETAIL USER
  // ===============================
  @UseGuards(RoleGuard)
  @Role('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // ===============================
  // USER: PROFIL SENDIRI
  // ===============================
  @Get('me/profile')
  getProfile(@Req() req) {
    return this.usersService.findMe(req.user.id);
  }

  // ===============================
  // UPDATE USER
  // ===============================
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req,
  ) {
    return this.usersService.update(
      id,
      { ...req.user, nama: req.user?.nama },
      dto,
    );
  }

  // ===============================
  // ADMIN: HAPUS USER
  // ===============================
  @UseGuards(RoleGuard)
  @Role('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.usersService.remove(id, req.user?.nama);
  }
}
