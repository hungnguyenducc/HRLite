import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';

// PATCH /api/users/[id] — Update user role or status (ADMIN only)
async function patchHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    // Prevent admin from modifying their own role
    if (body.role !== undefined && id === req.user.sub) {
      return errorResponse('Không thể thay đổi vai trò của chính mình.', 400);
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser || targetUser.delYn === 'Y') {
      return errorResponse('Không tìm thấy người dùng.', 404);
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updtBy: req.user.sub,
    };

    if (body.role !== undefined) {
      if (!['ADMIN', 'USER'].includes(body.role)) {
        return errorResponse('Vai trò không hợp lệ.', 400);
      }
      updateData.roleCd = body.role;
    }

    if (body.status !== undefined) {
      if (!['ACTIVE', 'SUSPENDED'].includes(body.status)) {
        return errorResponse('Trạng thái không hợp lệ.', 400);
      }
      updateData.sttsCd = body.status;
    }

    // Guard: at least one field must be provided
    if (body.role === undefined && body.status === undefined) {
      return errorResponse('Vui lòng cung cấp ít nhất role hoặc status.', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        roleCd: true,
        sttsCd: true,
      },
    });

    return successResponse({
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.roleCd,
      status: updated.sttsCd,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withRole(['ADMIN'])(patchHandler);
