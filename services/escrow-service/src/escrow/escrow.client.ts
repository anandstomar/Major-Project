import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const IDL_PATH = process.env.ESCROW_IDL_PATH || path.join(__dirname, "../../../../programs/escrow-program/target/idl/escrow.json");
const PROGRAM_ID = new PublicKey("9ttJXA6WENpW6ipHvnvYeix9mbbMnDYQcH42DWxx5nRo");

function loadKeypairFromFile(p: string): Keypair {
  const raw = fs.readFileSync(p, "utf8");
  const arr = JSON.parse(raw);
  return Keypair.fromSecretKey(new Uint8Array(arr));
}

export class EscrowClient {
  provider: anchor.AnchorProvider;
  program: anchor.Program;
  walletKeypair: Keypair; // Store the keypair to sign token transactions

  constructor() {
    const walletPath = process.env.WALLET_KEYPATH || `${process.env.HOME}/.config/solana/id.json`;
    this.walletKeypair = loadKeypairFromFile(walletPath);
    
    const conn = new anchor.web3.Connection(process.env.SOLANA_RPC || "http://127.0.0.1:8899", "confirmed");
    const wallet = new anchor.Wallet(this.walletKeypair);
    this.provider = new anchor.AnchorProvider(conn, wallet, {});
    anchor.setProvider(this.provider);

    const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
    // Overwrite address to ensure it matches
    idl.address = PROGRAM_ID.toBase58();
    this.program = new anchor.Program(idl, this.provider);
  }

  async initializeEscrow(beneficiary: PublicKey, arbiter: PublicKey, amount: number) {
    const initializer = this.provider.wallet.publicKey;
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), initializer.toBuffer(), beneficiary.toBuffer()],
      this.program.programId
    );

    console.log("DEBUG: Creating dummy Mint and Token Account for testing...");
    
    // 1. Create a dummy Mint
    const mint = await createMint(
      this.provider.connection,
      this.walletKeypair, // Payer
      initializer,        // Mint Authority
      null,               // Freeze Authority
      6                   // Decimals
    );

    // 2. Create a Token Account for the initializer
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      this.provider.connection,
      this.walletKeypair,
      mint,
      initializer
    );

    console.log("DEBUG: Created Token Account:", tokenAccount.address.toBase58());

    // 3. Mint some tokens to it (so the user actually has balance)
    await mintTo(
      this.provider.connection,
      this.walletKeypair,
      mint,
      tokenAccount.address,
      this.walletKeypair,
      1000 // Mint 1000 tokens
    );

    // 4. Call the program with the REAL token account
    const tx = await (this.program.methods as any)
      .initializeEscrow(new anchor.BN(123), new anchor.BN(amount))
      .accounts({
        escrowAccount: escrowPda,
        initializer: initializer,
        beneficiary: beneficiary,
        arbiter: arbiter,
        initializerTokenAccount: tokenAccount.address, // <--- NOW A VALID TOKEN ACCOUNT
        mint: mint,                                    // <--- NOW A VALID MINT
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return { tx, escrowPda: escrowPda.toBase58() };
  }

  async release(escrowPda: PublicKey, arbiterKeypair: Keypair) {
    const tx = await (this.program.methods as any)
      .release()
      .accounts({
        escrowAccount: escrowPda,
        escrowPda: escrowPda,
        escrowTokenAccount: PublicKey.default,
        beneficiaryTokenAccount: PublicKey.default,
        tokenProgram: TOKEN_PROGRAM_ID,
        arbiter: arbiterKeypair.publicKey,
      })
      .signers([arbiterKeypair])
      .rpc();
    return tx;
  }

  async cancel(escrowPda: PublicKey, initializerKeypair: Keypair) {
    const tx = await (this.program.methods as any)
      .cancel()
      .accounts({
        escrowAccount: escrowPda,
        escrowPda: escrowPda,
        escrowTokenAccount: PublicKey.default,
        initializerTokenAccount: PublicKey.default,
        tokenProgram: TOKEN_PROGRAM_ID,
        initializer: initializerKeypair.publicKey,
      })
      .signers([initializerKeypair])
      .rpc();
    return tx;
  }
}




// //import * as anchor from "@project-serum/anchor";
// import * as anchor from "@coral-xyz/anchor"
// import fs from "fs";
// import path from "path";
// import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

