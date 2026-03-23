import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';

// PATCH /api/leave/[id]/reject — Reject leave request (ADMIN)
async function handler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { id } = await context.params;

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { id: true, aprvlSttsCd: true },
    });
    if (!request) {
      throw new NotFoundError('Yêu cầu nghỉ phép không tồn tại.');
    }
    if (request.aprvlSttsCd !== 'PENDING') {
      return errorResponse('Chỉ có thể từ chối yêu cầu đang chờ duyệt.', 400);
    }

    const adminEmpl = await prisma.employee.findUnique({
      where: { userId: req.user.sub },
      select: { id: true },
    });

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        aprvlSttsCd: 'REJECTED',
        aprvrId: adminEmpl?.id ?? null,
        aprvlDt: new Date(),
        updtBy: req.user.email,
      },
      select: {
        id: true,
        aprvlSttsCd: true,
        aprvlDt: true,
      },
    });

    return successResponse({
      ...updated,
      aprvlDt: updated.aprvlDt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withRole(['ADMIN'])(handler);
