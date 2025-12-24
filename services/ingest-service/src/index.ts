import express from "express";
import multer from "multer";
import * as Minio from "minio"; // Changed import to compatible wildcard
import { create as createIpfsClient } from "ipfs-http-client";
import { Kafka } from "kafkajs";
import { v4 as randomUUID } from 'uuid'
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const MINIO_BUCKET = process.env.MINIO_BUCKET || "ingest";

// ---- MinIO client ----
// Fix: Use Minio.Client from the wildcard import
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : 9000,
  useSSL: (process.env.MINIO_USE_SSL || "false") === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

// Ensure bucket exists
async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      // Fix: makeBucket usually requires a region in newer SDKs, default to 'us-east-1'
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
      console.log(`Created MinIO bucket: ${MINIO_BUCKET}`);
    } else {
      console.log(`MinIO bucket '${MINIO_BUCKET}' exists.`);
    }
  } catch (err) {
    console.error("MinIO Bucket Error:", err);
    process.exit(1);
  }
}

// ---- IPFS client ----
// Note: Ensure IPFS container API is mapped to 5001
const ipfs = createIpfsClient({ 
  url: process.env.IPFS_API_URL || "http://localhost:5001" 
});

// ---- Kafka producer ----
// Note: If running locally, connect to 'localhost:9092'. 
// If running inside Docker, connect to 'kafka:29092'.
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "ingest-service",
  brokers: (process.env.KAFKA_BROKER || process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

const producer = kafka.producer();
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "ingest.events";

async function initKafka() {
  try {
    await producer.connect();
    console.log("Kafka producer connected");
  } catch (err) {
    console.error("Kafka Connection Error:", err);
    process.exit(1);
  }
}

// ---- Express + multer ----
const app = express();
// 50MB Limit
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 50 * 1024 * 1024 } 
}); 

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  
  // Safe extraction of body parameters
  const actor = req.body ? req.body.actor : null;
  const eventType = req.body ? req.body.type : "manifest_upload";

  if (!file) return res.status(400).json({ error: "Missing file (multipart form field 'file')" });

  try {
    const event_id = "evt-" + randomUUID();
    const batch_id = "batch-" + randomUUID();
    const timestamp = new Date().toISOString();
    const filename = file.originalname;
    const buffer = file.buffer;
    const content_size = buffer.length;

    // Compute SHA256 for integrity
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // 1. Store to MinIO
    const minioKey = `${event_id}/${filename}`;
    await minioClient.putObject(MINIO_BUCKET, minioKey, buffer, content_size, {
        'Content-Type': file.mimetype
    });
    console.log(`Saved to MinIO: ${minioKey}`);

    // 2. Pin to IPFS
    const ipfsResult = await ipfs.add(buffer, { pin: true });
    // ipfsResult.cid is a CID object, convert to string
    const data_cid = ipfsResult.cid.toString();
    console.log(`Pinned to IPFS: ${data_cid}`);

    const event = {
      event_id,
      batch_id,
      type: eventType,
      actor,
      filename,
      minio_key: minioKey,
      data_cid,
      data_hash: `sha256:${hash}`,
      content_size,
      mimetype: file.mimetype,
      timestamp,
    };

    // 3. Publish to Kafka
    await producer.send({
      topic: KAFKA_TOPIC,
      messages: [
        {
          key: event_id,
          value: JSON.stringify(event),
        },
      ],
    });

    console.log(`Published ingest event ${event_id} -> topic ${KAFKA_TOPIC}`);

    return res.status(201).json({ 
        success: true,
        event_id, 
        data_cid, 
        minio_key: minioKey 
    });

  } catch (err) {
    console.error("Upload process failed:", err);
    return res.status(500).json({ 
        error: "internal_error", 
        details: err instanceof Error ? err.message : String(err) 
    });
  }
});

// Bootstrap
async function start() {
  await ensureBucket(); // Wait for MinIO
  await initKafka();    // Wait for Kafka
  
  app.listen(PORT, () => {
    console.log(`Ingest service listening on http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error("Startup failed:", e);
  process.exit(1);
});