import { PrismaClient } from '@prisma/client';
import { LiveEventEnvelope } from '@aep/event-model';
export declare class BatchPersister {
    private prisma;
    private logger;
    private queue;
    private flushTimer;
    private maxBatchSize;
    private flushIntervalMs;
    constructor(prisma: PrismaClient);
    enqueue(event: LiveEventEnvelope): void;
    flush(): Promise<void>;
    destroy(): void;
}
//# sourceMappingURL=batch-persister.d.ts.map