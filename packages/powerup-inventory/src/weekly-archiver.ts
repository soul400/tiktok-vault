import { PrismaClient } from '@prisma/client';
import { Logger } from '@aep/shared';

export class WeeklyPowerUpArchiver {
  private prisma: PrismaClient;
  private logger = new Logger('WeeklyPowerUpArchiver');

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generates weekly snapshot aggregations from raw power_up_transactions
   */
  async generateWeeklySnapshot(weekStartUtc: Date, weekEndUtc: Date) {
    this.logger.info(
      `Generating weekly snapshot for window ${weekStartUtc.toISOString()} - ${weekEndUtc.toISOString()}`
    );

    // Group transactions by user and tool
    const transactions = await this.prisma.powerUpTransaction.findMany({
      where: {
        occurredAt: {
          gte: weekStartUtc,
          lte: weekEndUtc,
        },
      },
      include: {
        user: true,
        powerUp: true,
      },
    });

    const userToolMap = new Map<
      string,
      { userId: string; powerUpId: string; acquired: number; used: number }
    >();

    for (const tx of transactions) {
      const key = `${tx.userId}:${tx.powerUpId}`;
      let entry = userToolMap.get(key);
      if (!entry) {
        entry = { userId: tx.userId, powerUpId: tx.powerUpId, acquired: 0, used: 0 };
        userToolMap.set(key, entry);
      }

      if (tx.transactionType === 'ACQUIRED') {
        entry.acquired += tx.quantity;
      } else if (tx.transactionType === 'USED') {
        entry.used += Math.abs(tx.quantity);
      }
    }

    // Persist snapshots
    for (const entry of userToolMap.values()) {
      const currentInventory = await this.prisma.userPowerUpInventory.findUnique({
        where: {
          userId_powerUpId: {
            userId: entry.userId,
            powerUpId: entry.powerUpId,
          },
        },
      });

      const remaining = currentInventory ? currentInventory.quantity : 0;

      await this.prisma.weeklyPowerUpSnapshot.upsert({
        where: {
          weekStartUtc_userId_powerUpId: {
            weekStartUtc,
            userId: entry.userId,
            powerUpId: entry.powerUpId,
          },
        },
        update: {
          totalAcquired: entry.acquired,
          totalUsed: entry.used,
          balanceRemaining: remaining,
        },
        create: {
          weekStartUtc,
          weekEndUtc,
          userId: entry.userId,
          powerUpId: entry.powerUpId,
          totalAcquired: entry.acquired,
          totalUsed: entry.used,
          balanceRemaining: remaining,
        },
      });
    }

    this.logger.info(`Weekly snapshot completed for ${userToolMap.size} user-tool pairs.`);
  }

  async getWeeklyArchive(weekStartUtc: Date) {
    return this.prisma.weeklyPowerUpSnapshot.findMany({
      where: { weekStartUtc },
      include: {
        user: true,
        powerUp: true,
      },
      orderBy: {
        totalAcquired: 'desc',
      },
    });
  }
}
