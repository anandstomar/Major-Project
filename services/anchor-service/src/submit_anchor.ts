import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "./anchor_program.json";

// 1. The Base64 string you got from curl
const rawBase64 = "OU0pkRVtrvcGAAAAcmVxMTIzAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQF5ErgDToBKGl8DasE9HopzqhY93vyF6l8xMCJyPt+0vDfxW2kAAAAAdgAAAFt7InN0YXR1cyI6IkNyZWF0ZWQiLCJsb2MiOiJGYWN0b3J5IEEiLCJ0aW1lIjoxNzY3NjMzMjA1NDE3fSx7InN0YXR1cyI6IlNoaXBwZWQiLCJsb2MiOiJQb3J0IEIiLCJ0aW1lIjoxNzY3NjMzMjA2NDE3fV0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

const PROGRAM_ID = "4wa3xzTQK88UeEKBNoN1NxEU6dTjak6qYR8N7VDdLyz3";

async function main() {
  // 2. Setup a dummy provider (we don't need a real connection just to decode)
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com");
  const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  
  // 3. Initialize the Program with the IDL
  const program = new anchor.Program(idl as any, new PublicKey(PROGRAM_ID), provider);

  // 4. Decode the data
  // "AnchorAccount" must match the struct name in your Rust code (camelCase usually works too)
  const decodedData = program.coder.accounts.decode(
    "AnchorAccount", 
    Buffer.from(rawBase64, "base64")
  );

  // 5. Print the result
  console.log("Request ID:", decodedData.requestId);
  console.log("Submitter:", decodedData.submitter.toBase58());
  console.log("Events (String):", decodedData.events);

  // 6. Convert the internal JSON string back to a real Object
  const eventsObject = JSON.parse(decodedData.events);
  console.log("Events (JSON):", JSON.stringify(eventsObject, null, 2));
}

main();








// import * as anchor from "@project-serum/anchor";
// import fs from "fs";
// import path from "path";
// import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
// import idl from "../../../programs/anchor_program/target/idl/anchor_program.json";

// // ⚠️ IMPORTANT: Use the Program ID that worked in your last step
// const PROGRAM_ID = new PublicKey("4wa3xzTQK88UeEKBNoN1NxEU6dTjak6qYR8N7VDdLyz3");

// const RPC = "https://api.devnet.solana.com";
// const KEYPAIR_PATH = process.env.SOLANA_FEE_PAYER_PATH || path.join(process.cwd(), "./dev-fee-payer.json");

// function loadKeypair(p: string): Keypair {
//   if (!fs.existsSync(p)) throw new Error(`Keypair file not found: ${p}`);
//   const secret = JSON.parse(fs.readFileSync(p, "utf8"));
//   return Keypair.fromSecretKey(Uint8Array.from(secret));
// }

// async function main() {
//   // 1. Setup
//   const payer = loadKeypair(KEYPAIR_PATH);
//   const wallet = new anchor.Wallet(payer);
//   const connection = new anchor.web3.Connection(RPC, "confirmed");
//   const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
//   anchor.setProvider(provider);
//   const program = new anchor.Program(idl as any, PROGRAM_ID, provider);

//   // 2. Define the Request ID (Must match the one you initialized!)
//   const requestId = "req123";
//   const [pda] = PublicKey.findProgramAddressSync(
//     [Buffer.from("anchor"), Buffer.from(requestId)], 
//     PROGRAM_ID
//   );

//   console.log("---------------------------------------------------");
//   console.log("Updating Anchor Account for Request ID:", requestId);
//   console.log("Account Address (PDA):", pda.toBase58());

//   // 3. Prepare Data
//   // Create a dummy 32-byte Merkle Root (e.g., all 1s, or random)
//   const merkleRoot = new Array(32).fill(1); 
  
//   // Create a sample JSON event string
//   // ⚠️ NOTE: Your Rust contract allocated 256 bytes for this. 
//   // Keep this string under ~200 chars to be safe.
//   const sampleEvents = JSON.stringify([
//     { status: "Created", loc: "Factory A", time: Date.now() },
//     { status: "Shipped", loc: "Port B", time: Date.now() + 1000 }
//   ]);

//   console.log("Submitting Merkle Root:", merkleRoot.slice(0, 5), "..."); 
//   console.log("Submitting Events JSON:", sampleEvents);

//   try {
//     // 4. Call submitAnchor
//     const txSig = await program.methods
//       .submitAnchor(merkleRoot, sampleEvents)
//       .accounts({
//         anchorAccount: pda,
//         submitter: provider.wallet.publicKey,
//         systemProgram: SystemProgram.programId,
//       })
//       .rpc();

//     console.log("✅ Transaction sent! Signature:", txSig);

//     // 5. Confirm and Fetch
//     const latestBlockhash = await connection.getLatestBlockhash();
//     await connection.confirmTransaction({
//         signature: txSig,
//         blockhash: latestBlockhash.blockhash,
//         lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
//     });

//     console.log("Transaction confirmed. Fetching updated account data...");

//     const acc = await program.account.anchorAccount.fetch(pda);
    
//     console.log("---------------------------------------------------");
//     console.log("UPDATED ON-CHAIN DATA:");
//     console.log("Merkle Root (First 5 bytes):", acc.merkleRoot.slice(0, 5));
//     console.log("Events String:", acc.events);
//     console.log("Submitted At (Unix):", acc.submittedAt.toString());
//     console.log("---------------------------------------------------");

//   } catch (err: any) {
//     console.error("❌ Error submitting anchor:", err);
//     if (err.logs) {
//       console.error("Logs:", err.logs);
//     }
//   }
// }

// main().catch((e) => {
//   console.error(e);
//   process.exit(1);
// });