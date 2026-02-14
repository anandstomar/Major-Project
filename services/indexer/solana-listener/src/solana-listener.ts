import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Kafka } from 'kafkajs';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';


dotenv.config();

const HTTP_RPC = process.env.SOLANA_HTTP_RPC || 'http://localhost:8899';
const PROGRAM_ID = process.env.SOLANA_PROGRAM_ID || 'Fb7znUeRhH1pHHRd5cNtwTxFqL9AheKvDmU1MR4AZ5tq';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'anchors.completed';
// We need to point to the IDL just like in the client
const IDL_PATH = process.env.SOLANA_IDL_PATH || path.resolve(__dirname, 'anchor_program.json');

const kafka = new Kafka({ brokers: KAFKA_BROKERS });
const producer = kafka.producer();

async function start() {
  await producer.connect();
  console.log("Connected to Kafka", KAFKA_BROKERS);

  // 1. Setup minimal Anchor Provider (We don't need a real wallet for listening, just a dummy)
  const connection = new Connection(HTTP_RPC, 'confirmed');
  const dummyWallet = new anchor.Wallet(Keypair.generate());
  const provider = new anchor.AnchorProvider(connection, dummyWallet, {});
  let program: anchor.Program;

  // 2. Load the IDL
  if (!fs.existsSync(IDL_PATH)) throw new Error(`IDL not found at ${IDL_PATH}`);
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'));

  program = new anchor.Program(idl, new PublicKey(PROGRAM_ID!), provider);
  console.log(`Listening for events on program: ${PROGRAM_ID}...`);

  // 5. THE MAGIC: Use Anchor's built-in event listener
  // This automatically decodes the Base64 logs for you!
  program.addEventListener("AnchorSubmitted", async (event: any, slot: number, signature: string) => {
    console.log(`[Event Detected] Signature: ${signature}`);

    try {
      // Construct the clean payload
      const completed = {
        request_id: event.requestId,
        merkle_root: "0x" + Buffer.from(event.merkleRoot).toString("hex"),
        tx_hash: signature,
        block_number: slot,
        submitted_at: new Date(event.submittedAt.toNumber() * 1000).toISOString(),
        submitter: event.submitter.toBase58(),
        status: "success",
        events: []
      };

      console.log("-> Parsed Payload:", JSON.stringify(completed, null, 2));

      // Send to Kafka
      await producer.send({
        topic: KAFKA_TOPIC,
        messages: [
          {
            key: completed.request_id,
            value: JSON.stringify(completed)
          }
        ]
      });

      console.log(`[Kafka] Produced message for ${completed.request_id}`);

    } catch (err) {
      console.error("Error processing event:", err);
    }
  });
}

start().catch(err => {
  console.error("listener err", err);
  process.exit(1);
});




// import { Connection, PublicKey } from '@solana/web3.js';
// import { Kafka } from 'kafkajs';
// import dotenv from 'dotenv';

// dotenv.config();

// const HTTP_RPC = process.env.SOLANA_HTTP_RPC || 'http://localhost:8899';
// const PROGRAM_ID = process.env.SOLANA_PROGRAM_ID || 'Fb7znUeRhH1pHHRd5cNtwTxFqL9AheKvDmU1MR4AZ5tq';
// const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
// const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'anchors.completed';

// const connection = new Connection(HTTP_RPC, 'confirmed');
// const programKey = new PublicKey(PROGRAM_ID);

// const kafka = new Kafka({ brokers: KAFKA_BROKERS });
// const producer = kafka.producer();

// async function start() {
//   await producer.connect();
//   console.log("Connected to Kafka", KAFKA_BROKERS);

//   // Websocket subscription is not enabled on all environments; onLogs uses websockets if available.
//   connection.onLogs(programKey, async (logInfo : any) => {
//     const { signature, logs, slot } = logInfo;
//     for (const l of logs) {
//       // Anchor emits events using `emit!` which prints an event log. Depending on Anchor version,
//       // the exact log prefix differs. We'll try to find the JSON payload inside the log line.
//       if (l.includes("AnchorSubmitted") || l.includes("AnchorEvent") || l.includes("EVENT:")) {
//         // Extract JSON-like substring
//         const split = l.split(/AnchorSubmitted:|AnchorEvent:|EVENT:/);
//         const jsonPart = split.length > 1 ? split.pop()!.trim() : null;
//         if (!jsonPart) continue;
//         try {
//           const evt = JSON.parse(jsonPart);
//           const completed = {
//             request_id: evt.request_id,
//             merkle_root: "0x" + Buffer.from(evt.merkle_root).toString("hex"),
//             tx_hash: signature,
//             block_number: slot || 0,
//             submitted_at: new Date(evt.submitted_at * 1000).toISOString(),
//             submitter: evt.submitter,
//             status: "success",
//             preview_ids: [],
//             events: []
//           };
//           await producer.send({
//             topic: KAFKA_TOPIC,
//             messages: [
//               {
//                 key: completed.request_id,
//                 value: JSON.stringify(completed)
//               }
//             ]
//           });
//           console.log("Produced anchors.completed", completed.request_id, signature);
//         } catch (err) {
//           console.warn("Failed parse/produce event", err);
//         }
//       }
//     }
//   }, "confirmed");

//   console.log("Subscribed to program logs:", PROGRAM_ID);
// }

// start().catch(err => {
//   console.error("listener err", err);
//   process.exit(1);
// });
