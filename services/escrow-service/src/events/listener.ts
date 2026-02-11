import { Injectable, Logger } from '@nestjs/common';
//import * as anchor from '@project-serum/anchor';
import * as anchor from "@coral-xyz/anchor"
import * as fs from 'fs';

@Injectable()
export class EventsListener {
  private readonly logger = new Logger(EventsListener.name);
  private conn!: anchor.web3.Connection;
  private programId: anchor.web3.PublicKey | null = null;

  constructor() {
    try {
      const rpc = process.env.SOLANA_RPC || 'http://localhost:8899';
      this.conn = new anchor.web3.Connection(rpc, 'confirmed');
      const pid = process.env.ESCROW_PROGRAM_ID;
      if (pid) {
        this.programId = new anchor.web3.PublicKey(pid);
        this.subscribeProgramLogs();
      } else {
        this.logger.warn('ESCROW_PROGRAM_ID not set; event listener disabled');
      }
    } catch (err) {
      this.logger.error('Failed to initialize event listener: ' + err);
    }
  }

  private subscribeProgramLogs() {
    if (!this.programId) return;
    this.conn.onLogs(this.programId, (logs, ctx) => {
      this.logger.log(`Program log: signature=${logs.signature} logs=${JSON.stringify(logs.logs)}`);
      // TODO: parse logs or fetch transaction account info, then push to Kafka
    }, 'confirmed');
    this.logger.log(`Subscribed to logs for program ${this.programId.toBase58()}`);
  }
}
