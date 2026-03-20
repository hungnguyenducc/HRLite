import prisma from '@/lib/db';
import { withAuth, withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError, ConflictError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { updateDepartmentSchema } from '@/lib/validations/department.schema';

// Collect all descendant IDs in a single query + in-memory BFS
async function getDescendantIds(deptId: string): Promise<string[]> {
  const allDepts = await prisma.department.findMany({
    where: { delYn: 'N' },
    select: { id: true, upperDeptId: true },
  });

  const childrenMap = new Map<string, string[]>();
  for (const d of allDepts) {
    if (d.upperDeptId) {
      const children = childrenMap.get(d.upperDeptId) ?? [];
      children.push(d.id);
      childrenMap.set(d.upperDeptId, children);
    }
  }

  const descendants: string[] = [];
  const queue = [deptId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = childrenMap.get(currentId) ?? [];
    for (const childId of children) {
      descendants.push(childId);
      queue.push(childId);
    }
  }

  return descendants;
}

// GET /api/departments/[id] - Get department detail
async function getHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { id } = await context.params;

    const department = await prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        deptCd: true,
        deptNm: true,
        upperDeptId: true,
        upperDept: { select: { id: true, deptNm: true } },
        deptHeadId: true,
        deptHead: { select: { id: true, emplNm: true, posiNm: true } },
        childDepts: {
          where: { delYn: 'N' },
          select: { id: true, deptCd: true, deptNm: true },
          orderBy: { sortOrd: 'asc' },
        },
        employees: {
          where: { delYn: 'N' },
          select: { id: true, emplNo: true, emplNm: true, posiNm: true },
          orderBy: { emplNo: 'asc' },
        },
        sortOrd: true,
        useYn: true,
        creatDt: true,
        creatBy: true,
        updtDt: true,
        updtBy: true,
        delYn: true,
      },
    });

    if (!department || department.delYn === 'Y') {
      throw new NotFoundError('Phòng ban không tồn tại.');
    }

    return successResponse({
      ...department,
      employeeCount: department.employees.length,
      creatDt: department.creatDt.toISOString(),
      updtDt: department.updtDt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/departments/[id] - Update department
async function updateHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateDepartmentSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    // Check department exists
    const existing = await prisma.department.findUnique({
      where: { id },
      select: { id: true, delYn: true },
    });
    if (!existing || existing.delYn === 'Y') {
      throw new NotFoundError('Phòng ban không tồn tại.');
    }

    const data = parsed.data;

    // Validate upperDeptId — prevent circular reference
    if (data.upperDeptId !== undefined) {
      if (data.upperDeptId === id) {
        return errorResponse('Phòng ban không thể là cấp trên của chính mình.', 400);
      }

      if (data.upperDeptId) {
        // Check parent exists
        const parent = await prisma.department.findUnique({
          where: { id: data.upperDeptId },
          select: { id: true, delYn: true },
        });
        if (!parent || parent.delYn === 'Y') {
          return errorResponse('Phòng ban cha không tồn tại.', 400);
        }

        // Check no circular reference: new parent must not be a descendant
        const descendantIds = await getDescendantIds(id);
        if (descendantIds.includes(data.upperDeptId)) {
          return errorResponse(
            'Không thể đặt phòng ban con làm phòng ban cấp trên (vòng lặp).',
            400,
          );
        }
      }
    }

    // Validate deptHeadId exists
    if (data.deptHeadId) {
      const head = await prisma.employee.findUnique({
        where: { id: data.deptHeadId },
        select: { id: true, delYn: true },
      });
      if (!head || head.delYn === 'Y') {
        return errorResponse('Nhân viên trưởng phòng không tồn tại.', 400);
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(data.deptNm !== undefined && { deptNm: data.deptNm }),
        ...(data.upperDeptId !== undefined && { upperDeptId: data.upperDeptId ?? null }),
        ...(data.deptHeadId !== undefined && { deptHeadId: data.deptHeadId ?? null }),
        ...(data.sortOrd !== undefined && { sortOrd: data.sortOrd ?? null }),
        ...(data.useYn !== undefined && { useYn: data.useYn }),
        updtBy: req.user.email,
      },
      select: {
        id: true,
        deptCd: true,
        deptNm: true,
        upperDeptId: true,
        deptHeadId: true,
        sortOrd: true,
        useYn: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/departments/[id] - Soft delete
async function deleteHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { id } = await context.params;

    const department = await prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        delYn: true,
        _count: {
          select: {
            employees: { where: { delYn: 'N' } },
            childDepts: { where: { delYn: 'N' } },
          },
        },
      },
    });

    if (!department || department.delYn === 'Y') {
      throw new NotFoundError('Phòng ban không tồn tại.');
    }

    if (department._count.employees > 0) {
      throw new ConflictError(
        `Phòng ban đang có ${department._count.employees} nhân viên. Vui lòng chuyển nhân viên trước khi xóa.`,
      );
    }

    if (department._count.childDepts > 0) {
      throw new ConflictError(
        `Phòng ban đang có ${department._count.childDepts} phòng ban con. Vui lòng xóa/chuyển phòng ban con trước.`,
      );
    }

    await prisma.department.update({
      where: { id },
      data: { delYn: 'Y', updtBy: req.user.email },
    });

    return successResponse({ message: 'Đã xóa phòng ban.' });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withRole(['ADMIN'])(updateHandler);
export const DELETE = withRole(['ADMIN'])(deleteHandler);
