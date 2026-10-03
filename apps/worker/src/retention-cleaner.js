"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionCleaner = void 0;
const shared_1 = require("@aep/shared");
class RetentionCleaner {
    prisma;
    logger = new shared_1.Logger('RetentionCleaner');
    retentionDays;
    constructor(prisma, retentionDays = 30) {
        this.prisma = prisma;
        this.retentionDays = retentionDays;
    }
    /**
     * Purges records older than retentionDays (30 days default)
     */
    async runRetentionPurge() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
        this.logger.info(`Executing ${this.retentionDays}-day retention cleanup for records older than ${cutoffDate.toISOString()}`);
        const liveEvents = await this.prisma.liveEvent.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
        });
        const comments = await this.prisma.commentEvent.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
        });
        const likes = await this.prisma.likeEvent.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
        });
        const shares = await this.prisma.shareEvent.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
        });
        const gifts = await this.prisma.giftEvent.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
        });
        const battles = await this.prisma.battleEvent.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
        });
        const powerUpTx = await this.prisma.powerUpTransaction.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
        });
        const summary = {
            liveEventsDeleted: liveEvents.count,
            commentsDeleted: comments.count,
            likesDeleted: likes.count,
            sharesDeleted: shares.count,
            giftsDeleted: gifts.count,
            battlesDeleted: battles.count,
            powerUpTxDeleted: powerUpTx.count,
        };
        this.logger.info('Retention purge completed successfully:', summary);
        return summary;
    }
}
exports.RetentionCleaner = RetentionCleaner;
//# sourceMappingURL=retention-cleaner.js.map