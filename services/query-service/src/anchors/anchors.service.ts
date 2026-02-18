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
    // 1. Fetch the Anchor record (Metadata) from Postgres
    const anchor = await this.prisma.anchor.findUnique({
      where: { requestId },
    });

    if (!anchor) return null;

    // 2. Extract the Ingest Event IDs from the database record
    let eventIds: string[] = [];
    try {
      if (anchor.eventsJson) {
        // Handle parsing in case Prisma returns it as a string
        eventIds = typeof anchor.eventsJson === 'string' 
          ? JSON.parse(anchor.eventsJson) 
          : anchor.eventsJson;
      }
    } catch (e) {
      this.logger.error(`Failed to parse eventsJson for ${requestId}`);
    }

    // 3. Hydrate the raw payloads from MinIO using the INGEST IDs
    const hydratedEvents = await Promise.all(
      eventIds.map(async (eventId) => {
        try {
           //  Fetch using the individual Ingest Event ID!
           const stream = await this.minioClient.getObject('ingest', `raw/${eventId}.json`);
           
           let rawData = '';
           for await (const chunk of stream) {
             rawData += chunk.toString();
           }
           
           return JSON.parse(rawData);
        } catch (err) {
           const errorMessage = err instanceof Error ? err.message : String(err);
           this.logger.error(`Failed to fetch raw event ${eventId}: ${errorMessage}`);
           // Fallback for this specific event if it's missing
           return { eventId: eventId, error: "Raw payload missing in MinIO" };
        }
      })
    );

    // 4. Return the FULL Anchor object with the newly hydrated events
    return {
      ...anchor,
      eventsJson: hydratedEvents 
    };
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
