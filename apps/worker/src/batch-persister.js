"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchPersister = void 0;
const event_model_1 = require("@aep/event-model");
const shared_1 = require("@aep/shared");
class BatchPersister {
    prisma;
    logger = new shared_1.Logger('BatchPersister');
    queue = [];
    flushTimer = null;
    maxBatchSize = 100;
    flushIntervalMs = 500;
    constructor(prisma) {
        this.prisma = prisma;
        this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    }
    enqueue(event) {
        this.queue.push(event);
        if (this.queue.length >= this.maxBatchSize) {
            this.flush();
        }
    }
    async flush() {
        if (this.queue.length === 0)
            return;
        const batch = [...this.queue];
        this.queue = [];
        try {
            // 1. Bulk insert into raw ledger live_events
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
                payloadJson: ev.payload,
            }));
            await this.prisma.liveEvent.createMany({
                data: liveEventsData,
                skipDuplicates: true,
            });
            // 2. Specialized writes for high query performance
            for (const ev of batch) {
                if (!ev.user)
                    continue;
                // Upsert user profile
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
                // Dispatch domain-specific tables
                if (ev.eventType === event_model_1.UniversalEventType.CHAT_COMMENT) {
                    const payload = ev.payload;
                    await this.prisma.commentEvent.create({
                        data: {
                            sessionId: ev.sessionId,
                            userId: dbUser.id,
                            commentId: payload.commentId,
                            commentText: payload.text,
                            timestampUtc: new Date(ev.timestampUtc),
                        },
                    });
                    await this.prisma.user.update({
                        where: { id: dbUser.id },
                        data: { totalComments: { increment: 1 } },
                    });
                    await this.prisma.liveSession.update({
                        where: { id: ev.sessionId },
                        data: { totalComments: { increment: 1 } },
                    });
                }
                else if (ev.eventType === event_model_1.UniversalEventType.GIFT_RECEIVED) {
                    const payload = ev.payload;
                    await this.prisma.giftEvent.create({
                        data: {
                            sessionId: ev.sessionId,
                            userId: dbUser.id,
                            giftId: payload.giftId,
                            giftName: payload.giftName,
                            diamondValue: payload.diamondCost,
                            repeatCount: payload.repeatCount,
                            totalDiamonds: BigInt(payload.totalDiamonds),
                            transactionId: ev.providerTransactionId,
                            timestampUtc: new Date(ev.timestampUtc),
                        },
                    });
                    await this.prisma.user.update({
                        where: { id: dbUser.id },
                        data: {
                            totalGifts: { increment: payload.repeatCount },
                            totalDiamonds: { increment: BigInt(payload.totalDiamonds) },
                        },
                    });
                    await this.prisma.liveSession.update({
                        where: { id: ev.sessionId },
                        data: {
                            totalGifts: { increment: payload.repeatCount },
                            totalDiamonds: { increment: BigInt(payload.totalDiamonds) },
                        },
                    });
                }
                else if (ev.eventType === event_model_1.UniversalEventType.LIKE_BURST) {
                    const payload = ev.payload;
                    await this.prisma.likeEvent.create({
                        data: {
                            sessionId: ev.sessionId,
                            userId: dbUser.id,
                            likeCount: payload.likeCount,
                            totalLikes: BigInt(payload.totalLikes),
                            timestampUtc: new Date(ev.timestampUtc),
                        },
                    });
                    await this.prisma.user.update({
                        where: { id: dbUser.id },
                        data: { totalLikes: { increment: BigInt(payload.likeCount) } },
                    });
                    await this.prisma.liveSession.update({
                        where: { id: ev.sessionId },
                        data: { totalLikes: { increment: BigInt(payload.likeCount) } },
                    });
                }
                else if (ev.eventType === event_model_1.UniversalEventType.SHARE) {
                    await this.prisma.shareEvent.create({
                        data: {
                            sessionId: ev.sessionId,
                            userId: dbUser.id,
                            timestampUtc: new Date(ev.timestampUtc),
                        },
                    });
                    await this.prisma.user.update({
                        where: { id: dbUser.id },
                        data: { totalShares: { increment: 1 } },
                    });
                    await this.prisma.liveSession.update({
                        where: { id: ev.sessionId },
                        data: { totalShares: { increment: 1 } },
                    });
                }
            }
        }
        catch (err) {
            this.logger.error(`Batch persister error: ${err.message}`);
        }
    }
    destroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }
}
exports.BatchPersister = BatchPersister;
//# sourceMappingURL=batch-persister.js.map