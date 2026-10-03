import { PrismaClient } from '@prisma/client';
import { Logger } from '@aep/shared';
import { LiveEventEnvelope, UniversalEventType } from '@aep/event-model';

export class WatchlistManager {
  private prisma: PrismaClient;
  private logger = new Logger('WatchlistManager');
  private watchlistCache = new Map<string, any>();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async refreshCache() {
    const list = await this.prisma.watchlist.findMany({
      where: { isActive: true },
      include: { user: true },
    });
    this.watchlistCache.clear();
    for (const item of list) {
      this.watchlistCache.set(item.user.userId, item);
      this.watchlistCache.set(item.user.uniqueId.toLowerCase(), item);
    }
  }

  /**
   * Check if event matches monitored user rules
   */
  async evaluateEvent(event: LiveEventEnvelope): Promise<{ isMonitored: boolean; rule?: any }> {
    if (!event.user) return { isMonitored: false };

    const rule =
      this.watchlistCache.get(event.user.userId) ||
      this.watchlistCache.get(event.user.uniqueId.toLowerCase());

    if (!rule) return { isMonitored: false };

    // Check specific flag
    switch (event.eventType) {
      case UniversalEventType.CHAT_COMMENT:
        if (rule.notifyComments) return { isMonitored: true, rule };
        break;
      case UniversalEventType.LIKE_BURST:
        if (rule.notifyLikes) return { isMonitored: true, rule };
        break;
      case UniversalEventType.SHARE:
        if (rule.notifyShares) return { isMonitored: true, rule };
        break;
      case UniversalEventType.GIFT_RECEIVED:
        if (rule.notifyGifts) return { isMonitored: true, rule };
        break;
      case UniversalEventType.POWERUP_ACQUIRED:
      case UniversalEventType.POWERUP_USED:
        if (rule.notifyPowerups) return { isMonitored: true, rule };
        break;
      case UniversalEventType.BATTLE_START:
      case UniversalEventType.BATTLE_UPDATE:
      case UniversalEventType.BATTLE_END:
        if (rule.notifyBattles) return { isMonitored: true, rule };
        break;
      default:
        break;
    }

    return { isMonitored: false };
  }
}
