import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { sendLeaveApprovedEmail } from '@/lib/email/notifications/leave-email';

// PATCH /api/leave/[id]/approve — Approve leave request (ADMIN)
async function handler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { id } = await context.params;

    // Find admin's employee record for approver
    const adminEmpl = await prisma.employee.findUnique({
      where: { userId: req.user.sub },
      select: { id: true, emplNm: true },
    });

    // Atomic check-and-update: chỉ update nếu trạng thái là PENDING
    const result = await prisma.leaveRequest.updateMany({
      where: { id, aprvlSttsCd: 'PENDING' },
      data: {
        aprvlSttsCd: 'APPROVED',
        aprvrId: adminEmpl?.id ?? null,
        aprvlDt: new Date(),
        updtBy: req.user.email,
      },
    });

    if (result.count === 0) {
      const existing = await prisma.leaveRequest.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundError('Yêu cầu nghỉ phép không tồn tại.');
      }
      return errorResponse('Chỉ có thể phê duyệt yêu cầu đang chờ duyệt.', 400);
    }

    // Query lại data đã update để trả response + gửi email
    const updated = await prisma.leaveRequest.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        aprvlSttsCd: true,
        aprvlDt: true,
        startDt: true,
        endDt: true,
        lvDays: true,
        employee: {
          select: { email: true, emplNm: true },
        },
        leaveType: {
          select: { lvTypeNm: true },
        },
      },
    });

    // Fire-and-forget: gửi email thông báo
    if (updated.employee.email) {
      sendLeaveApprovedEmail({
        employeeEmail: updated.employee.email,
        employeeName: updated.employee.emplNm,
        leaveType: updated.leaveType.lvTypeNm,
        startDate: updated.startDt.toLocaleDateString('vi-VN'),
        endDate: updated.endDt.toLocaleDateString('vi-VN'),
        days: Number(updated.lvDays),
        approverName: adminEmpl?.emplNm ?? req.user.email,
      });
    }

    return successResponse({
      id: updated.id,
      aprvlSttsCd: updated.aprvlSttsCd,
      aprvlDt: updated.aprvlDt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withRole(['ADMIN'])(handler);
