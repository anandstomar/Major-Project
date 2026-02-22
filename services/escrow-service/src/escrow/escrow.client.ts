import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const IDL_PATH = process.env.ESCROW_IDL_PATH || path.join(__dirname, "./escrow.json");
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
  
    console.log("DEBUG: Checking SOL balance for fees...");
    const balance = await this.provider.connection.getBalance(this.walletKeypair.publicKey);
    
    if (balance < 0.5 * anchor.web3.LAMPORTS_PER_SOL) {
      console.log("DEBUG: Low balance detected. Requesting Airdrop from faucet...");
      const airdropSig = await this.provider.connection.requestAirdrop(
        this.walletKeypair.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL // Request 2 SOL
      );
      
      const latestBlockHash = await this.provider.connection.getLatestBlockhash();
      await this.provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropSig,
      });
      console.log("DEBUG: Airdrop successful!");
    }
    
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
      initializer,
      true
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
    console.log(`DEBUG: Fetching on-chain state for Escrow: ${escrowPda.toBase58()}`);
    // 1. Fetch the on-chain Escrow state to get the exact amount and beneficiary
    const escrowState = await (this.program.account as any).escrowAccount.fetch(escrowPda);
    const beneficiary = escrowState.beneficiary as PublicKey;
    const amount = (escrowState.amount as anchor.BN).toNumber();

    console.log("DEBUG: Creating dummy tokens for release transfer...");
    // 2. Create a dummy mint to satisfy the token transfer requirement
    const mint = await createMint(
      this.provider.connection,
      arbiterKeypair, // Payer
      arbiterKeypair.publicKey, // Mint Authority
      null, 6
    );

    // 3. Create a Token Account for the Escrow PDA and fund it so it has balance to send
    const escrowTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.provider.connection,
      arbiterKeypair,
      mint,
      escrowPda,
      true // allowOwnerOffCurve = true (Required for PDAs!)
    );

    await mintTo(
      this.provider.connection,
      arbiterKeypair,
      mint,
      escrowTokenAccount.address,
      arbiterKeypair,
      amount // Mint exactly what needs to be released
    );

    // 4. Create a Token Account for the Beneficiary to receive the funds
    const beneficiaryTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.provider.connection,
      arbiterKeypair,
      mint,
      beneficiary,
      true
    );

    console.log("DEBUG: Executing release instruction...");
    // 5. Call the actual release instruction
    const tx = await (this.program.methods as any)
      .release()
      .accounts({
        escrowAccount: escrowPda,
        escrowPda: escrowPda,
        escrowTokenAccount: escrowTokenAccount.address,
        beneficiaryTokenAccount: beneficiaryTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        arbiter: arbiterKeypair.publicKey,
      })
      .signers([arbiterKeypair])
      .rpc();
      
    return tx;
  }

  async cancel(escrowPda: PublicKey, initializerKeypair: Keypair) {
    console.log(`DEBUG: Fetching on-chain state for Escrow: ${escrowPda.toBase58()}`);
    const escrowState = await (this.program.account as any).escrowAccount.fetch(escrowPda);
    const amount = (escrowState.amount as anchor.BN).toNumber();

    const mint = await createMint(this.provider.connection, initializerKeypair, initializerKeypair.publicKey, null, 6);
    
    const escrowTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.provider.connection, initializerKeypair, mint, escrowPda, true
    );
    
    await mintTo(this.provider.connection, initializerKeypair, mint, escrowTokenAccount.address, initializerKeypair, amount);

    const initializerTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.provider.connection, initializerKeypair, mint, initializerKeypair.publicKey
    );

    const tx = await (this.program.methods as any)
      .cancel()
      .accounts({
        escrowAccount: escrowPda,
        escrowPda: escrowPda,
        escrowTokenAccount: escrowTokenAccount.address,
        initializerTokenAccount: initializerTokenAccount.address,
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
