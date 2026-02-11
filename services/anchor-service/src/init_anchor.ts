// init_anchor_with_logs.ts
import * as anchor from "@project-serum/anchor";
import fs from "fs";
import path from "path";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../../../programs/anchor_program/target/idl/anchor_program.json";

const PROGRAM_ID = new PublicKey("4wa3xzTQK88UeEKBNoN1NxEU6dTjak6qYR8N7VDdLyz3");
const RPC = "https://api.devnet.solana.com";
const KEYPAIR_PATH = process.env.SOLANA_FEE_PAYER_PATH || path.join(process.cwd(), "./dev-fee-payer.json");

function loadKeypair(p: string): Keypair {
  if (!fs.existsSync(p)) throw new Error(`Keypair file not found: ${p}`);
  const secret = JSON.parse(fs.readFileSync(p, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function main() {
  const payer = loadKeypair(KEYPAIR_PATH);
  const payerPublicKey = payer.publicKey;
  console.log("Payer PublicKey object:", payerPublicKey.toBase58());
  const wallet = new anchor.Wallet(payer);
  const connection = new anchor.web3.Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as any, PROGRAM_ID, provider);

  const requestId = "req123";
  const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from("anchor"), Buffer.from(requestId)], PROGRAM_ID);

  console.log("PROGRAM_ID:", PROGRAM_ID.toBase58());
  console.log("Using payer:", provider.wallet.publicKey.toBase58());
  console.log("Computed PDA:", pda.toBase58(), "bump:", bump);

  // rent / balance
  const space = 8 + 4 + requestId.length + 32 + 32 + 8 + 4 + 256;
  const rent = await connection.getMinimumBalanceForRentExemption(space);
  console.log("space:", space, "rent:", rent);

  const bal = await connection.getBalance(provider.wallet.publicKey);
  console.log("balance (SOL):", bal / anchor.web3.LAMPORTS_PER_SOL);
//   if (bal < 0.1 * anchor.web3.LAMPORTS_PER_SOL) {
//     console.log("Airdropping 1 SOL...");
//     const sig = await connection.requestAirdrop(provider.wallet.publicKey, anchor.web3.LAMPORTS_PER_SOL);
//     await connection.confirmTransaction(sig, "confirmed");
//     console.log("Airdrop done");
//   }
if (bal < 0.01 * anchor.web3.LAMPORTS_PER_SOL) {
  throw new Error(
    "Wallet has insufficient SOL. Fund it manually using `solana airdrop`."
  );
}


  try {
    console.log("Calling initAnchor via program.methods (this will include provider wallet as signer) ...");
    const txSig = await program.methods
      .initAnchor(requestId)
      .accounts({
        anchorAccount: pda,
        submitter: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      // If your payer is not the provider wallet, uncomment the next line to explicitly include signers:
      // .signers([payer])
      .rpc();
    console.log("initAnchor txSig:", txSig);

    // fetch the transaction with logs
    const tx = await connection.getTransaction(txSig, { commitment: "confirmed" });
    console.log("tx found:", !!tx);
    if (tx && tx.meta) {
      console.log("meta.err:", tx.meta.err);
      console.log("logMessages:");
      (tx.meta.logMessages || []).forEach((l) => console.log("  ", l));
    } else {
      console.log("No tx meta or logs available.");
    }

  } catch (err: any) {
    console.error("Transaction send failed (caught SendTransactionError). Inspecting available logs/fields...");
    // web3 SendTransactionError may have helper methods/fields; print everything we can
    console.error("error.toString():", err.toString?.() ?? err);
    if (err.logs) console.error("err.logs:", err.logs);
    if (err.getLogs) {
      try {
        const got = await err.getLogs(provider.connection); // some versions of web3.js provide this helper
        console.error("err.getLogs():", got);
      } catch (e) {
        console.error("err.getLogs() failed:", e);
      }
    }
    // As fallback, simulate the instruction to get logs (Anchor helper)
    try {
      console.log("Attempting connection.simulateTransaction to get logs...");
      // Build partial instruction using program.instruction (lower-level) so we can simulate.
      // Note: if simulation fails to construct, it will throw.
      const ix = await program.instruction.initAnchor(requestId, {
        accounts: {
          anchorAccount: pda,
          submitter: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      });
      const txb = new anchor.web3.Transaction().add(ix);
      txb.feePayer = provider.wallet.publicKey;
      txb.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
      txb.sign(payer); // sign with payer so simulateTransaction knows signers
      const sim = await connection.simulateTransaction(txb);
      console.log("simulateTransaction result:", JSON.stringify(sim, null, 2));
      if (sim.value && sim.value.logs) {
        console.log("Sim logs:");
        sim.value.logs.forEach((l: string) => console.log("  ", l));
      }
    } catch (simErr: any) {
      console.error("simulateTransaction failed:", simErr?.toString?.() ?? simErr);
    }

    process.exit(1);
  }
 
  try {
    const acc = await program.account.anchorAccount.fetch(pda);
    console.log("Fetched AnchorAccount:", acc);
  } catch (e) {
    console.warn("Could not fetch anchor account via Anchor; raw getAccountInfo next...");
    const raw = await connection.getAccountInfo(pda, "confirmed");
    console.log("raw account:", raw);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
