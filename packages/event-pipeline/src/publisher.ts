import type { Redis } from 'ioredis';
import { LiveEventEnvelope } from '@aep/event-model';
import { Logger } from '@aep/shared';

export type EventSubscriber = (event: LiveEventEnvelope) => Promise<void> | void;

export class EventStreamPublisher {
  private redis: Redis | null = null;
  private inMemorySubscribers: EventSubscriber[] = [];
  private logger = new Logger('EventStreamPublisher');
  private streamName: string;

  constructor(redisClient?: Redis | null, streamName = 'stream:events:raw') {
    this.redis = redisClient || null;
    this.streamName = streamName;
  }

  subscribeInMemory(sub: EventSubscriber) {
    this.inMemorySubscribers.push(sub);
  }

  async publish(event: LiveEventEnvelope): Promise<void> {
    const serialized = JSON.stringify(event);

    // Publish to Redis Stream if available
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.xadd(
          this.streamName,
          '*',
          'eventId', event.id,
          'streamerId', event.streamerId,
          'type', event.eventType,
          'payload', serialized
        );
      } catch (err: any) {
        this.logger.error(`Redis XADD error: ${err.message}`);
      }
    }

    // Always dispatch to in-memory subscribers (worker or socket gateway in same process)
    for (const sub of this.inMemorySubscribers) {
      try {
        await sub(event);
      } catch (err: any) {
        this.logger.error(`Error in in-memory subscriber: ${err.message}`);
      }
    }
  }
}
