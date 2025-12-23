// import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
// import * as nodemailer from 'nodemailer';
// import Redis from 'ioredis';
// import { AnchorCompleted } from './dto/anchor-completed.dto';

// const DEFAULT_DEDUPE_TTL = 60 * 60; // seconds

// @Injectable()
// export class NotificationService implements OnModuleInit, OnModuleDestroy {
//   private kafka: Kafka;
//   private consumer: Consumer;
//   private transporter: nodemailer.Transporter;
//   private redis?: Redis;
//   private inMemSeen = new Map<string, number>();
//   private dedupeTtlSeconds: number;

//   constructor() {
//     const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
//     this.dedupeTtlSeconds = Number(process.env.DEDUPE_TTL || DEFAULT_DEDUPE_TTL);

//     // 1. Initialize Kafka
//     this.kafka = new Kafka({
//       clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
//       brokers,
//     });

//     this.consumer = this.kafka.consumer({
//       groupId: process.env.KAFKA_GROUP_ID || 'notification-group',
//     });

//     // 2. Initialize Gmail Transporter
//     // Note: You must use an App Password if 2FA is enabled on the Gmail account.
//     this.transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: process.env.GMAIL_USER, // e.g., 'your.email@gmail.com'
//         pass: process.env.GMAIL_APP_PASSWORD, // Generated App Password
//       },
//     });

//     // 3. Initialize Redis (Optional)
//     if (process.env.REDIS_URL) {
//       this.redis = new Redis(process.env.REDIS_URL);
//       this.redis.on('error', (e) => console.error('redis err', e));
//     }
//   }

//   async onModuleInit() {
//     await this.start();
//   }

//   async start() {
//     const topic = process.env.KAFKA_TOPIC || 'anchors.completed';
//     await this.consumer.connect();
//     await this.consumer.subscribe({ topic, fromBeginning: false });

//     console.log(`🚀 Notification Service subscribed to ${topic}`);

//     await this.consumer.run({
//       eachMessage: async (payload: EachMessagePayload) => {
//         const { message } = payload;
//         if (!message.value) return;
//         try {
//           const parsed = JSON.parse(message.value.toString()) as AnchorCompleted;
//           await this.process(parsed);
//         } catch (err) {
//           console.error('❌ Failed to parse anchor message', err);
//         }
//       },
//     });
//   }

//   private async seenBefore(key: string): Promise<boolean> {
//     if (this.redis) {
//       const s = await this.redis.get(key);
//       if (s) return true;
//       await this.redis.set(key, '1', 'EX', this.dedupeTtlSeconds);
//       return false;
//     } else {
//       const now = Date.now();
//       const expireAt = this.inMemSeen.get(key) || 0;
//       if (expireAt > now) return true;
//       this.inMemSeen.set(key, now + this.dedupeTtlSeconds * 1000);
//       // Prune memory occasionally
//       if (this.inMemSeen.size > 5000) {
//         const cutoff = Date.now();
//         for (const [k, v] of this.inMemSeen) {
//           if (v <= cutoff) this.inMemSeen.delete(k);
//         }
//       }
//       return false;
//     }
//   }

//   private async process(msg: AnchorCompleted) {
//     const dedupeKey = `notification:${msg.request_id}:${msg.tx_hash || 'no-tx'}`;
//     if (await this.seenBefore(dedupeKey)) {
//       console.debug('Duplicate notification suppressed', dedupeKey);
//       return;
//     }

//     // Prepare Notification Content
//     const statusUpper = msg.status.toUpperCase();
//     const subject = `[Alert] Anchor ${statusUpper}: ${msg.request_id}`;
    
//     // HTML Body for Email
//     const htmlBody = `
//       <h3>Anchor Processing Update: ${statusUpper}</h3>
//       <ul>
//         <li><strong>Request ID:</strong> ${msg.request_id}</li>
//         <li><strong>Status:</strong> ${msg.status}</li>
//         <li><strong>Merkle Root:</strong> ${msg.merkle_root}</li>
//         <li><strong>Tx Hash:</strong> <a href="https://etherscan.io/tx/${msg.tx_hash}">${msg.tx_hash || 'Pending'}</a></li>
//         <li><strong>Block Number:</strong> ${msg.block_number || 'Pending'}</li>
//         <li><strong>Submitted At:</strong> ${msg.submitted_at}</li>
//       </ul>
//       <p><em>System generated notification.</em></p>
//     `;

//     // Send via GMAIL
//     try {
//       const mailTo = process.env.NOTIFY_EMAIL_TO; 
      
//       if (process.env.GMAIL_USER && mailTo) {
//         await this.transporter.sendMail({
//           from: `"Anchor System" <${process.env.GMAIL_USER}>`,
//           to: mailTo,
//           subject,
//           html: htmlBody,
//         });
//         console.log(`📧 Gmail sent for ${msg.request_id}`);
//       } else {
//         console.warn('⚠️ Gmail credentials or Recipient email missing in .env');
//       }
//     } catch (err) {
//       console.error('❌ Email send failed', err);
//     }
//   }

