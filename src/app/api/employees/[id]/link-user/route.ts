import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { linkUserSchema } from '@/lib/validations/employee.schema';

type RouteContext = { params: Promise<Record<string, string>> };

// PATCH /api/employees/[id]/link-user - Link/unlink User account
async function handler(req: AuthenticatedRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = linkUserSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    // Check employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, delYn: true, emplNm: true },
    });
    if (!employee || employee.delYn === 'Y') {
      throw new NotFoundError('Nhân viên không tồn tại.');
    }

    const { userId } = parsed.data;

    if (userId) {
      // Link: validate user exists and is not already linked
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, delYn: true },
      });
      if (!user || user.delYn === 'Y') {
        return errorResponse('Tài khoản không tồn tại.', 400);
      }

      const linkedEmployee = await prisma.employee.findFirst({
        where: { userId, id: { not: id }, delYn: 'N' },
        select: { id: true, emplNm: true },
      });
      if (linkedEmployee) {
        return errorResponse(
          `Tài khoản đã được liên kết với nhân viên "${linkedEmployee.emplNm}".`,
          400,
        );
      }

      await prisma.employee.update({
        where: { id },
        data: { userId, updtBy: req.user.email },
      });

      return successResponse({
        message: `Đã liên kết tài khoản "${user.email}" với nhân viên "${employee.emplNm}".`,
      });
    } else {
      // Unlink
      await prisma.employee.update({
        where: { id },
        data: { userId: null, updtBy: req.user.email },
      });

      return successResponse({ message: 'Đã hủy liên kết tài khoản.' });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withRole(['ADMIN'])(handler);
