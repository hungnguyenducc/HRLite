import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';

// PATCH /api/leave/[id]/cancel — Cancel leave request (owner or ADMIN)
async function handler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { id } = await context.params;

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { id: true, emplId: true, aprvlSttsCd: true },
    });
    if (!request) {
      throw new NotFoundError('Yêu cầu nghỉ phép không tồn tại.');
    }
    if (request.aprvlSttsCd !== 'PENDING') {
      return errorResponse('Chỉ có thể hủy yêu cầu đang chờ duyệt.', 400);
    }

    // Check ownership: only the requester or ADMIN can cancel
    if (req.user.role !== 'ADMIN') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.sub },
        select: { id: true },
      });
      if (!employee || employee.id !== request.emplId) {
        return errorResponse('Bạn chỉ có thể hủy yêu cầu của chính mình.', 403);
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        aprvlSttsCd: 'CANCELLED',
        updtBy: req.user.email,
      },
      select: {
        id: true,
        aprvlSttsCd: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuth(handler);
