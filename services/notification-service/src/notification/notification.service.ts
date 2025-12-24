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
    // FIX 1: Use variable for Kafka Brokers
    const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'localhost:9092').split(',');
    this.dedupeTtlSeconds = Number(process.env.DEDUPE_TTL || DEFAULT_DEDUPE_TTL);

    console.log(`[Notify] Connecting to Kafka at: ${brokers}`);
    
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
      brokers,
    });

    this.consumer = this.kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || 'notification-group',
    });

    // FIX 2: Use variable for SMTP Host (MailHog)
    // Default to 'mailhog' if not set, fallback to localhost for local dev
    const smtpHost = process.env.SMTP_HOST || 'localhost'; 
    const smtpPort = Number(process.env.SMTP_PORT || 1025);
    
    console.log(`[Notify] Connecting to MailHog at: ${smtpHost}:${smtpPort}`);

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      ignoreTLS: true,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });

    // FIX 3: Initialize Redis with robust URL check
    // If REDIS_URL is provided, use it. Otherwise, build it from HOST/PORT.
    const redisUrl = process.env.REDIS_URL || 
                     (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);

    if (redisUrl) {
      console.log(`[Notify] Connecting to Redis at: ${redisUrl}`);
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (e) => console.error('redis err', e));
    } else {
        console.warn('[Notify] No Redis URL found, using in-memory deduplication');
    }
  }
    
  // ... (Keep the rest of your methods: onModuleInit, start, seenBefore, process, onModuleDestroy) ...
  // ... (Paste the rest of your existing code here) ...

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