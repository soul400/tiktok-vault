import { describe, it, expect } from 'vitest';

describe('Weekly Power-up Archive Aggregation', () => {
  it('should aggregate transactions into weekly acquired, used, and remaining balances', () => {
    const transactions = [
      { userId: 'u_ahmed', powerUpCode: 'GLOVES', type: 'ACQUIRED', qty: 5, date: '2026-09-15T10:00:00Z' },
      { userId: 'u_ahmed', powerUpCode: 'GLOVES', type: 'ACQUIRED', qty: 2, date: '2026-09-16T14:00:00Z' },
      { userId: 'u_ahmed', powerUpCode: 'GLOVES', type: 'USED', qty: -3, date: '2026-09-17T20:00:00Z' },
      { userId: 'u_ahmed', powerUpCode: 'GLOVES', type: 'USED', qty: -1, date: '2026-09-18T22:00:00Z' },
      { userId: 'u_ahmed', powerUpCode: 'THUNDER', type: 'ACQUIRED', qty: 3, date: '2026-09-17T20:00:00Z' },
      { userId: 'u_ahmed', powerUpCode: 'THUNDER', type: 'USED', qty: -1, date: '2026-09-18T22:00:00Z' },
    ];

    const weeklyMap = new Map<string, { acquired: number; used: number }>();

    for (const tx of transactions) {
      const key = `${tx.userId}:${tx.powerUpCode}`;
      let record = weeklyMap.get(key);
      if (!record) {
        record = { acquired: 0, used: 0 };
        weeklyMap.set(key, record);
      }
      if (tx.type === 'ACQUIRED') {
        record.acquired += tx.qty;
      } else if (tx.type === 'USED') {
        record.used += Math.abs(tx.qty);
      }
    }

    const gloves = weeklyMap.get('u_ahmed:GLOVES')!;
    expect(gloves.acquired).toBe(7); // 5 + 2
    expect(gloves.used).toBe(4); // 3 + 1
    const glovesRemaining = gloves.acquired - gloves.used;
    expect(glovesRemaining).toBe(3);

    const thunder = weeklyMap.get('u_ahmed:THUNDER')!;
    expect(thunder.acquired).toBe(3);
    expect(thunder.used).toBe(1);
    const thunderRemaining = thunder.acquired - thunder.used;
    expect(thunderRemaining).toBe(2);
  });
});
