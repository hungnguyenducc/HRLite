import prisma from '@/lib/db';
import { withAuth, withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { updateEmployeeSchema } from '@/lib/validations/employee.schema';

type RouteContext = { params: Promise<Record<string, string>> };

// GET /api/employees/[id] - Get employee detail
async function getHandler(req: AuthenticatedRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        emplNo: true,
        emplNm: true,
        email: true,
        phoneNo: true,
        deptId: true,
        department: { select: { id: true, deptCd: true, deptNm: true } },
        posiNm: true,
        joinDt: true,
        resignDt: true,
        emplSttsCd: true,
        userId: true,
        user: { select: { id: true, email: true, roleCd: true } },
        creatDt: true,
        creatBy: true,
        updtDt: true,
        updtBy: true,
        delYn: true,
      },
    });

    if (!employee || employee.delYn === 'Y') {
      throw new NotFoundError('Nhân viên không tồn tại.');
    }

    return successResponse({
      ...employee,
      joinDt: employee.joinDt.toISOString().split('T')[0],
      resignDt: employee.resignDt?.toISOString().split('T')[0] ?? null,
      creatDt: employee.creatDt.toISOString(),
      updtDt: employee.updtDt?.toISOString() ?? null,
      user: employee.user
        ? { id: employee.user.id, email: employee.user.email, roleCd: employee.user.roleCd }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/employees/[id] - Update employee
async function updateHandler(req: AuthenticatedRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, delYn: true, emplSttsCd: true },
    });
    if (!existing || existing.delYn === 'Y') {
      throw new NotFoundError('Nhân viên không tồn tại.');
    }

    const data = parsed.data;

    // Validate email uniqueness
    if (data.email !== undefined) {
      const emailTaken = await prisma.employee.findFirst({
        where: { email: data.email, id: { not: id }, delYn: 'N' },
        select: { id: true },
      });
      if (emailTaken) {
        return errorResponse('Email đã được sử dụng bởi nhân viên khác.', 409);
      }
    }

    // Validate deptId
    if (data.deptId) {
      const dept = await prisma.department.findUnique({
        where: { id: data.deptId },
        select: { id: true, delYn: true },
      });
      if (!dept || dept.delYn === 'Y') {
        return errorResponse('Phòng ban không tồn tại.', 400);
      }
    }

    // Validate userId
    if (data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, delYn: true },
      });
      if (!user || user.delYn === 'Y') {
        return errorResponse('Tài khoản không tồn tại.', 400);
      }

      const linkedEmployee = await prisma.employee.findFirst({
        where: { userId: data.userId, id: { not: id }, delYn: 'N' },
        select: { id: true },
      });
      if (linkedEmployee) {
        return errorResponse('Tài khoản đã được liên kết với nhân viên khác.', 400);
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = { updtBy: req.user.email };

    if (data.emplNm !== undefined) updateData.emplNm = data.emplNm;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phoneNo !== undefined) updateData.phoneNo = data.phoneNo ?? null;
    if (data.deptId !== undefined) updateData.deptId = data.deptId ?? null;
    if (data.posiNm !== undefined) updateData.posiNm = data.posiNm ?? null;
    if (data.joinDt !== undefined) updateData.joinDt = new Date(data.joinDt);
    if (data.resignDt !== undefined)
      updateData.resignDt = data.resignDt ? new Date(data.resignDt) : null;
    if (data.userId !== undefined) updateData.userId = data.userId ?? null;

    // Handle status change to RESIGNED
    const needsDeptHeadCleanup =
      data.emplSttsCd === 'RESIGNED' && existing.emplSttsCd !== 'RESIGNED';

    if (data.emplSttsCd !== undefined) {
      updateData.emplSttsCd = data.emplSttsCd;

      if (needsDeptHeadCleanup && !data.resignDt) {
        updateData.resignDt = new Date();
      }
    }

    // Wrap in transaction for atomicity (dept head cleanup + employee update)
    const updated = await prisma.$transaction(async (tx) => {
      if (needsDeptHeadCleanup) {
        await tx.department.updateMany({
          where: { deptHeadId: id },
          data: { deptHeadId: null, updtBy: req.user.email },
        });
      }

      return tx.employee.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          emplNo: true,
          emplNm: true,
          email: true,
          deptId: true,
          posiNm: true,
          joinDt: true,
          resignDt: true,
          emplSttsCd: true,
        },
      });
    });

    return successResponse({
      ...updated,
      joinDt: updated.joinDt.toISOString().split('T')[0],
      resignDt: updated.resignDt?.toISOString().split('T')[0] ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/employees/[id] - Soft delete
async function deleteHandler(req: AuthenticatedRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, delYn: true, userId: true },
    });

    if (!employee || employee.delYn === 'Y') {
      throw new NotFoundError('Nhân viên không tồn tại.');
    }

    await prisma.$transaction(async (tx) => {
      // Remove department head references
      await tx.department.updateMany({
        where: { deptHeadId: id },
        data: { deptHeadId: null, updtBy: req.user.email },
      });

      // Soft delete employee and unlink user
      await tx.employee.update({
        where: { id },
        data: {
          delYn: 'Y',
          userId: null,
          updtBy: req.user.email,
        },
      });
    });

    return successResponse({ message: 'Đã xóa nhân viên.' });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withRole(['ADMIN'])(updateHandler);
export const DELETE = withRole(['ADMIN'])(deleteHandler);
