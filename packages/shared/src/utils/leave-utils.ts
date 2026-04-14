/**
 * Calculate number of leave days between two dates, excluding weekends (Sat/Sun).
 * Pure function — no database dependency.
 */
export function calculateLeaveDays(startDt: Date, endDt: Date): number {
  let days = 0;
  const current = new Date(startDt);
  while (current <= endDt) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}
