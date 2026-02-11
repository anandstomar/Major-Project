import { Injectable, Logger } from '@nestjs/common';
import { EscrowClient } from './escrow.client';
import { PublicKey, Keypair } from '@solana/web3.js';
import { Kafka } from 'kafkajs';
import * as fs from 'fs';

@Injectable()
export class EscrowService {
  private readonly client: EscrowClient;
  private readonly logger = new Logger(EscrowService.name);
  private kafkaProducer: any;

  constructor() {
    this.client = new EscrowClient();

    const kafkaBrokers = (process.env.KAFKA_BOOTSTRAP || 'kafka:29092').split(',');
    const kafka = new Kafka({ brokers: kafkaBrokers });

    this.kafkaProducer = kafka.producer();
    this.kafkaProducer.connect().catch((err:any) => {
      this.logger.warn('Kafka producer connect failed: ' + err);
    });
  }

  async createEscrow(beneficiary: string, arbiter: string, amount: number) {
    const res = await this.client.initializeEscrow(new PublicKey(beneficiary), new PublicKey(arbiter), amount);
    this.logger.log('Escrow created: ' + JSON.stringify(res));

    // publish event to kafka so indexer & analytics pick it up
    const event = {
      escrow_id: res.escrowPda,
      initializer: this.client.provider.wallet.publicKey.toBase58(),
      beneficiary,
      arbiter,
      amount,
      tx_sig: res.tx,
      event_type: 'CREATED',
      timestamp: new Date().toISOString(),
    };

    try {
      await this.kafkaProducer.send({
        topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events',
        messages: [{ value: JSON.stringify(event) }],
      });
      this.logger.log('Published escrow.created event to Kafka');
    } catch (err) {
      this.logger.warn('Failed to send Kafka message: ' + err);
    }

    return event;
  }

  async releaseEscrow(escrowPdaStr: string, arbiterKeyPath: string) {
    const arbiterKey = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(arbiterKeyPath, 'utf8'))));
    const escrowPda = new PublicKey(escrowPdaStr);
    const tx = await this.client.release(escrowPda, arbiterKey);
    // publish event
    const event = { escrow_id: escrowPdaStr, event_type: 'RELEASED', tx_sig: tx, timestamp: new Date().toISOString() };
    await this.kafkaProducer.send({ topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events', messages: [{ value: JSON.stringify(event) }] });
    return { ok: true, tx };
  }

  async cancelEscrow(escrowPdaStr: string, initializerKeyPath: string) {
    const initKey = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(initializerKeyPath, 'utf8'))));
    const escrowPda = new PublicKey(escrowPdaStr);
    const tx = await this.client.cancel(escrowPda, initKey);
    const event = { escrow_id: escrowPdaStr, event_type: 'CANCELLED', tx_sig: tx, timestamp: new Date().toISOString() };
    await this.kafkaProducer.send({ topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events', messages: [{ value: JSON.stringify(event) }] });
    return { ok: true, tx };
  }
}
