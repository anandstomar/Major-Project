import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { EmailService } from './email.service'; // 👈 Import the helper

const DEFAULT_DEDUPE_TTL = 60 * 60; // 1 hour

@Injectable()
export class NotificationService {
  private alertRules: any[] = [];
  private redis?: Redis;
  private inMemSeen = new Map<string, number>();
  private recentActivity: any[] = []; // Real-time feed buffer

  constructor(private readonly emailService: EmailService) {
    // Redis Setup
    const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:6379` : null);
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (e) => console.error('Redis Error:', e));
    }
  }

  // Called by the Controller when a Kafka message arrives
  async processAnchorEvent(msg: any) {
    const dedupeKey = `notify:${msg.request_id}:${msg.tx_hash || 'pending'}`;
    
    // 1. Check Deduplication
    if (await this.isDuplicate(dedupeKey)) return;

    // 2. Add to Real-time Feed (For React Dashboard)
    this.addToFeed(msg);

    // 3. Delegate Email Sending to the EmailService
    await this.emailService.sendAnchorNotification(msg);
  }

  private addToFeed(msg: any) {
    const notification = {
      id: msg.request_id,
      type: (msg.status === 'completed' || msg.status === 'OK') ? 'success' : 'warning',
      title: `Batch Anchored`,
      description: `Request ${msg.request_id} confirmed on-chain.`,
      timestamp: new Date().toISOString()
    };
    
    this.recentActivity.unshift(notification);
    if (this.recentActivity.length > 100) this.recentActivity.pop();
  }

  // Deduplication Logic
  private async isDuplicate(key: string): Promise<boolean> {
    const ttl = Number(process.env.DEDUPE_TTL) || DEFAULT_DEDUPE_TTL;
    
    if (this.redis) {
      const exists = await this.redis.get(key);
      if (exists) return true;
      await this.redis.set(key, '1', 'EX', ttl);
      return false;
    } else {
      const now = Date.now();
      if ((this.inMemSeen.get(key) || 0) > now) return true;
      this.inMemSeen.set(key, now + ttl * 1000);
      return false;
    }
  }

  // Getters for Controller
  getFeed() { return this.recentActivity; }
  getRules() { return this.alertRules; }
  createRule(rule: any) { this.alertRules.push({ ...rule, id: Date.now() }); return rule; }
  deleteRule(id: number) { this.alertRules = this.alertRules.filter(r => r.id !== id); return { success: true }; }
}