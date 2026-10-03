import { getPrisma } from '@aep/database';
import { Logger } from '@aep/shared';
import { LiveEventEnvelope, UniversalEventType } from '@aep/event-model';
import { BattleManager } from '@aep/battle-intelligence';
import { PowerUpInventoryManager, WeeklyPowerUpArchiver } from '@aep/powerup-inventory';
import { WatchlistManager } from '@aep/watchlist';
import { BatchPersister } from './batch-persister.js';
import { RetentionCleaner } from './retention-cleaner.js';
import dotenv from 'dotenv';

dotenv.config();

export class WorkerService {
  private prisma = getPrisma();
  private logger = new Logger('WorkerService');
  private persister: BatchPersister;
  private battleManager: BattleManager;
  private powerUpManager: PowerUpInventoryManager;
  private weeklyArchiver: WeeklyPowerUpArchiver;
  private watchlistManager: WatchlistManager;
  private retentionCleaner: RetentionCleaner;

  constructor() {
    this.persister = new BatchPersister(this.prisma);
    this.battleManager = new BattleManager(this.prisma);
    this.powerUpManager = new PowerUpInventoryManager(this.prisma);
    this.weeklyArchiver = new WeeklyPowerUpArchiver(this.prisma);
    this.watchlistManager = new WatchlistManager(this.prisma);
    this.retentionCleaner = new RetentionCleaner(this.prisma, 30);
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

  private watchlistAlertHandler?: (alert: any) => void;

  onWatchlistAlert(handler: (alert: any) => void) {
    this.watchlistAlertHandler = handler;
  }

  async refreshWatchlistCache() {
    await this.watchlistManager.refreshCache();
  }

  /**
   * Main entry point for processing incoming LiveEventEnvelope
   */
  async processEvent(event: LiveEventEnvelope) {
    // 1. Queue for persistent batch storage
    this.persister.enqueue(event);

    // 2. Battle (PK) Domain State Machine
    if (event.eventType === UniversalEventType.BATTLE_START) {
      const payload = event.payload as any;
      await this.battleManager.handleBattleStart({
        battleId: payload.battleId,
        streamSessionId: event.sessionId,
        battleType: payload.battleType || '1v1',
        durationSeconds: payload.durationSeconds || 300,
        startedAt: new Date(event.timestampUtc),
        teams: payload.teams || [],
      });
    } else if (event.eventType === UniversalEventType.BATTLE_ARMIES_UPDATE) {
      await this.battleManager.handleArmiesUpdate(event.payload as any);
    } else if (event.eventType === UniversalEventType.BATTLE_END) {
      const payload = event.payload as any;
      await this.battleManager.handleBattleEnd({
        battleId: payload.battleId,
        winningTeamId: payload.winningTeamId,
        isDraw: payload.isDraw,
        endedAt: new Date(event.timestampUtc),
        mvpUserId: payload.teams?.[0]?.mvpUserId,
      });
    }

    // 3. Power-Up & Battle Tools Domain State Machine
    if (
      event.eventType === UniversalEventType.POWERUP_ACQUIRED ||
      event.eventType === UniversalEventType.POWERUP_USED ||
      event.eventType === UniversalEventType.POWERUP_DETECTED
    ) {
      const targetUser = event.user || {
        userId: 'enigma_supporter',
        uniqueId: 'Enigma',
        nickname: 'داعم متخفي (Enigma)',
        avatarUrl: undefined,
      };

      await this.powerUpManager.processPowerUpEvent({
        tiktokUserId: targetUser.userId,
        uniqueId: targetUser.uniqueId,
        nickname: targetUser.nickname,
        avatarUrl: targetUser.avatarUrl,
        payload: event.payload as any,
        streamSessionId: event.sessionId,
        sourceEventId: event.providerEventId,
        sourceTransactionId: event.providerTransactionId,
        occurredAt: new Date(event.timestampUtc),
      });
    }

    // 4. Watchlist evaluation
    const monitored = await this.watchlistManager.evaluateEvent(event);
    if (monitored.isMonitored) {
      this.logger.info(
        `⭐ Watchlist Match: @${event.user?.uniqueId} triggered ${event.eventType}!`
      );
      if (this.watchlistAlertHandler) {
        this.watchlistAlertHandler({
          user: event.user,
          streamerUsername: event.streamerUsername,
          eventType: event.eventType,
          payload: event.payload,
          rule: monitored.rule,
          timestamp: event.timestampUtc,
        });
      }
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

if (process.argv[1]?.includes('index.ts')) {
  const worker = new WorkerService();
  worker.start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
