import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { calculateWorkHours, determineStatus, getTodayRange } from '@/lib/attendance-utils';

// POST /api/attendance/check-out — Employee self check-out
async function handler(req: AuthenticatedRequest) {
  try {
    // Find employee linked to current user
    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.sub },
      select: { id: true, delYn: true },
    });

    if (!employee || employee.delYn === 'Y') {
      return errorResponse('Tài khoản chưa liên kết với nhân viên nào.', 400);
    }

    // Find today's check-in record
    const { start, end } = getTodayRange();
    const attendance = await prisma.attendance.findFirst({
      where: {
        emplId: employee.id,
        atndDt: { gte: start, lt: end },
      },
      select: { id: true, chkInTm: true, chkOutTm: true },
    });

    if (!attendance || !attendance.chkInTm) {
      return errorResponse('Bạn chưa check-in hôm nay.', 400);
    }

    if (attendance.chkOutTm) {
      return errorResponse('Bạn đã check-out hôm nay rồi.', 400);
    }

    const now = new Date();
    const workHour = calculateWorkHours(attendance.chkInTm, now);
    const atndSttsCd = determineStatus(attendance.chkInTm, workHour);

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        chkOutTm: now,
        workHour,
        atndSttsCd,
        updtBy: req.user.email,
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

    return successResponse({
      ...updated,
      atndDt: updated.atndDt.toISOString().split('T')[0],
      chkInTm: updated.chkInTm?.toISOString() ?? null,
      chkOutTm: updated.chkOutTm?.toISOString() ?? null,
      workHour: updated.workHour ? Number(updated.workHour) : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuth(handler);
