import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger('PrismaService');

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['info', 'warn', 'error'],
    } as any);

    this.logger.log(`Connecting to database: ${databaseUrl.substring(0, 50)}...`);
  }

  async onModuleInit() {
    this.logger.log('Connecting to Prisma...');
    try {
      await this.$connect();
      this.logger.log('Prisma connected successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to Prisma: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting Prisma...');
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
