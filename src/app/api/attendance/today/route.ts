import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getTodayRange } from '@/lib/attendance-utils';

// GET /api/attendance/today — Get current user's attendance status today
async function handler(req: AuthenticatedRequest) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.sub },
      select: { id: true, delYn: true },
    });

    if (!employee || employee.delYn === 'Y') {
      return errorResponse('Tài khoản chưa liên kết với nhân viên nào.', 400);
    }

    const { start, end } = getTodayRange();
    const attendance = await prisma.attendance.findFirst({
      where: {
        emplId: employee.id,
        atndDt: { gte: start, lt: end },
      },
      select: {
        id: true,
        atndDt: true,
        chkInTm: true,
        chkOutTm: true,
        workHour: true,
        atndSttsCd: true,
      },
    });

    if (!attendance) {
      return successResponse(null);
    }

    return successResponse({
      ...attendance,
      atndDt: attendance.atndDt.toISOString().split('T')[0],
      chkInTm: attendance.chkInTm?.toISOString() ?? null,
      chkOutTm: attendance.chkOutTm?.toISOString() ?? null,
      workHour: attendance.workHour ? Number(attendance.workHour) : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(handler);
