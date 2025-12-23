// src/anchors/anchors.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnchorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.anchor.findMany({ orderBy: { id: 'desc' } });
  }

  async findByRequestId(requestId: string) {
    return this.prisma.anchor.findUnique({ where: { requestId } });
  }

  async findOne(requestId: string) {
    return this.prisma.anchor.findUnique({ 
      where: { requestId } 
    });
  }

  // optional: add create if trusted input required
  async createAnchor(data: any) {
    return this.prisma.anchor.create({ data });
  }
}
