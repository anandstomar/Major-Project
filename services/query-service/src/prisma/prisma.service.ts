import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    console.log('Initializing PrismaService with DATABASE_URL:', configService.get<string>('DATABASE_URL'));
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
      try {
        await this.$queryRaw`SELECT 1`; 
        this.logger.log('✅ Real connection established to Database!');  
      } catch (error) {
        this.logger.error('❌ FAILED TO CONNECT TO DATABASE!', error);
        process.exit(1);
      }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
