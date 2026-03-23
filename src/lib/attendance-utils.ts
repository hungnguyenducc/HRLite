/**
 * Calculate work hours between check-in and check-out times.
 * Returns hours rounded to 2 decimal places.
 */
export function calculateWorkHours(chkInTm: Date, chkOutTm: Date): number {
  const diffMs = chkOutTm.getTime() - chkInTm.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/**
 * Determine attendance status based on check-in time and work hours.
 * - After 09:00 → LATE
 * - Work hours < 4 → HALF_DAY
 * - Otherwise → PRESENT
 */
export function determineStatus(chkInTm: Date, workHour?: number): string {
  const hour = chkInTm.getHours();
  const minute = chkInTm.getMinutes();

  if (workHour !== undefined && workHour < 4) {
    return 'HALF_DAY';
  }

  if (hour > 9 || (hour === 9 && minute > 0)) {
    return 'LATE';
  }

  return 'PRESENT';
}

/**
 * Get today's date as start/end boundaries for querying.
 */
export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
