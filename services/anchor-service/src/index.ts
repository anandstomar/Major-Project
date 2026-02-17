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

      const rawValue = message.value.toString();
      
      try {
        const incomingData = JSON.parse(rawValue);

        // 👇 Map the new envelope structure from the Ingest Service
        const requestId = incomingData.event_id || incomingData.requestId;
        const events = incomingData.payload?.events || incomingData.events;
        const submitter = incomingData.payload?.submitter || incomingData.actor || 'system';

        // THE ABSOLUTE SHIELD
        if (!requestId) {
          console.warn(`⚠️ Skipping malformed message. No event_id found:`, incomingData);
          return; 
        }

        console.log(`\n📥 Received Job from Kafka: ${requestId}`);

        // 1. Update DB to PROCESSING
        const rawEvents = typeof events === 'string' ? events : JSON.stringify(events || []);
        
        await prisma.anchor.upsert({
          where: { requestId: requestId },
          update: { status: 'PROCESSING' },
          create: {
            requestId: requestId,
            submitter: submitter,
            eventsJson: rawEvents,
            status: 'PROCESSING'
          }
        });

        // 2. Generate Merkle Root
        const hash = crypto.createHash('sha256').update(rawEvents).digest('hex');
        
        // 3. Submit to Solana
        console.log(`⛓️ Anchoring to Solana (PDA via requestID)...`);
        let eventsArray = [];
        try { eventsArray = JSON.parse(rawEvents); } catch (e) {}

        const result = await solanaClient.submit(requestId, hash, eventsArray);
        console.log(`✅ Anchored! Signature: ${result.signature}`);

        // 4. Save the final transaction to PostgreSQL
        await prisma.anchor.update({
          where: { requestId: requestId },
          data: {
            status: 'OK',
            merkleRoot: `0x${hash}`,
            txHash: result.signature,
          }
        });

      } catch (error: any) {
        console.error(`❌ Failed to process message:`, error);
        
        try {
            const fallbackData = JSON.parse(rawValue);
            const fallbackId = fallbackData.event_id || fallbackData.requestId;
            if (fallbackId) {
                await prisma.anchor.update({
                    where: { requestId: fallbackId },
                    data: { status: 'FAILED' }
                });
            }
        } catch (fallbackErr) {
            // Ignore fallback errors
        }
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
