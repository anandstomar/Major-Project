import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const dbUrl = configService.get<string>('DATABASE_URL');

    if (!dbUrl) {
      throw new Error('❌ DATABASE_URL is missing from .env');
    }

    // 1. Initialize the native database driver (pg)
    const pool = new Pool({ 
      connectionString: dbUrl,
      connectionTimeoutMillis: 5000, // 5 seconds to connect
      idleTimeoutMillis: 30000,      // 30 seconds before closing idle clients
    });

    // 2. Initialize the Prisma Driver Adapter
    const adapter = new PrismaPg(pool);

    // 3. Pass the adapter to the PrismaClient constructor
    super({ adapter });
  }

  async onModuleInit() {
      await this.$connect();
      this.logger.log('✅ Connected to Database (Prisma v7 with Driver Adapter)');  
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
