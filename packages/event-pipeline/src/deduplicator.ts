import type { Redis } from 'ioredis';
import { LiveEventEnvelope } from '@aep/event-model';
import { Logger } from '@aep/shared';
import crypto from 'crypto';

export class DeduplicationGate {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, number>();
  private ttlSeconds: number;
  private logger = new Logger('DeduplicationGate');
  private duplicateCount = 0;

  constructor(redisClient?: Redis | null, ttlSeconds = 300) {
    this.redis = redisClient || null;
    this.ttlSeconds = ttlSeconds;

    // Periodic cleanup of in-memory fallback cache
    setInterval(() => this.cleanMemoryCache(), 60000);
  }

  get duplicatesDetected(): number {
    return this.duplicateCount;
  }

  computeDeduplicationKey(event: LiveEventEnvelope): string {
    if (event.providerTransactionId) {
      return `dedup:${event.provider}:tx:${event.providerTransactionId}`;
    }
    if (event.providerEventId) {
      return `dedup:${event.provider}:ev:${event.providerEventId}`;
    }

    // Fallback deterministic content hash
    const content = `${event.eventType}:${event.streamerId}:${event.user?.userId || ''}:${event.timestampUtc}:${JSON.stringify(event.payload)}`;
    const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 24);
    return `dedup:${event.provider}:hash:${hash}`;
  }

  /**
   * Returns true if event is UNIQUE (not seen before).
   * Returns false if event is a DUPLICATE and should be dropped.
   */
  async isUnique(event: LiveEventEnvelope): Promise<boolean> {
    const key = this.computeDeduplicationKey(event);

    if (this.redis && this.redis.status === 'ready') {
      try {
        const result = await this.redis.set(key, '1', 'EX', this.ttlSeconds, 'NX');
        const isNew = result === 'OK';
        if (!isNew) {
          this.duplicateCount++;
          this.logger.debug(`Dropped duplicate event via Redis: ${key}`);
        }
        return isNew;
      } catch (err: any) {
        this.logger.warn(`Redis dedup check failed, falling back to memory: ${err.message}`);
      }
    }

    // Fallback in-memory check
    const now = Date.now();
    const expiry = this.memoryCache.get(key);
    if (expiry && expiry > now) {
      this.duplicateCount++;
      this.logger.debug(`Dropped duplicate event via MemoryCache: ${key}`);
      return false;
    }

    this.memoryCache.set(key, now + this.ttlSeconds * 1000);
    return true;
  }

  private cleanMemoryCache() {
    const now = Date.now();
    for (const [key, exp] of this.memoryCache.entries()) {
      if (exp <= now) {
        this.memoryCache.delete(key);
      }
    }
  }
}
