import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getTodayRange } from '@/lib/attendance-utils';

// GET /api/attendance/stats — Today's attendance stats for dashboard
async function handler(_req: AuthenticatedRequest) {
  try {
    const { start, end } = getTodayRange();

    const totalEmployees = await prisma.employee.count({
      where: { delYn: 'N', emplSttsCd: 'WORKING' },
    });

    const todayRecords = await prisma.attendance.findMany({
      where: { atndDt: { gte: start, lt: end }, employee: { delYn: 'N' } },
      select: { chkOutTm: true, atndSttsCd: true },
    });

    const checkedIn = todayRecords.length;
    const checkedOut = todayRecords.filter((r) => r.chkOutTm !== null).length;
    const lateCount = todayRecords.filter((r) => r.atndSttsCd === 'LATE').length;

    return NextResponse.json({
      success: true,
      data: {
        date: start.toISOString().split('T')[0],
        totalEmployees,
        checkedIn,
        notCheckedIn: totalEmployees - checkedIn,
        checkedOut,
        lateCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(handler);
