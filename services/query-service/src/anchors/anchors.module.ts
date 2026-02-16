// src/anchors/anchors.module.ts
import { Module } from '@nestjs/common';
import { AnchorsService } from './anchors.service';
import { AnchorsController } from './anchors.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AnchorsResolver } from './anchor.resolver';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [PrismaModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AnchorsController],
  providers: [AnchorsService, AnchorsResolver, JwtStrategy],
  exports: [AnchorsService, PassportModule],
})
export class AnchorsModule {}
