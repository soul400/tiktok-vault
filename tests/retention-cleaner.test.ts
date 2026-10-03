import { describe, it, expect } from 'vitest';

describe('30-Day Data Retention Cutoff', () => {
  it('should identify records older than 30 days for purge while keeping fresher records', () => {
    const now = new Date('2026-09-20T12:00:00Z');
    const retentionDays = 30;

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const record1 = { id: 1, createdAt: new Date('2026-08-15T00:00:00Z') }; // 36 days old -> Purge
    const record2 = { id: 2, createdAt: new Date('2026-08-20T11:00:00Z') }; // 31 days old -> Purge
    const record3 = { id: 3, createdAt: new Date('2026-09-01T00:00:00Z') }; // 19 days old -> Keep
    const record4 = { id: 4, createdAt: new Date('2026-09-20T10:00:00Z') }; // 2 hours old -> Keep

    const records = [record1, record2, record3, record4];

    const toPurge = records.filter((r) => r.createdAt < cutoff);
    const toKeep = records.filter((r) => r.createdAt >= cutoff);

    expect(toPurge.map((r) => r.id)).toEqual([1, 2]);
    expect(toKeep.map((r) => r.id)).toEqual([3, 4]);
  });
});
