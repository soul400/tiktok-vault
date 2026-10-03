"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerService = void 0;
const database_1 = require("@aep/database");
const shared_1 = require("@aep/shared");
const event_model_1 = require("@aep/event-model");
const battle_intelligence_1 = require("@aep/battle-intelligence");
const powerup_inventory_1 = require("@aep/powerup-inventory");
const watchlist_1 = require("@aep/watchlist");
const batch_persister_js_1 = require("./batch-persister.js");
const retention_cleaner_js_1 = require("./retention-cleaner.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class WorkerService {
    prisma = (0, database_1.getPrisma)();
    logger = new shared_1.Logger('WorkerService');
    persister;
    battleManager;
    powerUpManager;
    weeklyArchiver;
    watchlistManager;
    retentionCleaner;
    constructor() {
        this.persister = new batch_persister_js_1.BatchPersister(this.prisma);
        this.battleManager = new battle_intelligence_1.BattleManager(this.prisma);
        this.powerUpManager = new powerup_inventory_1.PowerUpInventoryManager(this.prisma);
        this.weeklyArchiver = new powerup_inventory_1.WeeklyPowerUpArchiver(this.prisma);
        this.watchlistManager = new watchlist_1.WatchlistManager(this.prisma);
        this.retentionCleaner = new retention_cleaner_js_1.RetentionCleaner(this.prisma, 30);
    }
    async start() {
        this.logger.info('Initializing Worker Service...');
        await this.watchlistManager.refreshCache();
        // Schedule 30-day cleanup every 24 hours
        setInterval(() => {
            this.retentionCleaner.runRetentionPurge().catch((err) => {
                this.logger.error(`Scheduled retention cleanup failed: ${err.message}`);
            });
        }, 24 * 60 * 60 * 1000);
        this.logger.info('Worker Service is active and ready.');
    }
    /**
     * Main entry point for processing incoming LiveEventEnvelope
     */
    async processEvent(event) {
        // 1. Queue for persistent batch storage
        this.persister.enqueue(event);
        // 2. Battle (PK) Domain State Machine
        if (event.eventType === event_model_1.UniversalEventType.BATTLE_START) {
            const payload = event.payload;
            await this.battleManager.handleBattleStart({
                battleId: payload.battleId,
                streamSessionId: event.sessionId,
                battleType: payload.battleType || '1v1',
                durationSeconds: payload.durationSeconds || 300,
                startedAt: new Date(event.timestampUtc),
                teams: payload.teams || [],
            });
        }
        else if (event.eventType === event_model_1.UniversalEventType.BATTLE_ARMIES_UPDATE) {
            await this.battleManager.handleArmiesUpdate(event.payload);
        }
        else if (event.eventType === event_model_1.UniversalEventType.BATTLE_END) {
            const payload = event.payload;
            await this.battleManager.handleBattleEnd({
                battleId: payload.battleId,
                winningTeamId: payload.winningTeamId,
                isDraw: payload.isDraw,
                endedAt: new Date(event.timestampUtc),
                mvpUserId: payload.teams?.[0]?.mvpUserId,
            });
        }
        // 3. Power-Up & Battle Tools Domain State Machine
        if (event.eventType === event_model_1.UniversalEventType.POWERUP_ACQUIRED ||
            event.eventType === event_model_1.UniversalEventType.POWERUP_USED ||
            event.eventType === event_model_1.UniversalEventType.POWERUP_DETECTED) {
            if (event.user) {
                await this.powerUpManager.processPowerUpEvent({
                    tiktokUserId: event.user.userId,
                    uniqueId: event.user.uniqueId,
                    nickname: event.user.nickname,
                    avatarUrl: event.user.avatarUrl,
                    payload: event.payload,
                    streamSessionId: event.sessionId,
                    sourceEventId: event.providerEventId,
                    sourceTransactionId: event.providerTransactionId,
                    occurredAt: new Date(event.timestampUtc),
                });
            }
        }
        // 4. Watchlist evaluation
        const monitored = await this.watchlistManager.evaluateEvent(event);
        if (monitored.isMonitored) {
            this.logger.info(`⭐ Watchlist Match: @${event.user?.uniqueId} triggered ${event.eventType}!`);
        }
    }
    getManagers() {
        return {
            persister: this.persister,
            battleManager: this.battleManager,
            powerUpManager: this.powerUpManager,
            weeklyArchiver: this.weeklyArchiver,
            watchlistManager: this.watchlistManager,
            retentionCleaner: this.retentionCleaner,
        };
    }
}
exports.WorkerService = WorkerService;
if (process.argv[1]?.includes('index.ts')) {
    const worker = new WorkerService();
    worker.start().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map