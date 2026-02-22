import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const dbUrl = configService.get<string>('DATABASE_URL');
    
    if (!dbUrl) {
      throw new Error('❌ DATABASE_URL is missing from environment variables');
    }

    // Pass the connection string directly to the built-in Prisma engine
    super({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }

  async onModuleInit() {
      try {
        await this.$connect();
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