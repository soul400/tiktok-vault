import { PrismaClient } from '@prisma/client';
export declare class RetentionCleaner {
    private prisma;
    private logger;
    private retentionDays;
    constructor(prisma: PrismaClient, retentionDays?: number);
    /**
     * Purges records older than retentionDays (30 days default)
     */
    runRetentionPurge(): Promise<{
        liveEventsDeleted: number;
        commentsDeleted: number;
        likesDeleted: number;
        sharesDeleted: number;
        giftsDeleted: number;
        battlesDeleted: number;
        powerUpTxDeleted: number;
    }>;
}
//# sourceMappingURL=retention-cleaner.d.ts.map