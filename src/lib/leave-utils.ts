import prisma from '@/lib/db';

/**
 * Calculate number of leave days between two dates, excluding weekends (Sat/Sun).
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

/**
 * Check if a leave request overlaps with existing APPROVED/PENDING requests.
 */
export async function checkOverlap(
  emplId: string,
  startDt: Date,
  endDt: Date,
  excludeId?: string,
): Promise<boolean> {
  const where: Record<string, unknown> = {
    emplId,
    aprvlSttsCd: { in: ['APPROVED', 'PENDING'] },
    OR: [{ startDt: { lte: endDt }, endDt: { gte: startDt } }],
  };
  if (excludeId) {
    where.id = { not: excludeId };
  }

  const overlap = await prisma.leaveRequest.findFirst({
    where,
    select: { id: true },
  });

  return !!overlap;
}

/**
 * Check leave balance for a given employee, leave type, and year.
 * Returns { available, remaining, used, pending }.
 */
export async function checkLeaveBalance(
  emplId: string,
  lvTypeCd: string,
  requestedDays: number,
  year: number,
): Promise<{ available: boolean; remaining: number; used: number; pending: number }> {
  const leaveType = await prisma.leaveType.findUnique({
    where: { lvTypeCd },
  });

  // Unlimited if no maxDays
  if (!leaveType?.maxDays) {
    return { available: true, remaining: Infinity, used: 0, pending: 0 };
  }

  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${year + 1}-01-01`);

  const [approvedAgg, pendingAgg] = await Promise.all([
    prisma.leaveRequest.aggregate({
      where: {
        emplId,
        lvTypeCd,
        aprvlSttsCd: 'APPROVED',
        startDt: { gte: yearStart, lt: yearEnd },
      },
      _sum: { lvDays: true },
    }),
    prisma.leaveRequest.aggregate({
      where: {
        emplId,
        lvTypeCd,
        aprvlSttsCd: 'PENDING',
        startDt: { gte: yearStart, lt: yearEnd },
      },
      _sum: { lvDays: true },
    }),
  ]);

  const used = Number(approvedAgg._sum.lvDays || 0);
  const pending = Number(pendingAgg._sum.lvDays || 0);
  const remaining = leaveType.maxDays - used - pending;

  return {
    available: remaining >= requestedDays,
    remaining,
    used,
    pending,
  };
}
