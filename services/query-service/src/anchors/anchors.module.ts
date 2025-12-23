// src/anchors/anchors.module.ts
import { Module } from '@nestjs/common';
import { AnchorsService } from './anchors.service';
import { AnchorsController } from './anchors.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AnchorsResolver } from './anchor.resolver';

@Module({
  imports: [PrismaModule],
  controllers: [AnchorsController],
  providers: [AnchorsService, AnchorsResolver],
  exports: [AnchorsService],
})
export class AnchorsModule {}
