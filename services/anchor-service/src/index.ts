import { Kafka } from 'kafkajs';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import dotenv from 'dotenv';
import { SolanaClient } from './solana-client';

dotenv.config();

const prisma = new PrismaClient();
const solanaClient = new SolanaClient();

const kafka = new Kafka({
  clientId: 'anchor-service',
  brokers: (process.env.KAFKA_BROKERS || 'kafka-external:9092').split(','),
  connectionTimeout: 3000,
});

const consumer = kafka.consumer({ groupId: 'anchor-processor-group' });

async function run() {
  console.log("⏳ Starting Event-Driven Anchor Service...");
  
  await prisma.$connect();
  console.log("✅ Connected to PostgreSQL");

  await consumer.connect();
  console.log("✅ Connected to Kafka");

  await consumer.subscribe({ topic: 'ingest.events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;

      const payload = JSON.parse(message.value.toString());

      if(!payload.requestId) {
          console.warn(`⚠️ Skipping old/malformed message:`, payload);
          return; // Instantly skip this message and move to the next one
      }

      console.log(`\n📥 Received Job from Kafka: ${payload.requestId}`);

      try {
        // 1. Update DB to PROCESSING so the Frontend knows we started
        await prisma.anchor.upsert({
          where: { requestId: payload.requestId },
          update: { status: 'PROCESSING' },
          create: {
            requestId: payload.requestId,
            submitter: payload.submitter || 'system',
            eventsJson: typeof payload.events === 'string' ? payload.events : JSON.stringify(payload.events),
            status: 'PROCESSING'
          }
        });

        // 2. Generate a real 32-byte Merkle Root Hex String
        const rawEvents = typeof payload.events === 'string' ? payload.events : JSON.stringify(payload.events);
        const hash = crypto.createHash('sha256').update(rawEvents).digest('hex');
        
        // 3. Submit to Solana using your existing client!
        console.log(`⛓️ Anchoring to Solana (PDA via requestID)...`);
        
        // Parse the events back to an array for your solana-client signature
        let eventsArray = [];
        try { eventsArray = JSON.parse(rawEvents); } catch (e) {}

        const result = await solanaClient.submit(payload.requestId, hash, eventsArray);
        console.log(`✅ Anchored! Signature: ${result.signature}`);

        // 4. Save the final transaction receipt to PostgreSQL
        await prisma.anchor.update({
          where: { requestId: payload.requestId },
          data: {
            status: 'OK',
            merkleRoot: `0x${hash}`,
            txHash: result.signature,
          }
        });

      } catch (error: any) {
        console.error(`❌ Failed to process ${payload.requestId}:`, error);
        
        // Mark as FAILED in DB so the Frontend UI reflects the error
        await prisma.anchor.upsert({
          where: { requestId: payload.requestId },
          update: { status: 'FAILED' },
          create: {
             requestId: payload.requestId,
             status: 'FAILED',
             eventsJson: typeof payload.events === 'string' ? payload.events : JSON.stringify(payload.events),
          }
        }).catch((dbErr: any) => console.error("Could not update DB to FAILED state", dbErr));
      }
    },
  });
}

run().catch(console.error);







// import express from "express";
// import bodyParser from "body-parser";
// import dotenv from "dotenv";
// import { SolanaClient } from "./solana-client";

// dotenv.config();

// const port = Number(process.env.PORT || 3000);
// const client = new SolanaClient();
// const app = express();
// app.use(bodyParser.json());

// app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));

// // POST /api/v1/anchor/submit { request_id, merkle_root, events }
// app.post("/api/v1/anchor/submit", async (req, res) => {
//   try {
//     const { request_id, merkle_root, events } = req.body;
//     if (!request_id || !merkle_root) return res.status(400).json({ error: "request_id & merkle_root required" });
//     const r = await client.submit(request_id, merkle_root, events || []);
//     console.log(`[API] Success! Signature: ${r.signature}`);
//     return res.json({ ok: true, ...r });
//   } catch (err: any) {
//     console.error("submit err", err);
//     return res.status(500).json({ error: err.message || err });
//   }
// });

// app.listen(port, () => {
//   console.log(`Anchor service listening on ${port}`);
// });