// // const IDL_PATH = process.env.ESCROW_IDL_PATH || path.join(__dirname, "../../programs/escrow-program/target/idl/escrow.json");
// // const PROGRAM_ID = new PublicKey(process.env.ESCROW_PROGRAM_ID || "Escrow1111111111111111111111111111111111");
// const IDL_PATH = process.env.ESCROW_IDL_PATH || path.join(__dirname, "../../../../programs/escrow-program/target/idl/escrow.json");
// //const PROGRAM_ID = new PublicKey(process.env.ESCROW_PROGRAM_ID || "9ttJXA6WENpW6ipHvnvYeix9mbbMnDYQcH42DWxx5nRo");
// const PROGRAM_ID = new PublicKey("9ttJXA6WENpW6ipHvnvYeix9mbbMnDYQcH42DWxx5nRo");

// function loadKeypairFromFile(p: string): Keypair {
//   const raw = fs.readFileSync(p, "utf8");
//   const arr = JSON.parse(raw);
//   return Keypair.fromSecretKey(new Uint8Array(arr));
// }

// export class EscrowClient {
//   provider: anchor.AnchorProvider;
//   program: anchor.Program;

//   constructor() {
//     const walletPath = process.env.WALLET_KEYPATH || `${process.env.HOME}/.config/solana/id.json`;
//     const walletKP = loadKeypairFromFile(walletPath);
//     const conn = new anchor.web3.Connection(process.env.SOLANA_RPC || "http://localhost:8899", "confirmed");
//     const wallet = new anchor.Wallet(walletKP as any);
//     this.provider = new anchor.AnchorProvider(conn, wallet, {});
//     anchor.setProvider(this.provider);

//     console.log("---------------------------------------------------");
//     console.log("DEBUG: Connecting to RPC:", process.env.SOLANA_RPC || "http://127.0.0.1:8899");
//     console.log("DEBUG: Using Program ID:", PROGRAM_ID.toBase58());
//     console.log("DEBUG: Wallet Public Key:", this.provider.wallet.publicKey.toBase58());
//     console.log("---------------------------------------------------");

//     const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
//     this.program = new anchor.Program(idl, this.provider);
//   }

//   async initializeEscrow(beneficiary: PublicKey, arbiter: PublicKey, amount: number) {
//     const initializer = this.provider.wallet.publicKey;
//     const [escrowPda, bump] = await PublicKey.findProgramAddress(
//       [Buffer.from("escrow"), initializer.toBuffer(), beneficiary.toBuffer()],
//       this.program.programId
//     );

//     // Note: For production you will create or pass SPL token accounts etc.
//     const tx = await this.program.rpc.initializeEscrow(bump, new anchor.BN(amount), {
//       accounts: {
//         escrowAccount: escrowPda,
//         initializer: initializer,
//         beneficiary: beneficiary,
//         arbiter: arbiter,
//         initializerTokenAccount: initializer, // placeholder
//         mint: anchor.web3.PublicKey.default, // placeholder
//         systemProgram: SystemProgram.programId,
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//         tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
//       },
//     });

//     return { tx, escrowPda: escrowPda.toBase58() };
//   }

//   async release(escrowPda: PublicKey, arbiterKeypair: Keypair) {
//     // This is a placeholder: in real code you need to pass token accounts and sign as arbiter
//     const tx = await this.program.rpc.release({
//       accounts: {
//         escrowAccount: escrowPda,
//         escrowPda: escrowPda,
//         escrowTokenAccount: anchor.web3.PublicKey.default,
//         beneficiaryTokenAccount: anchor.web3.PublicKey.default,
//         tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
//         arbiter: arbiterKeypair.publicKey,
//       },
//       signers: [arbiterKeypair],
//     } as any);
//     return tx;
//   }

//   async cancel(escrowPda: PublicKey, initializerKeypair: Keypair) {
//     const tx = await this.program.rpc.cancel({
//       accounts: {
//         escrowAccount: escrowPda,
//         escrowPda: escrowPda,
//         escrowTokenAccount: anchor.web3.PublicKey.default,
//         initializerTokenAccount: anchor.web3.PublicKey.default,
//         tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
//         initializer: initializerKeypair.publicKey,
//       },
//       signers: [initializerKeypair],
//     } as any);
//     return tx;
//   }
// }
