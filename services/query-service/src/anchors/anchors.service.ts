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

    // 2. Fetch the actual Batch File from MinIO!
    try {
      // NOTE: If you found the file in the 'requests' folder instead of 'completed', 
      // change the path below to `requests/${requestId}.json`
      const stream = await this.minioClient.getObject('ingest', `completed/${requestId}.json`);
      
      let data = '';
      for await (const chunk of stream) {
        data += chunk.toString();
      }
      
      const minioBatchData = JSON.parse(data);

      // 3. Return the merged object
      return {
        ...anchor,
        // Override the database eventsJson with the exact array found in the MinIO file
        eventsJson: minioBatchData.events 
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to fetch ${requestId}.json from MinIO: ${errorMessage}`);
      
      // Fallback: If MinIO fails, gracefully return the IDs stored in Postgres
      return {
         ...anchor,
         eventsJson: anchor.eventsJson ? JSON.parse(anchor.eventsJson) : []
      };
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