//   async onModuleDestroy() {
//     try {
//       await this.consumer.disconnect();
//     } catch (e) {
//       console.warn('Consumer disconnect error', e);
//     }
//     if (this.redis) await this.redis.quit();
//   }
// }


import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import * as nodemailer from 'nodemailer';
import Redis from 'ioredis';
import { AnchorCompleted } from './dto/anchor-completed.dto';

const DEFAULT_DEDUPE_TTL = 60 * 60; // seconds

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;
  private transporter: nodemailer.Transporter;
  private redis?: Redis;
  private inMemSeen = new Map<string, number>();
  private dedupeTtlSeconds: number;

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    this.dedupeTtlSeconds = Number(process.env.DEDUPE_TTL || DEFAULT_DEDUPE_TTL);

    // 1. Initialize Kafka
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
      brokers,
    });

    this.consumer = this.kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || 'notification-group',
    });

    // 2. Initialize MailHog Transporter
    // MailHog listens on port 1025 by default for SMTP
    this.transporter = nodemailer.createTransport({
      host: '127.0.0.1',
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false, // MailHog does not use SSL
      ignoreTLS: true, // often helpful for local dev
      auth:
        process.env.SMTP_USER || process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });

    // 3. Initialize Redis (Optional)
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
      this.redis.on('error', (e) => console.error('redis err', e));
    }
  }
    

  // Automatically start consumer when module loads
  async onModuleInit() {
    await this.start();
  }

  async start() {
    const topic = process.env.KAFKA_TOPIC || 'anchors.completed';
    await this.consumer.connect();
    await this.consumer.subscribe({ topic, fromBeginning: false });

    console.log(`🚀 Notification Service subscribed to ${topic} (Emails -> MailHog)`);

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { message } = payload;
        if (!message.value) return;
        try {
          const parsed = JSON.parse(message.value.toString()) as AnchorCompleted;
          await this.process(parsed);
        } catch (err) {
          console.error('❌ Failed to parse anchor message', err);
        }
      },
    });
  }

  private async seenBefore(key: string): Promise<boolean> {
    if (this.redis) {
      const s = await this.redis.get(key);
      if (s) return true;
      await this.redis.set(key, '1', 'EX', this.dedupeTtlSeconds);
      return false;
    } else {
      const now = Date.now();
      const expireAt = this.inMemSeen.get(key) || 0;
      if (expireAt > now) return true;
      this.inMemSeen.set(key, now + this.dedupeTtlSeconds * 1000);
      
      // Cleanup old memory keys occasionally
      if (this.inMemSeen.size > 5000) {
        const cutoff = Date.now();
        for (const [k, v] of this.inMemSeen) {
          if (v <= cutoff) this.inMemSeen.delete(k);
        }
      }
      return false;
    }
  }

  private async process(msg: AnchorCompleted) {
    const dedupeKey = `notification:${msg.request_id}:${msg.tx_hash || 'no-tx'}`;
    if (await this.seenBefore(dedupeKey)) {
      console.debug('Duplicate notification suppressed', dedupeKey);
      return;
    }

    // Build Email Content
    const subject = `Anchor ${msg.status.toUpperCase()}: ${msg.request_id}`;
    const text = [
      `Request: ${msg.request_id}`,
      `Status: ${msg.status}`,
      `Merkle: ${msg.merkle_root}`,
      `Tx: ${msg.tx_hash || 'N/A'}`,
      `Block: ${msg.block_number || 'N/A'}`,
      `SubmittedAt: ${msg.submitted_at}`,
      `Submitter: ${msg.submitter || 'N/A'}`,
      `Events: ${JSON.stringify(msg.events || [])}`,
    ].join('\n');

    // Send to MailHog
    try {
      const mailFrom = process.env.EMAIL_FROM || 'ops@acme.com';
      const mailTo = process.env.NOTIFY_EMAIL_TO || 'admin@acme.com';
      
      await this.transporter.sendMail({
        from: mailFrom,
        to: mailTo,
        subject,
        text,
      });
      console.log(`📧 Email sent to MailHog for ${msg.request_id}`);
    } catch (err) {
      console.error('❌ Email send failed', err);
    }
  }

  // Graceful shutdown for module
  async onModuleDestroy(): Promise<void> {
    // 1) Disconnect Kafka consumer
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        console.log('Kafka consumer disconnected.');
      }
    } catch (e) {
      console.warn('Error disconnecting Kafka consumer:', e);
    }

    // 2) Quit Redis if present
    try {
      if (this.redis) {
        await this.redis.quit();
        console.log('Redis client quit.');
      }
    } catch (e) {
      console.warn('Error quitting Redis client:', e);
    }

    // 3) Close mail transporter (some transports expose close())
    try {
      const anyTransport = this.transporter as any;
      if (anyTransport && typeof anyTransport.close === 'function') {
        anyTransport.close();
        console.log('Mail transporter closed.');
      }
    } catch (e) {
      console.warn('Error closing mail transporter:', e);
    }
  }
}