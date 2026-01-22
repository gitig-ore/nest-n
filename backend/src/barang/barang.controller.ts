import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BarangService } from './barang.service';
import { CreateBarangDto } from './dto/create-barang.dto';
import { UpdateBarangDto } from './dto/update-barang.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Role } from '../auth/decorators/role.decorator';

@Controller('barang')
export class BarangController {
  constructor(private readonly barangService: BarangService) {}

  // ===============================
  // ADMIN: TAMBAH BARANG
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Post()
  create(@Body() dto: CreateBarangDto) {
    return this.barangService.create(dto);
  }

  // ===============================
  // SEMUA ROLE: LIST BARANG
  // ===============================
  @UseGuards(JwtGuard)
  @Get()
  findAll() {
    return this.barangService.findAll();
  }

  // ===============================
  // SEMUA ROLE: DETAIL BARANG
  // ===============================
  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.barangService.findOne(id);
  }

  // ===============================
  // ADMIN: UPDATE BARANG
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBarangDto,
  ) {
    return this.barangService.update(id, dto);
  }

  // ===============================
  // ADMIN: HAPUS BARANG
  // ===============================
  @UseGuards(JwtGuard, RoleGuard)
  @Role('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.barangService.remove(id);
  }
}
