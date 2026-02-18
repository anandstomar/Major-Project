import { Kafka } from 'kafkajs';
import { PrismaClient } from '@prisma/client';
import * as Minio from 'minio';
import dotenv from 'dotenv';
import { SolanaClient } from './solana-client';

dotenv.config();

const prisma = new PrismaClient();
const solanaClient = new SolanaClient();

// --- 1. Kafka Setup ---
const kafka = new Kafka({
  clientId: 'anchor-service',
  brokers: (process.env.KAFKA_BROKERS || 'kafka-external:9092').split(','),
  connectionTimeout: 3000,
});
const consumer = kafka.consumer({ groupId: 'anchor-processor-group' });
const producer = kafka.producer();

const requestTopic = process.env.ANCHORS_REQUEST_TOPIC || 'anchors.request';
const completedTopic = process.env.ANCHORS_COMPLETED_TOPIC || 'anchors.completed';

// --- 2. MinIO Setup (Ported from Go) ---
const minioBucket = process.env.MINIO_BUCKET || 'ingest';
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: (process.env.MINIO_USE_SSL || 'false') === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

async function run() {
  console.log("⏳ Starting Event-Driven Anchor Service (Solana Edition)...");
  
  await prisma.$connect();
  console.log("✅ Connected to PostgreSQL");

  await producer.connect();
  await consumer.connect();
  console.log("✅ Connected to Kafka Producer & Consumer");

  // Ensure MinIO bucket exists
  const exists = await minioClient.bucketExists(minioBucket);
  if (!exists) {
    await minioClient.makeBucket(minioBucket, 'us-east-1');
  }
  console.log(`✅ Connected to MinIO (Bucket: ${minioBucket})`);

  // Subscribe to the Scheduler's output topic
  await consumer.subscribe({ topic: requestTopic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const rawValue = message.value.toString();
      
      try {
        const requestData = JSON.parse(rawValue);
        const requestId = requestData.request_id;
        const events = requestData.events || [];
        const merkleRoot = requestData.merkle_root || "0000000000000000000000000000000000000000000000000000000000000000";
        const submitter = requestData.submitter || 'scheduler';

        if (!requestId) {
          console.warn(`⚠️ Skipping malformed message. No request_id found:`, requestData);
          return; 
        }

        console.log(`\n📥 Received Anchor Request from Scheduler: ${requestId}`);

        // 1. Update DB to PROCESSING
        const rawEvents = typeof events === 'string' ? events : JSON.stringify(events);
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

        // 2. Submit to Solana
        console.log(`⛓️ Anchoring to Solana (PDA via requestID)...`);
        await solanaClient.ensureInit(requestId); 
        const result = await solanaClient.submit(requestId, merkleRoot, events);
        console.log(`✅ Anchored! Signature: ${result.signature}`);

        // 3. Update DB to OK
        await prisma.anchor.update({
          where: { requestId: requestId },
          data: {
            status: 'OK',
            merkleRoot: merkleRoot, 
            txHash: result.signature,
          }
        });

        // 4. Build Completion Event
        const completionEvent = {
          ...requestData,
          status: "completed",
          tx_hash: result.signature,
          pda: result.pda,
          submitted_at: new Date().toISOString(),
        };

        // 5. Save to MinIO (Ported from processor.go)
        const minioKey = `completed/${requestId}.json`;
        const buffer = Buffer.from(JSON.stringify(completionEvent, null, 2));
        await minioClient.putObject(minioBucket, minioKey, buffer, buffer.length, {
            'Content-Type': 'application/json'
        });
        console.log(`💾 Saved transaction receipt to MinIO: ${minioKey}`);

        // 6. Publish the completion event back to Kafka
        await producer.send({
          topic: completedTopic,
          messages: [{ key: requestId, value: JSON.stringify(completionEvent) }],
        });
        console.log(`📤 Published completion event to ${completedTopic}`);

      } catch (error: any) {
        console.error(`❌ Failed to process message:`, error);
        // Handle failure state in DB if possible
        try {
            const fallbackData = JSON.parse(rawValue);
            if (fallbackData.request_id) {
                await prisma.anchor.update({
                    where: { requestId: fallbackData.request_id },
                    data: { status: 'FAILED' }
                });
            }
        } catch (fallbackErr) {}
      }
    },
  });
}

run().catch(console.error);









// import { Kafka } from 'kafkajs';
// import { PrismaClient } from '@prisma/client';
// import * as crypto from 'crypto';
// import dotenv from 'dotenv';
// import { SolanaClient } from './solana-client';

