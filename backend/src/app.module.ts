import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
// LoanController is provided by LoanModule
import { BarangModule } from './barang/barang.module';
import { UsersModule } from './users/users.module';
import { LoanModule } from './loan/loan.module';


@Module({
  imports: [PrismaModule, AuthModule, BarangModule, UsersModule, LoanModule, ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
