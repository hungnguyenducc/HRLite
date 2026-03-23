import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';

// GET /api/leave/stats — Leave stats for dashboard
async function handler(_req: AuthenticatedRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const [onLeaveToday, pendingRequests, approvedThisMonth, upcomingLeaves] = await Promise.all([
      // People on leave today
      prisma.leaveRequest.count({
        where: {
          aprvlSttsCd: 'APPROVED',
          startDt: { lte: today },
          endDt: { gte: today },
          employee: { delYn: 'N' },
        },
      }),
      // Pending requests
      prisma.leaveRequest.count({
        where: {
          aprvlSttsCd: 'PENDING',
          employee: { delYn: 'N' },
        },
      }),
      // Approved this month
      prisma.leaveRequest.count({
        where: {
          aprvlSttsCd: 'APPROVED',
          aprvlDt: { gte: monthStart, lt: monthEnd },
          employee: { delYn: 'N' },
        },
      }),
      // Upcoming leaves (next 7 days)
      prisma.leaveRequest.findMany({
        where: {
          aprvlSttsCd: 'APPROVED',
          startDt: { gte: today, lt: new Date(today.getTime() + 7 * 86400000) },
          employee: { delYn: 'N' },
        },
        select: {
          employee: { select: { emplNm: true } },
          leaveType: { select: { lvTypeNm: true } },
          startDt: true,
          endDt: true,
          lvDays: true,
        },
        orderBy: { startDt: 'asc' },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        onLeaveToday,
        pendingRequests,
        approvedThisMonth,
        upcomingLeaves: upcomingLeaves.map((l) => ({
          emplNm: l.employee.emplNm,
          lvTypeNm: l.leaveType.lvTypeNm,
          startDt: l.startDt.toISOString().split('T')[0],
          endDt: l.endDt.toISOString().split('T')[0],
          lvDays: Number(l.lvDays),
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(handler);
