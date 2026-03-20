import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { sortDepartmentsSchema } from '@/lib/validations/department.schema';

// PATCH /api/departments/sort - Batch update sort order
async function handler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const parsed = sortDepartmentsSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { items } = parsed.data;

    await prisma.$transaction(
      items.map((item) =>
        prisma.department.update({
          where: { id: item.id },
          data: { sortOrd: item.sortOrd, updtBy: req.user.email },
        }),
      ),
    );

    return successResponse({ message: 'Đã cập nhật thứ tự sắp xếp.' });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withRole(['ADMIN'])(handler);
