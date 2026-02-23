import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EscrowClient } from './escrow.client';
import { PublicKey, Keypair } from '@solana/web3.js';
import { Kafka } from 'kafkajs';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

@Injectable()
export class EscrowService implements OnModuleInit {
  private readonly client: EscrowClient;
  private readonly logger = new Logger(EscrowService.name);
  private kafkaProducer: any;
  private kafkaConsumer: any;

  constructor(private prisma: PrismaService) {
    this.client = new EscrowClient();

    const kafkaBrokers = (process.env.KAFKA_BOOTSTRAP || 'kafka:29092').split(',');
    const kafka = new Kafka({ brokers: kafkaBrokers });

    this.kafkaProducer = kafka.producer();
    this.kafkaConsumer = kafka.consumer({ groupId: 'escrow-indexer-group' });
  }

  async onModuleInit() {
    await this.kafkaProducer.connect();
    await this.kafkaConsumer.connect();
    
    await this.kafkaConsumer.subscribe({ topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events', fromBeginning: true });
    
    await this.kafkaConsumer.run({
      eachMessage: async ({ message }: { message: any }) => {
        if (!message.value) return;
        const event = JSON.parse(message.value.toString());
        await this.handleKafkaEvent(event);
      },
    });
  }

  private async handleKafkaEvent(event: any) {
    if (event.event_type === 'CREATED') {
      await this.prisma.escrow.upsert({
        where: { escrowId: event.escrow_id },
        update: {},
        create: {
          escrowId: event.escrow_id,
          initializer: event.initializer,
          beneficiary: event.beneficiary,
          arbiter: event.arbiter,
          amount: event.amount,
          txSig: event.tx_sig,
          status: 'active'
        }
      });
    } 
    else if (['RELEASED', 'CANCELLED', 'DISPUTED'].includes(event.event_type)) {
      await this.prisma.escrow.update({
        where: { escrowId: event.escrow_id },
        data: { 
          status: event.event_type.toLowerCase(), 
          ...(event.tx_sig ? { txSig: event.tx_sig } : {})
        }
      });
    }
  }

  async findAll() {
    return this.prisma.escrow.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    return this.prisma.escrow.findUnique({ where: { escrowId: id } });
  }

  async createEscrow(beneficiary: string, arbiter: string, amount: number) {
    const res = await this.client.initializeEscrow(new PublicKey(beneficiary), new PublicKey(arbiter), amount);
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
    await this.kafkaProducer.send({ topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events', messages: [{ value: JSON.stringify(event) }] });
    return event;
  }

  // 👇 Re-added releaseEscrow
  async releaseEscrow(escrowPdaStr: string, arbiterKeyPath: string) {
    const arbiterKey = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(arbiterKeyPath, 'utf8'))));
    const escrowPda = new PublicKey(escrowPdaStr);
    const tx = await this.client.release(escrowPda, arbiterKey);
    
    const event = { escrow_id: escrowPdaStr, event_type: 'RELEASED', tx_sig: tx, timestamp: new Date().toISOString() };
    await this.kafkaProducer.send({ topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events', messages: [{ value: JSON.stringify(event) }] });
    return { ok: true, tx };
  }

  async raiseDispute(escrowPdaStr: string) {
    const event = { escrow_id: escrowPdaStr, event_type: 'DISPUTED', timestamp: new Date().toISOString() };
    await this.kafkaProducer.send({ topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events', messages: [{ value: JSON.stringify(event) }] });
    return { ok: true };
  }

  async notifyParties(escrowPdaStr: string) {
    this.logger.log(`Notification sent for ${escrowPdaStr}`);
    return { ok: true };
  }

  async syncEscrowStatus(escrowPdaStr: string, status: string, txSig: string) {
    const event = { 
      escrow_id: escrowPdaStr, 
      event_type: status.toUpperCase(), // Will be 'RELEASED'
      tx_sig: txSig, 
      timestamp: new Date().toISOString() 
    };
    
    await this.kafkaProducer.send({ 
      topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events', 
      messages: [{ value: JSON.stringify(event) }] 
    });
    
    return { ok: true };
  }
}







// import { Injectable, Logger } from '@nestjs/common';
// import { EscrowClient } from './escrow.client';
// import { PublicKey, Keypair } from '@solana/web3.js';
// import { Kafka } from 'kafkajs';
// import * as fs from 'fs';

// @Injectable()
// export class EscrowService {
//   private readonly client: EscrowClient;
//   private readonly logger = new Logger(EscrowService.name);
//   private kafkaProducer: any;

//   constructor() {
//     this.client = new EscrowClient();

//     const kafkaBrokers = (process.env.KAFKA_BOOTSTRAP || 'kafka:29092').split(',');
//     const kafka = new Kafka({ brokers: kafkaBrokers });

//     this.kafkaProducer = kafka.producer();
//     this.kafkaProducer.connect().catch((err:any) => {
//       this.logger.warn('Kafka producer connect failed: ' + err);
//     });
//   }

//   async createEscrow(beneficiary: string, arbiter: string, amount: number) {
//     const res = await this.client.initializeEscrow(new PublicKey(beneficiary), new PublicKey(arbiter), amount);
//     this.logger.log('Escrow created: ' + JSON.stringify(res));

//     // publish event to kafka so indexer & analytics pick it up
//     const event = {
//       escrow_id: res.escrowPda,
//       initializer: this.client.provider.wallet.publicKey.toBase58(),
//       beneficiary,
//       arbiter,
//       amount,
//       tx_sig: res.tx,
//       event_type: 'CREATED',
//       timestamp: new Date().toISOString(),
//     };

//     try {
//       await this.kafkaProducer.send({
//         topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events',
//         messages: [{ value: JSON.stringify(event) }],
//       });
//       this.logger.log('Published escrow.created event to Kafka');
//     } catch (err) {
//       this.logger.warn('Failed to send Kafka message: ' + err);
//     }

//     return event;
//   }

//   async releaseEscrow(escrowPdaStr: string, arbiterKeyPath: string) {
//     const arbiterKey = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(arbiterKeyPath, 'utf8'))));
//     const escrowPda = new PublicKey(escrowPdaStr);
//     const tx = await this.client.release(escrowPda, arbiterKey);
//     // publish event
//     const event = { escrow_id: escrowPdaStr, event_type: 'RELEASED', tx_sig: tx, timestamp: new Date().toISOString() };
//     await this.kafkaProducer.send({ topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events', messages: [{ value: JSON.stringify(event) }] });
//     return { ok: true, tx };
//   }

//   async cancelEscrow(escrowPdaStr: string, initializerKeyPath: string) {
//     const initKey = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(initializerKeyPath, 'utf8'))));
//     const escrowPda = new PublicKey(escrowPdaStr);
//     const tx = await this.client.cancel(escrowPda, initKey);
//     const event = { escrow_id: escrowPdaStr, event_type: 'CANCELLED', tx_sig: tx, timestamp: new Date().toISOString() };
//     await this.kafkaProducer.send({ topic: process.env.KAFKA_ESCROW_TOPIC || 'escrow.events', messages: [{ value: JSON.stringify(event) }] });
//     return { ok: true, tx };
//   }
// }
