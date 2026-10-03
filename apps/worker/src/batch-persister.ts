import { PrismaClient } from '@prisma/client';
import { LiveEventEnvelope, UniversalEventType } from '@aep/event-model';
import { Logger } from '@aep/shared';

export class BatchPersister {
  private prisma: PrismaClient;
  private logger = new Logger('BatchPersister');
  private queue: LiveEventEnvelope[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private maxBatchSize = 100;
  private flushIntervalMs = 3000;
  private isFlushing = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  enqueue(event: LiveEventEnvelope) {
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize && !this.isFlushing) {
      this.flush();
    }
  }

  async flush() {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    const batch = [...this.queue];
    this.queue = [];

    try {
      // 1. Bulk insert into raw ledger live_events (single roundtrip)
      const liveEventsData = batch.map((ev) => ({
        id: ev.id,
        provider: ev.provider,
        providerEventType: ev.providerEventName,
        providerEventId: ev.providerEventId,
        providerTransactionId: ev.providerTransactionId,
        streamId: ev.roomId,
        sessionId: ev.sessionId,
        eventType: ev.eventType,
        timestampUtc: new Date(ev.timestampUtc),
        payloadJson: ev.payload as any,
      }));

      await this.prisma.liveEvent.createMany({
        data: liveEventsData,
        skipDuplicates: true,
      });

      // 2. Aggregate likes to avoid serial roundtrips
      let aggregatedLikes = 0;
      let targetSessionId: string | undefined;

      // 3. Process high-value domain events (Gifts & Comments only)
      for (const ev of batch) {
        if (!ev.user) continue;

        if (ev.eventType === UniversalEventType.LIKE_BURST) {
          const payload = ev.payload as any;
          aggregatedLikes += Number(payload.likeCount || 1);
          if (ev.sessionId) targetSessionId = ev.sessionId;
          continue;
        }

        try {
          if (ev.eventType === UniversalEventType.GIFT_RECEIVED) {
            const payload = ev.payload as any;
            const dbUser = await this.prisma.user.upsert({
              where: { userId: ev.user.userId },
              update: {
                uniqueId: ev.user.uniqueId,
                nickname: ev.user.nickname,
                avatarUrl: ev.user.avatarUrl || undefined,
                lastSeenAt: new Date(ev.timestampUtc),
              },
              create: {
                userId: ev.user.userId,
                uniqueId: ev.user.uniqueId,
                nickname: ev.user.nickname,
                avatarUrl: ev.user.avatarUrl,
                firstSeenAt: new Date(ev.timestampUtc),
                lastSeenAt: new Date(ev.timestampUtc),
              },
            });

            await this.prisma.giftEvent.create({
              data: {
                sessionId: ev.sessionId,
                userId: dbUser.id,
                giftId: payload.giftId,
                giftName: payload.giftName,
                diamondValue: payload.diamondCost,
                repeatCount: payload.repeatCount,
                totalDiamonds: BigInt(payload.totalDiamonds || 0),
                transactionId: ev.providerTransactionId,
                timestampUtc: new Date(ev.timestampUtc),
              },
            });

            await this.prisma.user.update({
              where: { id: dbUser.id },
              data: {
                totalGifts: { increment: payload.repeatCount },
                totalDiamonds: { increment: BigInt(payload.totalDiamonds || 0) },
              },
            });
          } else if (ev.eventType === UniversalEventType.CHAT_COMMENT) {
            const payload = ev.payload as any;
            const dbUser = await this.prisma.user.upsert({
              where: { userId: ev.user.userId },
              update: {
                uniqueId: ev.user.uniqueId,
                nickname: ev.user.nickname,
                avatarUrl: ev.user.avatarUrl || undefined,
                lastSeenAt: new Date(ev.timestampUtc),
              },
              create: {
                userId: ev.user.userId,
                uniqueId: ev.user.uniqueId,
                nickname: ev.user.nickname,
                avatarUrl: ev.user.avatarUrl,
                firstSeenAt: new Date(ev.timestampUtc),
                lastSeenAt: new Date(ev.timestampUtc),
              },
            });

            await this.prisma.commentEvent.create({
              data: {
                sessionId: ev.sessionId,
                userId: dbUser.id,
                commentId: payload.commentId || `cmt_${Date.now()}_${Math.random()}`,
                commentText: payload.text,
                timestampUtc: new Date(ev.timestampUtc),
              },
            });
          }
        } catch (itemErr: any) {
          // Log individual item failure without breaking batch
          this.logger.warn(`Failed persisting single event ${ev.id}: ${itemErr.message}`);
        }
      }

      // If we had likes, do a single aggregated session update
      if (aggregatedLikes > 0 && targetSessionId) {
        try {
          await this.prisma.liveSession.update({
            where: { id: targetSessionId },
            data: { totalLikes: { increment: BigInt(aggregatedLikes) } },
          });
        } catch (_) {}
      }
    } catch (err: any) {
      this.logger.error(`Batch persister flush error: ${err.message}`);
    } finally {
      this.isFlushing = false;
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