// dotenv.config();

// const prisma = new PrismaClient();
// const solanaClient = new SolanaClient();

// const kafka = new Kafka({
//   clientId: 'anchor-service',
//   brokers: (process.env.KAFKA_BROKERS || 'kafka-external:9092').split(','),
//   connectionTimeout: 3000,
// });

// const consumer = kafka.consumer({ groupId: 'anchor-processor-group' });

// async function run() {
//   console.log("⏳ Starting Event-Driven Anchor Service...");
  
//   await prisma.$connect();
//   console.log("✅ Connected to PostgreSQL");

//   await consumer.connect();
//   console.log("✅ Connected to Kafka");

//   await consumer.subscribe({ topic: 'ingest.events', fromBeginning: true });

//   await consumer.run({
//     eachMessage: async ({ topic, partition, message }) => {
//       if (!message.value) return;

//       const rawValue = message.value.toString();
      
//       try {
//         const incomingData = JSON.parse(rawValue);

//         // 👇 Map the new envelope structure from the Ingest Service
//         const requestId = incomingData.event_id || incomingData.requestId;
//         const events = incomingData.payload?.events || incomingData.events;
//         const submitter = incomingData.payload?.submitter || incomingData.actor || 'system';

//         // THE ABSOLUTE SHIELD
//         if (!requestId) {
//           console.warn(`⚠️ Skipping malformed message. No event_id found:`, incomingData);
//           return; 
//         }

//         console.log(`\n📥 Received Job from Kafka: ${requestId}`);

//         // 1. Update DB to PROCESSING
//         const rawEvents = typeof events === 'string' ? events : JSON.stringify(events || []);
        
//         await prisma.anchor.upsert({
//           where: { requestId: requestId },
//           update: { status: 'PROCESSING' },
//           create: {
//             requestId: requestId,
//             submitter: submitter,
//             eventsJson: rawEvents,
//             status: 'PROCESSING'
//           }
//         });

//         // 2. Generate Merkle Root
//         const hash = crypto.createHash('sha256').update(rawEvents).digest('hex');
        
//         // 3. Submit to Solana
//         console.log(`⛓️ Anchoring to Solana (PDA via requestID)...`);
//         let eventsArray = [];
//         try { eventsArray = JSON.parse(rawEvents); } catch (e) {}

//         const result = await solanaClient.submit(requestId, hash, eventsArray);
//         console.log(`✅ Anchored! Signature: ${result.signature}`);

//         // 4. Save the final transaction to PostgreSQL
//         await prisma.anchor.update({
//           where: { requestId: requestId },
//           data: {
//             status: 'OK',
//             merkleRoot: `0x${hash}`,
//             txHash: result.signature,
//           }
//         });

//       } catch (error: any) {
//         console.error(`❌ Failed to process message:`, error);
        
//         try {
//             const fallbackData = JSON.parse(rawValue);
//             const fallbackId = fallbackData.event_id || fallbackData.requestId;
//             if (fallbackId) {
//                 await prisma.anchor.update({
//                     where: { requestId: fallbackId },
//                     data: { status: 'FAILED' }
//                 });
//             }
//         } catch (fallbackErr) {
//             // Ignore fallback errors
//         }
//       }
//     },
//   });
// }

// run().catch(console.error);





// // import express from "express";
// // import bodyParser from "body-parser";
// // import dotenv from "dotenv";
// // import { SolanaClient } from "./solana-client";

// // dotenv.config();

// // const port = Number(process.env.PORT || 3000);
// // const client = new SolanaClient();
// // const app = express();
// // app.use(bodyParser.json());

// // app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));

// // // POST /api/v1/anchor/submit { request_id, merkle_root, events }
// // app.post("/api/v1/anchor/submit", async (req, res) => {
// //   try {
// //     const { request_id, merkle_root, events } = req.body;
// //     if (!request_id || !merkle_root) return res.status(400).json({ error: "request_id & merkle_root required" });
// //     const r = await client.submit(request_id, merkle_root, events || []);
// //     console.log(`[API] Success! Signature: ${r.signature}`);
// //     return res.json({ ok: true, ...r });
// //   } catch (err: any) {
// //     console.error("submit err", err);
// //     return res.status(500).json({ error: err.message || err });
// //   }
// // });

// // app.listen(port, () => {
// //   console.log(`Anchor service listening on ${port}`);
// // });
