import { PrismaClient, PowerUpTransactionType } from '@prisma/client';
import { Logger } from '@aep/shared';
import { PowerUpEventPayload } from '@aep/event-model';

export class PowerUpInventoryManager {
  private prisma: PrismaClient;
  private logger = new Logger('PowerUpInventoryManager');

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private catalogCache: Map<string, any> = new Map();
  private catalogLoaded = false;

  private async getCatalogItem(code: string, name?: string) {
    if (!this.catalogLoaded) {
      try {
        const allItems = await this.prisma.powerUpCatalog.findMany();
        for (const item of allItems) {
          this.catalogCache.set(item.code.toUpperCase(), item);
          if (item.nameEn) this.catalogCache.set(item.nameEn.toUpperCase(), item);
        }
        if (allItems.length > 0) this.catalogLoaded = true;
      } catch (err: any) {
        this.logger.warn(`Could not preload catalog cache: ${err.message}`);
      }
    }

    const normalizedCode = code.toUpperCase().replace(/\s+/g, '_');
    if (this.catalogCache.has(normalizedCode)) {
      return this.catalogCache.get(normalizedCode);
    }
    if (name && this.catalogCache.has(name.toUpperCase())) {
      return this.catalogCache.get(name.toUpperCase());
    }

    return this.prisma.powerUpCatalog.findFirst({
      where: {
        OR: [
          { code: normalizedCode },
          { nameEn: { equals: name, mode: 'insensitive' } },
        ],
      },
    });
  }

  /**
   * Process a power-up event through the state machine:
   * DETECTED -> CLASSIFIED -> ACQUIRED -> AVAILABLE -> USED
   */
  async processPowerUpEvent(params: {
    tiktokUserId: string;
    uniqueId: string;
    nickname: string;
    avatarUrl?: string;
    payload: PowerUpEventPayload;
    streamSessionId?: string;
    sourceEventId?: string;
    sourceTransactionId?: string;
    occurredAt: Date;
  }) {
    const { tiktokUserId, uniqueId, nickname, avatarUrl, payload, streamSessionId, sourceEventId, sourceTransactionId, occurredAt } = params;

    // 1. Ensure user exists
    const user = await this.prisma.user.upsert({
      where: { userId: tiktokUserId },
      update: {
        uniqueId,
        nickname,
        avatarUrl: avatarUrl || undefined,
        lastSeenAt: occurredAt,
      },
      create: {
        userId: tiktokUserId,
        uniqueId,
        nickname,
        avatarUrl,
        firstSeenAt: occurredAt,
        lastSeenAt: occurredAt,
      },
    });

    // 2. Resolve power-up catalog entry with in-memory caching
    const code = payload.powerUpCode.toUpperCase().replace(/\s+/g, '_');
    const catalogItem = await this.getCatalogItem(code, payload.powerUpName);

    if (!catalogItem) {
      this.logger.warn(`Power-up code "${code}" not found in catalog. Marked DETECTED only.`);
      return { status: 'UNKNOWN_TOOL', code };
    }

    // Resolve battle session if battleId provided
    let battleDbId: string | undefined;
    if (payload.battleId) {
      const battle = await this.prisma.battleSession.findUnique({
        where: { battleId: payload.battleId },
      });
      if (battle) battleDbId = battle.id;
    }

    // 3. Apply state-machine rules
    if (payload.actionState === 'ACQUIRED') {
      return this.recordAcquisition({
        userId: user.id,
        powerUpId: catalogItem.id,
        powerUpCode: catalogItem.code,
        quantity: Math.max(1, payload.quantity),
        streamSessionId,
        battleSessionId: battleDbId,
        sourceEventId,
        sourceTransactionId,
        evidenceNotes: payload.evidenceNotes,
        occurredAt,
      });
    } else if (payload.actionState === 'USED') {
      return this.recordUsage({
        userId: user.id,
        powerUpId: catalogItem.id,
        powerUpCode: catalogItem.code,
        quantity: Math.max(1, payload.quantity),
        streamSessionId,
        battleSessionId: battleDbId,
        sourceEventId,
        sourceTransactionId,
        evidenceNotes: payload.evidenceNotes,
        occurredAt,
      });
    } else {
      this.logger.info(`Power-up detected but unverified (${payload.actionState}). Not updating inventory.`);
      return { status: 'DETECTED_ONLY', code: catalogItem.code };
    }
  }

