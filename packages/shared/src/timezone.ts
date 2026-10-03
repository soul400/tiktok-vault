/**
 * AEP — Riyadh Timezone & Date Formatting Engine
 * Strict rule: Database stores UTC. Presentation always targets Asia/Riyadh (UTC+3, Makkah Time).
 */

export const RIYADH_TIMEZONE = 'Asia/Riyadh';

/**
 * Formats any Date or UTC ISO string into Asia/Riyadh localized time string.
 * Example: "21:43:12"
 */
export function formatRiyadhTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '--:--:--';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: RIYADH_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Formats any Date or UTC ISO string into Asia/Riyadh localized full datetime string.
 * Example: "2026-09-20 21:43:12"
 */
export function formatRiyadhDateTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '----/--/-- --:--:--';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RIYADH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}

/**
 * Formats any Date or UTC ISO string into an Arabic localized human-friendly string.
 * Example: "20 سبتمبر 2026، 21:43"
 */
export function formatRiyadhArabic(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'غير معروف';

  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    timeZone: RIYADH_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Returns current UTC date as an ISO string.
 */
export function nowUtcString(): string {
  return new Date().toISOString();
}

/**
 * Calculates human duration string from seconds.
 * Example: 3665s -> "01:01:05"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return [hrs, mins, secs].map((v) => v.toString().padStart(2, '0')).join(':');
}
