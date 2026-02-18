import express from "express";
import multer from "multer";
import cors from "cors";
import * as Minio from "minio";
import { create as createIpfsClient } from "ipfs-http-client";
import { Kafka } from "kafkajs";
import { v4 as randomUUID } from 'uuid';
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const MINIO_BUCKET = process.env.MINIO_BUCKET || "ingest";

// ---- Keycloak JWT Auth Middleware ----
const client = jwksClient({
  jwksUri: 'http://92.4.78.222/auth-server/realms/provenance/protocol/openid-connect/certs',
  cache: true,
  rateLimit: true,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, function (err, key) {
    const signingKey = key?.getPublicKey();
    callback(err, signingKey);
  });
}

const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = decoded; // Store user details (like Keycloak ID) in request
    next();
  });
};

// ---- Infrastructure Clients ----
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "minio",
  port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : 9000,
  useSSL: (process.env.MINIO_USE_SSL || "false") === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const ipfs = createIpfsClient({ 
  url: process.env.IPFS_API_URL || "http://ipfs:5001" 
});

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "ingest-service",
  brokers: (process.env.KAFKA_BROKERS || "kafka-external:9092").split(","),
  connectionTimeout: 3000,
});

const producer = kafka.producer();
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "ingest.events";

// ---- Express Setup ----
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 50 * 1024 * 1024 } 
});

// ---- Routes ----

// Health Check
app.get("/api/v1/ingest/health", (_, res) => res.json({ ok: true, status: "healthy" }));

// Route 1: Direct JSON Payload (For the "Submit Anchor" modal in the UI)
app.post("/api/v1/ingest", authMiddleware, async (req: any, res: any) => {
  const payload = req.body;
  
  if (!payload.events) {
      return res.status(400).json({ message: 'events payload required' });
  }

  const requestId = "req-" + randomUUID();
  const timestamp = new Date().toISOString();

  // Save the raw JSON payload to MinIO before sending to Kafka!
  try {
    const buffer = Buffer.from(JSON.stringify(payload, null, 2));
    const minioKey = `raw/${requestId}.json`;
    
    await minioClient.putObject(MINIO_BUCKET, minioKey, buffer, buffer.length, {
      'Content-Type': 'application/json'
    });
    console.log(`[JSON INGEST] Saved raw payload to MinIO: ${minioKey}`);
  } catch (err) {
    console.error("Failed to save raw payload to MinIO:", err);
    return res.status(500).json({ error: "Storage failure" });
  }

  // Now just send the metadata to Kafka (keeping the payload small!)
  const kafkaMessage = {
    event_id: requestId,
    type: "direct_json_anchor",
    actor: req.user.preferred_username || "system",
    payload: payload, 
    timestamp,
  };

  try {
    await producer.send({
      topic: KAFKA_TOPIC,
      messages: [{ key: requestId, value: JSON.stringify(kafkaMessage) }],
    });

    console.log(`[JSON INGEST] Published ${requestId} to Kafka`);
    res.status(202).json({ requestId, status: 'received', message: "Queued for processing" });
  } catch (err) {
    console.error("Kafka error:", err);
    res.status(500).json({ error: "Failed to queue message" });
  }
});

