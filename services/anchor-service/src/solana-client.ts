import * as anchor from '@project-serum/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const RPC = process.env.SOLANA_RPC || 'http://localhost:8899';
const PROGRAM_ID = process.env.SOLANA_PROGRAM_ID || 'Fb7znUeRhH1pHHRd5cNtwTxFqL9AheKvDmU1MR4AZ5tq';
if (!PROGRAM_ID) throw new Error('SOLANA_PROGRAM_ID environment variable is required');
const KEYPAIR_PATH = process.env.SOLANA_FEE_PAYER_PATH || 'dev-fee-payer.json';
const IDL_PATH = process.env.SOLANA_IDL_PATH || path.resolve(__dirname, 'anchor_program.json');

export class SolanaClient {
  provider: anchor.AnchorProvider;
  program: anchor.Program;

  constructor() {
    const conn = new Connection(RPC, 'confirmed');
    const secret = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'));
    const payer = Keypair.fromSecretKey(Uint8Array.from(secret));
    const wallet = new anchor.Wallet(payer);
    this.provider = new anchor.AnchorProvider(conn, wallet, anchor.AnchorProvider.defaultOptions());
    const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'));
    this.program = new anchor.Program(idl, new PublicKey(PROGRAM_ID!), this.provider);
  }

  private getSolanaId(requestId: string): string {
    let formatted = requestId.replace(/^req-/, '').replace(/-/g, '');
    if (formatted.length > 32) formatted = formatted.slice(0, 32);
    return formatted;
  }

  async ensureInit(requestId: string) {
    // attempt to init if account absent
    const [pda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("anchor"), Buffer.from(requestId)],
      this.program.programId
    );
    try {
      console.log("Checking if PDA exists:", pda.toBase58());
      await this.program.account.anchorAccount.fetch(pda);
      return pda;
    } catch {
      const tx = await this.program.rpc.initAnchor(requestId, {
        accounts: {
          anchorAccount: pda,
          submitter: this.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: []
      });
      return pda;
    }
  }

  async submit(requestId: string, merkleHex: string, events: string[]) {
    const merkleBuf = Buffer.from(merkleHex.replace(/^0x/, ''), 'hex');
    if (merkleBuf.length !== 32) throw new Error('merkle root 32 bytes required');

    const solanaId = this.getSolanaId(requestId);

    const [pda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("anchor"), Buffer.from(solanaId)],
      this.program.programId
    );

    // ensure initialised
    try { await this.program.account.anchorAccount.fetch(pda); } catch {
      await this.program.rpc.initAnchor(solanaId, {
        accounts: {
          anchorAccount: pda,
          submitter: this.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        }
      });
    }

    const txSig = await this.program.rpc.submitAnchor(
      Array.from(merkleBuf),
      JSON.stringify(events || []),
      {
        accounts: {
          anchorAccount: pda,
          submitter: this.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        }
      }
    );

    return { signature: txSig, pda: pda.toBase58() };
  }
}



