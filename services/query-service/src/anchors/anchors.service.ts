// src/anchors/anchors.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Client } from 'minio';

@Injectable()
export class AnchorsService {
  private readonly logger = new Logger(AnchorsService.name);
  private minioClient: Client;

  constructor(private readonly prisma: PrismaService) {
    this.minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: (process.env.MINIO_USE_SSL || 'false') === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
  }

  async findAll() {
    return this.prisma.anchor.findMany({ orderBy: { id: 'desc' } });
  }

  // async findByRequestId(requestId: string) {
  //   return this.prisma.anchor.findUnique({ where: { requestId } });
  // }

 async findByRequestId(requestId: string) {
    // 1. Fetch the Anchor record (Metadata only)
    const anchor = await this.prisma.anchor.findUnique({
      where: { requestId },
    });

    if (!anchor) return null;
        try {
           //  Fetch the raw JSON that the ingest-service just saved!
           const stream = await this.minioClient.getObject('ingest', `raw/${requestId}.json`);
           
           let data = '';
           for await (const chunk of stream) {
             data += chunk.toString();
           }
           return JSON.parse(data); // Returns the actual {"events": [...]} object!
           
        } catch (err) {
           const errorMessage = err instanceof Error ? err.message : String(err);
           this.logger.error(`Failed to fetch raw event ${requestId} from MinIO: ${errorMessage}`);
           return { eventId: requestId, error: "Payload missing in MinIO" };
        }
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
