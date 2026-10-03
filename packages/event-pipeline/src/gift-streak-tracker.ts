/**
 * AEP — GiftStreakTracker Pattern
 * Tracks and consolidates gift combo streaks to prevent duplicate diamond multiplication.
 * Ensures Rose x1, Rose x2, Rose x3, repeatEnd results in exactly 3 diamonds total (not 6).
 */

export interface TrackedGiftResult {
  deltaCount: number;          // Delta count to increment for this step
  currentRepeatCount: number;  // Current total streak count
  deltaDiamonds: number;       // Delta diamonds for this step
  totalStreakDiamonds: number; // Total diamonds for entire streak
  isStreakEnd: boolean;        // Whether streak is finished
  transactionId: string;       // Deterministic transaction key
}

export class GiftStreakTracker {
  // streakKey -> state
  private activeStreaks = new Map<
    string,
    {
      lastRepeatCount: number;
      diamondCost: number;
      comboId?: string;
      lastSeenAt: number;
    }
  >();

  buildStreakKey(userId: string, giftId: string, comboId?: string): string {
    return `${userId}:${giftId}:${comboId || 'default'}`;
  }

  processGift(params: {
    userId: string;
    giftId: string;
    diamondCost: number;
    repeatCount: number;
    repeatEnd: boolean;
    comboId?: string;
    msgId?: string;
  }): TrackedGiftResult {
    const { userId, giftId, diamondCost, repeatCount, repeatEnd, comboId, msgId } = params;
    const streakKey = this.buildStreakKey(userId, giftId, comboId);
    const existing = this.activeStreaks.get(streakKey);

    const prevRepeatCount = existing ? existing.lastRepeatCount : 0;
    // Calculate accurate delta count
    const deltaCount = repeatCount > prevRepeatCount ? repeatCount - prevRepeatCount : 1;
    const deltaDiamonds = diamondCost * deltaCount;
    const totalStreakDiamonds = diamondCost * repeatCount;

    const transactionId = comboId
      ? `gift_combo_${comboId}_${repeatEnd ? 'end' : repeatCount}`
      : `gift_tx_${msgId || Date.now()}_${repeatCount}`;

    if (repeatEnd) {
      this.activeStreaks.delete(streakKey);
    } else {
      this.activeStreaks.set(streakKey, {
        lastRepeatCount: repeatCount,
        diamondCost,
        comboId,
        lastSeenAt: Date.now(),
      });
    }

    return {
      deltaCount,
      currentRepeatCount: repeatCount,
      deltaDiamonds,
      totalStreakDiamonds,
      isStreakEnd: Boolean(repeatEnd),
      transactionId,
    };
  }

  cleanStaleStreaks(maxAgeMs = 15000): void {
    const now = Date.now();
    for (const [key, val] of this.activeStreaks.entries()) {
      if (now - val.lastSeenAt > maxAgeMs) {
        this.activeStreaks.delete(key);
      }
    }
  }

  reset(): void {
    this.activeStreaks.clear();
  }
}
