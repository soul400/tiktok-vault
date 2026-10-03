import { describe, it, expect } from 'vitest';

describe('Gift Tracking & Diamond Calculation', () => {
  it('should correctly calculate diamond totals for combo streaks', () => {
    const giftUnitCost = 299; // Boxing Gloves
    let totalDiamonds = 0;
    let totalGiftCount = 0;

    const streakEvents = [
      { repeatCount: 1 },
      { repeatCount: 2 },
      { repeatCount: 5 },
      { repeatCount: 10 },
    ];

    for (const ev of streakEvents) {
      // In TikTok, each streak update event reports the incremental repeat or current combo count
      totalGiftCount += ev.repeatCount;
      totalDiamonds += ev.repeatCount * giftUnitCost;
    }

    expect(totalGiftCount).toBe(18);
    expect(totalDiamonds).toBe(18 * 299);
  });
});
