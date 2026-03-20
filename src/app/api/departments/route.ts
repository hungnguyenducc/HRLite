import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withAuth, withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, ConflictError } from '@/lib/errors';
import { successResponse } from '@/lib/api-response';
import { createDepartmentSchema } from '@/lib/validations/department.schema';
import { errorResponse } from '@/lib/api-response';

// GET /api/departments - List departments with pagination, search, filters
async function listHandler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const search = searchParams.get('search') ?? undefined;
    const useYn = searchParams.get('useYn') ?? undefined;
    const parentId = searchParams.get('parentId') ?? undefined;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { delYn: 'N' };

    if (search) {
      where.OR = [
        { deptNm: { contains: search, mode: 'insensitive' } },
        { deptCd: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (useYn) {
      where.useYn = useYn;
    }

    if (parentId) {
      where.upperDeptId = parentId;
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        select: {
          id: true,
          deptCd: true,
          deptNm: true,
          upperDeptId: true,
          upperDept: { select: { deptNm: true } },
          deptHeadId: true,
          deptHead: { select: { emplNm: true } },
          sortOrd: true,
          useYn: true,
          creatDt: true,
          _count: { select: { employees: { where: { delYn: 'N' } } } },
        },
        skip,
        take: limit,
        orderBy: [{ sortOrd: 'asc' }, { creatDt: 'desc' }],
      }),
      prisma.department.count({ where }),
    ]);

    const mapped = departments.map((d) => ({
      id: d.id,
      deptCd: d.deptCd,
      deptNm: d.deptNm,
      upperDeptId: d.upperDeptId,
      upperDeptNm: d.upperDept?.deptNm ?? null,
      deptHeadId: d.deptHeadId,
      deptHeadNm: d.deptHead?.emplNm ?? null,
      sortOrd: d.sortOrd,
      useYn: d.useYn,
      employeeCount: d._count.employees,
      creatDt: d.creatDt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: mapped,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/departments - Create a new department
async function createHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const parsed = createDepartmentSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { deptCd, deptNm, upperDeptId, deptHeadId, sortOrd, useYn } = parsed.data;

    // Check unique deptCd (includes soft-deleted — DB unique constraint)
    const existing = await prisma.department.findUnique({ where: { deptCd } });
    if (existing) {
      const msg =
        existing.delYn === 'Y'
          ? 'Mã phòng ban đã được sử dụng bởi phòng ban đã xóa. Vui lòng chọn mã khác.'
          : 'Mã phòng ban đã tồn tại.';
      throw new ConflictError(msg);
    }

    // Validate upperDeptId exists
    if (upperDeptId) {
      const parent = await prisma.department.findUnique({
        where: { id: upperDeptId },
        select: { id: true, delYn: true },
      });
      if (!parent || parent.delYn === 'Y') {
        return errorResponse('Phòng ban cha không tồn tại.', 400);
      }
    }

    // Validate deptHeadId exists
    if (deptHeadId) {
      const head = await prisma.employee.findUnique({
        where: { id: deptHeadId },
        select: { id: true, delYn: true },
      });
      if (!head || head.delYn === 'Y') {
        return errorResponse('Nhân viên trưởng phòng không tồn tại.', 400);
      }
    }

    const department = await prisma.department.create({
      data: {
        deptCd,
        deptNm,
        upperDeptId: upperDeptId ?? null,
        deptHeadId: deptHeadId ?? null,
        sortOrd: sortOrd ?? null,
        useYn,
        creatBy: req.user.email,
      },
      select: {
        id: true,
        deptCd: true,
        deptNm: true,
        upperDeptId: true,
        deptHeadId: true,
        sortOrd: true,
        useYn: true,
        creatDt: true,
      },
    });

    return successResponse(department, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(listHandler);
export const POST = withRole(['ADMIN'])(createHandler);
