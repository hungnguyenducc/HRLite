// Vietnam timezone offset (UTC+7)
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Convert a Date to Vietnam local time components.
 */
function toVietnamTime(date: Date): { hour: number; minute: number } {
  const vnTime = new Date(date.getTime() + VN_OFFSET_MS);
  return { hour: vnTime.getUTCHours(), minute: vnTime.getUTCMinutes() };
}

/**
 * Calculate work hours between check-in and check-out times.
 * Returns hours rounded to 2 decimal places.
 * Note: Does not subtract lunch break — raw elapsed hours.
 */
export function calculateWorkHours(chkInTm: Date, chkOutTm: Date): number {
  const diffMs = chkOutTm.getTime() - chkInTm.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/**
 * Determine attendance status based on check-in time (Vietnam TZ) and work hours.
 * - After 09:00 VN → LATE
 * - Work hours < 4 → HALF_DAY
 * - Otherwise → PRESENT
 */
export function determineStatus(chkInTm: Date, workHour?: number): string {
  if (workHour !== undefined && workHour < 4) {
    return 'HALF_DAY';
  }

  const { hour, minute } = toVietnamTime(chkInTm);

  if (hour > 9 || (hour === 9 && minute > 0)) {
    return 'LATE';
  }

  return 'PRESENT';
}

/**
 * Get today's date range in Vietnam timezone for querying.
 */
export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  // Calculate start of today in Vietnam timezone
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  const startUtc = new Date(
    Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()) - VN_OFFSET_MS,
  );
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { start: startUtc, end: endUtc };
}