// ---- Initialization ----
async function start() {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
  } catch (e) {
    console.log("MinIO init skipped or failed, continuing...", e instanceof Error ? e.message : String(e));
  }

  try {
    await producer.connect();
    console.log("✅ Kafka producer connected");
  } catch (e) {
    console.log("Kafka init failed, continuing...", e instanceof Error ? e.message : String(e));
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Ingest service listening on port ${PORT}`);
  });
}

start();




// import express from "express";
// import multer from "multer";
// import * as Minio from "minio"; // Changed import to compatible wildcard
// import { create as createIpfsClient } from "ipfs-http-client";
// import { Kafka } from "kafkajs";
// import { v4 as randomUUID } from 'uuid'
// import crypto from "crypto";
// import dotenv from "dotenv";

// dotenv.config();

// const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
// const MINIO_BUCKET = process.env.MINIO_BUCKET || "ingest";

// // ---- MinIO client ----
// // Fix: Use Minio.Client from the wildcard import
// const minioClient = new Minio.Client({
//   endPoint: process.env.MINIO_ENDPOINT || "localhost",
//   port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : 9000,
//   useSSL: (process.env.MINIO_USE_SSL || "false") === "true",
//   accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
//   secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
// });

// // Ensure bucket exists
// async function ensureBucket() {
//   try {
//     const exists = await minioClient.bucketExists(MINIO_BUCKET);
//     if (!exists) {
//       // Fix: makeBucket usually requires a region in newer SDKs, default to 'us-east-1'
//       await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
//       console.log(`Created MinIO bucket: ${MINIO_BUCKET}`);
//     } else {
//       console.log(`MinIO bucket '${MINIO_BUCKET}' exists.`);
//     }
//   } catch (err) {
//     console.error("MinIO Bucket Error:", err);
//     process.exit(1);
//   }
// }

// // ---- IPFS client ----
// // Note: Ensure IPFS container API is mapped to 5001
// const ipfs = createIpfsClient({ 
//   url: process.env.IPFS_API_URL || "http://localhost:5001" 
// });

// // ---- Kafka producer ----
// // Note: If running locally, connect to 'localhost:9092'. 
// // If running inside Docker, connect to 'kafka:29092'.
// const kafka = new Kafka({
//   clientId: process.env.KAFKA_CLIENT_ID || "ingest-service",
//   brokers: (process.env.KAFKA_BROKER || process.env.KAFKA_BROKERS || "localhost:9092").split(","),
// });

// const producer = kafka.producer();
// const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "ingest.events";

// async function initKafka() {
//   try {
//     await producer.connect();
//     console.log("Kafka producer connected");
//   } catch (err) {
//     console.error("Kafka Connection Error:", err);
//     process.exit(1);
//   }
// }

// // ---- Express + multer ----
// const app = express();
// // 50MB Limit
// const upload = multer({ 
//   storage: multer.memoryStorage(), 
//   limits: { fileSize: 50 * 1024 * 1024 } 
// }); 

// app.get("/health", (_, res) => res.json({ ok: true }));

// app.post("/upload", upload.single("file"), async (req, res) => {
//   const file = req.file;
  
//   // Safe extraction of body parameters
//   const actor = req.body ? req.body.actor : null;
//   const eventType = req.body ? req.body.type : "manifest_upload";

//   if (!file) return res.status(400).json({ error: "Missing file (multipart form field 'file')" });

//   try {
//     const event_id = "evt-" + randomUUID();
//     const batch_id = "batch-" + randomUUID();
//     const timestamp = new Date().toISOString();
//     const filename = file.originalname;
//     const buffer = file.buffer;
//     const content_size = buffer.length;

//     // Compute SHA256 for integrity
//     const hash = crypto.createHash("sha256").update(buffer).digest("hex");

//     // 1. Store to MinIO
//     const minioKey = `${event_id}/${filename}`;
//     await minioClient.putObject(MINIO_BUCKET, minioKey, buffer, content_size, {
//         'Content-Type': file.mimetype
//     });
//     console.log(`Saved to MinIO: ${minioKey}`);

//     // 2. Pin to IPFS
//     const ipfsResult = await ipfs.add(buffer, { pin: true });
//     // ipfsResult.cid is a CID object, convert to string
//     const data_cid = ipfsResult.cid.toString();
//     console.log(`Pinned to IPFS: ${data_cid}`);

//     const event = {
//       event_id,
//       batch_id,
//       type: eventType,
//       actor,
//       filename,
//       minio_key: minioKey,
//       data_cid,
//       data_hash: `sha256:${hash}`,
//       content_size,
//       mimetype: file.mimetype,
//       timestamp,
//     };

//     // 3. Publish to Kafka
//     await producer.send({
//       topic: KAFKA_TOPIC,
//       messages: [
//         {
//           key: event_id,
//           value: JSON.stringify(event),
//         },
//       ],
//     });

//     console.log(`Published ingest event ${event_id} -> topic ${KAFKA_TOPIC}`);

//     return res.status(201).json({ 
//         success: true,
//         event_id, 
//         data_cid, 
//         minio_key: minioKey 
//     });

//   } catch (err) {
//     console.error("Upload process failed:", err);
//     return res.status(500).json({ 
//         error: "internal_error", 
//         details: err instanceof Error ? err.message : String(err) 
//     });
//   }
// });

// // Bootstrap
// async function start() {
//   await ensureBucket(); // Wait for MinIO
//   await initKafka();    // Wait for Kafka
  
//   app.listen(PORT, () => {
//     console.log(`Ingest service listening on http://localhost:${PORT}`);
//   });
// }

// start().catch((e) => {
//   console.error("Startup failed:", e);
//   process.exit(1);
// });