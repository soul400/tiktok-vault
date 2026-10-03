/**
 * AEP — LikeAccumulator Pattern
 * Prevents double-summing of cumulative like totals and calculates true deltas.
 */

export interface LikeAccumulatorRecord {
  likeCount: number;  // True delta likes for this event
  totalLikes: number; // Synchronized room cumulative total
}

export class LikeAccumulator {
  // sessionId -> max seen room totalLikes
  private roomTotals = new Map<string, number>();
  // `${sessionId}:${userId}` -> last cumulative likeCount reported for this user
  private userCumulatives = new Map<string, number>();

  /**
   * Processes a like event and calculates true non-negative delta and synchronized total.
   * Ensures sequence [10, 20, 35, 50] results in total 50, NOT 115.
   */
  process(
    sessionId: string,
    userId: string,
    reportedLikeCount: number,
    reportedTotalLikes?: number
  ): LikeAccumulatorRecord {
    const userKey = `${sessionId}:${userId}`;
    const lastUserCount = this.userCumulatives.get(userKey) || 0;
    let delta = 0;

    // Check if reportedLikeCount is cumulative for this user
    if (reportedLikeCount > lastUserCount && lastUserCount > 0) {
      // Detected cumulative progression: e.g. 10 -> 20 -> 35 -> 50
      delta = reportedLikeCount - lastUserCount;
      this.userCumulatives.set(userKey, reportedLikeCount);
    } else {
      // Normal delta burst: e.g. 1, 5, 10
      delta = Math.max(1, reportedLikeCount);
      this.userCumulatives.set(userKey, lastUserCount + delta);
    }

    // Synchronize room total likes
    let currentRoomTotal = this.roomTotals.get(sessionId) || 0;
    if (reportedTotalLikes !== undefined && reportedTotalLikes > currentRoomTotal) {
      currentRoomTotal = reportedTotalLikes;
    } else {
      currentRoomTotal += delta;
    }
    this.roomTotals.set(sessionId, currentRoomTotal);

    return {
      likeCount: delta,
      totalLikes: currentRoomTotal,
    };
  }

  getRoomTotal(sessionId: string): number {
    return this.roomTotals.get(sessionId) || 0;
  }

  reset(sessionId?: string): void {
    if (sessionId) {
      this.roomTotals.delete(sessionId);
      for (const key of Array.from(this.userCumulatives.keys())) {
        if (key.startsWith(`${sessionId}:`)) {
          this.userCumulatives.delete(key);
        }
      }
    } else {
      this.roomTotals.clear();
      this.userCumulatives.clear();
    }
  }
}
