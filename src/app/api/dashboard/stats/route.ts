import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';

async function getHandler(_req: AuthenticatedRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalEmployees,
      activeEmployees,
      onLeaveToday,
      departments,
      checkedInToday,
      pendingLeaves,
    ] = await Promise.all([
      prisma.employee.count({
        where: { delYn: 'N' },
      }),
      prisma.employee.count({
        where: { delYn: 'N', emplSttsCd: 'WORKING' },
      }),
      prisma.leaveRequest.count({
        where: {
          aprvlSttsCd: 'APPROVED',
          startDt: { lte: today },
          endDt: { gte: today },
        },
      }),
      prisma.department.count({
        where: { delYn: 'N', useYn: 'Y' },
      }),
      prisma.attendance.count({
        where: {
          atndDt: { gte: today, lt: tomorrow },
          employee: { delYn: 'N' },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          aprvlSttsCd: 'PENDING',
          employee: { delYn: 'N' },
        },
      }),
    ]);

    return successResponse({
      totalEmployees,
      activeEmployees,
      onLeaveToday,
      departments,
      checkedInToday,
      pendingLeaves,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(getHandler);
