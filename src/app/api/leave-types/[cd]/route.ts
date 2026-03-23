import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError, ConflictError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { updateLeaveTypeSchema } from '@/lib/validations/leave.schema';

// PATCH /api/leave-types/[cd] — Update leave type
async function updateHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { cd } = await context.params;

    const existing = await prisma.leaveType.findUnique({ where: { lvTypeCd: cd } });
    if (!existing) {
      throw new NotFoundError('Loại nghỉ phép không tồn tại.');
    }

    const body = await req.json();
    const parsed = updateLeaveTypeSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const updated = await prisma.leaveType.update({
      where: { lvTypeCd: cd },
      data: parsed.data,
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/leave-types/[cd] — Delete leave type (only if no requests use it)
async function deleteHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { cd } = await context.params;

    const existing = await prisma.leaveType.findUnique({ where: { lvTypeCd: cd } });
    if (!existing) {
      throw new NotFoundError('Loại nghỉ phép không tồn tại.');
    }

    const usageCount = await prisma.leaveRequest.count({ where: { lvTypeCd: cd } });
    if (usageCount > 0) {
      throw new ConflictError(
        `Không thể xóa. Có ${usageCount} yêu cầu nghỉ phép đang sử dụng loại này.`,
      );
    }

    await prisma.leaveType.delete({ where: { lvTypeCd: cd } });

    return successResponse({ message: 'Đã xóa loại nghỉ phép.' });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withRole(['ADMIN'])(updateHandler);
export const DELETE = withRole(['ADMIN'])(deleteHandler);