  async recordAcquisition(params: {
    userId: string;
    powerUpId: string;
    powerUpCode: string;
    quantity: number;
    streamSessionId?: string;
    battleSessionId?: string;
    sourceEventId?: string;
    sourceTransactionId?: string;
    evidenceNotes: string;
    occurredAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Find or create current inventory projection
      const inventory = await tx.userPowerUpInventory.findUnique({
        where: {
          userId_powerUpId: {
            userId: params.userId,
            powerUpId: params.powerUpId,
          },
        },
      });

      const qtyBefore = inventory ? inventory.quantity : 0;
      const qtyAfter = qtyBefore + params.quantity;

      // 1. Immutable ledger entry
      const transaction = await tx.powerUpTransaction.create({
        data: {
          userId: params.userId,
          powerUpId: params.powerUpId,
          streamSessionId: params.streamSessionId,
          battleSessionId: params.battleSessionId,
          transactionType: PowerUpTransactionType.ACQUIRED,
          quantity: params.quantity,
          quantityBefore: qtyBefore,
          quantityAfter: qtyAfter,
          sourceEventId: params.sourceEventId,
          sourceTransactionId: params.sourceTransactionId,
          evidenceNotes: params.evidenceNotes,
          occurredAt: params.occurredAt,
        },
      });

      // 2. Inventory projection update
      const updatedInventory = await tx.userPowerUpInventory.upsert({
        where: {
          userId_powerUpId: {
            userId: params.userId,
            powerUpId: params.powerUpId,
          },
        },
        update: {
          quantity: qtyAfter,
          totalAcquired: { increment: params.quantity },
          lastAcquiredAt: params.occurredAt,
        },
        create: {
          userId: params.userId,
          powerUpId: params.powerUpId,
          quantity: qtyAfter,
          totalAcquired: params.quantity,
          totalUsed: 0,
          lastAcquiredAt: params.occurredAt,
        },
      });

      this.logger.info(
        `User ${params.userId} acquired ${params.powerUpCode} +${params.quantity}. Balance: ${qtyAfter}`
      );

      return { transaction, inventory: updatedInventory };
    });
  }

  async recordUsage(params: {
    userId: string;
    powerUpId: string;
    powerUpCode: string;
    quantity: number;
    streamSessionId?: string;
    battleSessionId?: string;
    sourceEventId?: string;
    sourceTransactionId?: string;
    evidenceNotes: string;
    occurredAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.userPowerUpInventory.findUnique({
        where: {
          userId_powerUpId: {
            userId: params.userId,
            powerUpId: params.powerUpId,
          },
        },
      });

      const qtyBefore = inventory ? inventory.quantity : 0;
      // Invariant: Balance strictly clamped at >= 0. Never negative!
      const actualDeduction = params.quantity;
      const deductionFromStock = Math.min(params.quantity, qtyBefore);
      const qtyAfter = Math.max(0, qtyBefore - deductionFromStock);
      const additionalAcquired = Math.max(0, actualDeduction - qtyBefore);

      // 1. Immutable ledger entry
      const transaction = await tx.powerUpTransaction.create({
        data: {
          userId: params.userId,
          powerUpId: params.powerUpId,
          streamSessionId: params.streamSessionId,
          battleSessionId: params.battleSessionId,
          transactionType: PowerUpTransactionType.USED,
          quantity: -actualDeduction,
          quantityBefore: qtyBefore,
          quantityAfter: qtyAfter,
          sourceEventId: params.sourceEventId,
          sourceTransactionId: params.sourceTransactionId,
          evidenceNotes: params.evidenceNotes,
          occurredAt: params.occurredAt,
        },
      });

      // 2. Inventory projection update (upsert ensures record is created even if user unlocked tool in-battle)
      const updatedInventory = await tx.userPowerUpInventory.upsert({
        where: {
          userId_powerUpId: {
            userId: params.userId,
            powerUpId: params.powerUpId,
          },
        },
        update: {
          quantity: qtyAfter,
          totalUsed: { increment: actualDeduction },
          totalAcquired: { increment: additionalAcquired },
          lastUsedAt: params.occurredAt,
        },
        create: {
          userId: params.userId,
          powerUpId: params.powerUpId,
          quantity: 0,
          totalAcquired: actualDeduction,
          totalUsed: actualDeduction,
          lastAcquiredAt: params.occurredAt,
          lastUsedAt: params.occurredAt,
        },
      });

      this.logger.info(
        `User ${params.userId} used ${params.powerUpCode} -${actualDeduction}. Balance: ${qtyAfter}`
      );

      return { transaction, inventory: updatedInventory };
    });
  }

  async getUserInventory(userId: string) {
    return this.prisma.userPowerUpInventory.findMany({
      where: { userId },
      include: {
        powerUp: true,
      },
    });
  }

  async getUserTransactions(userId: string, limit = 50) {
    return this.prisma.powerUpTransaction.findMany({
      where: { userId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: {
        powerUp: true,
        battleSession: true,
      },
    });
  }
}
