import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
// LoanController is provided by LoanModule
import { BarangModule } from './barang/barang.module';
import { UsersModule } from './users/users.module';
import { LoanModule } from './loan/loan.module';
import { MessageModule } from './message/message.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';


@Module({
  imports: [PrismaModule, AuthModule, BarangModule, UsersModule, LoanModule, MessageModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
