import { LiveEventEnvelope } from '@aep/event-model';
import { BattleManager } from '@aep/battle-intelligence';
import { PowerUpInventoryManager, WeeklyPowerUpArchiver } from '@aep/powerup-inventory';
import { WatchlistManager } from '@aep/watchlist';
import { BatchPersister } from './batch-persister.js';
import { RetentionCleaner } from './retention-cleaner.js';
export declare class WorkerService {
    private prisma;
    private logger;
    private persister;
    private battleManager;
    private powerUpManager;
    private weeklyArchiver;
    private watchlistManager;
    private retentionCleaner;
    constructor();
    start(): Promise<void>;
    /**
     * Main entry point for processing incoming LiveEventEnvelope
     */
    processEvent(event: LiveEventEnvelope): Promise<void>;
    getManagers(): {
        persister: BatchPersister;
        battleManager: BattleManager;
        powerUpManager: PowerUpInventoryManager;
        weeklyArchiver: WeeklyPowerUpArchiver;
        watchlistManager: WatchlistManager;
        retentionCleaner: RetentionCleaner;
    };
}
//# sourceMappingURL=index.d.ts.map