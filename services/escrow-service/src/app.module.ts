import { Module } from '@nestjs/common';
import { EscrowModule } from './escrow/escrow.module';
import { EventsListener } from './events/listener';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '.env'), 
    }),EscrowModule, PrismaModule],
  providers: [EventsListener],
})
export class AppModule {}
