import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { determineStatus, getTodayRange } from '@/lib/attendance-utils';

// POST /api/attendance/check-in — Employee self check-in
async function handler(req: AuthenticatedRequest) {
  try {
    // Find employee linked to current user
    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.sub },
      select: { id: true, emplSttsCd: true, delYn: true },
    });

    if (!employee || employee.delYn === 'Y') {
      return errorResponse('Tài khoản chưa liên kết với nhân viên nào.', 400);
    }

    if (employee.emplSttsCd !== 'WORKING') {
      return errorResponse('Nhân viên không ở trạng thái đang làm việc.', 400);
    }

    // Check if already checked in today
    const { start, end } = getTodayRange();
    const existing = await prisma.attendance.findFirst({
      where: {
        emplId: employee.id,
        atndDt: { gte: start, lt: end },
      },
      select: { id: true },
    });

    if (existing) {
      return errorResponse('Bạn đã check-in hôm nay rồi.', 400);
    }

    const now = new Date();
    const atndSttsCd = determineStatus(now);

    const attendance = await prisma.attendance.create({
      data: {
        emplId: employee.id,
        atndDt: start,
        chkInTm: now,
        atndSttsCd,
        creatBy: req.user.email,
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

    return successResponse(
      {
        ...attendance,
        atndDt: attendance.atndDt.toISOString().split('T')[0],
        chkInTm: attendance.chkInTm?.toISOString() ?? null,
        chkOutTm: null,
        workHour: null,
      },
      201,
    );
  } catch (error) {
    // Handle unique constraint violation (race condition: double check-in)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return errorResponse('Bạn đã check-in hôm nay rồi.', 409);
    }
    return handleApiError(error);
  }
}

export const POST = withAuth(handler);
