import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LoanController } from './loan/loan.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController, LoanController],
  providers: [AppService],
})
export class AppModule {}
