import { describe, it, expect } from 'vitest';
import { formatRiyadhTime, formatRiyadhDateTime, formatDuration, RIYADH_TIMEZONE } from '../packages/shared/src/timezone';

describe('Asia/Riyadh Timezone Engine', () => {
  it('should format UTC timestamp into Asia/Riyadh (UTC+3) correctly', () => {
    // 12:00:00 UTC = 15:00:00 Asia/Riyadh
    const utcDate = new Date('2026-09-20T12:00:00.000Z');
    const time = formatRiyadhTime(utcDate);
    expect(time).toBe('15:00:00');
  });

  it('should format full date and time in Asia/Riyadh', () => {
    const utcDate = new Date('2026-09-20T21:30:00.000Z');
    // 21:30:00 UTC = 00:30:00 next day (2026-09-21) in Asia/Riyadh
    const dateTime = formatRiyadhDateTime(utcDate);
    expect(dateTime).toBe('2026-09-21 00:30:00');
  });

  it('should format stream duration properly', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(65)).toBe('00:01:05');
    expect(formatDuration(3665)).toBe('01:01:05');
  });
});
