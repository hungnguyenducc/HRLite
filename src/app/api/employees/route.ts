import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withAuth, withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, ConflictError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createEmployeeSchema } from '@/lib/validations/employee.schema';

// Generate next employee number (NV-0001, NV-0002, ...)
async function generateEmployeeNo(): Promise<string> {
  const prefix = 'NV-';
  const lastEmployee = await prisma.employee.findFirst({
    where: { emplNo: { startsWith: prefix } },
    orderBy: { emplNo: 'desc' },
    select: { emplNo: true },
  });

  if (!lastEmployee) {
    return `${prefix}0001`;
  }

  const lastNumber = parseInt(lastEmployee.emplNo.replace(prefix, ''), 10);
  return `${prefix}${(lastNumber + 1).toString().padStart(4, '0')}`;
}

// GET /api/employees - List employees with pagination, search, filters
async function listHandler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const search = searchParams.get('search') ?? undefined;
    const deptId = searchParams.get('deptId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const position = searchParams.get('position') ?? undefined;
    const sortBy = searchParams.get('sortBy') ?? 'creatDt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { delYn: 'N' };

    if (search) {
      where.OR = [
        { emplNm: { contains: search, mode: 'insensitive' } },
        { emplNo: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (deptId) {
      where.deptId = deptId;
    }

    if (status) {
      where.emplSttsCd = status;
    }

    if (position) {
      where.posiNm = { contains: position, mode: 'insensitive' };
    }

    // Build orderBy
    const validSortFields: Record<string, string> = {
      emplNo: 'emplNo',
      emplNm: 'emplNm',
      joinDt: 'joinDt',
      creatDt: 'creatDt',
    };
    const orderField = validSortFields[sortBy] ?? 'creatDt';

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          id: true,
          emplNo: true,
          emplNm: true,
          email: true,
          phoneNo: true,
          deptId: true,
          department: { select: { deptNm: true } },
          posiNm: true,
          joinDt: true,
          emplSttsCd: true,
          userId: true,
          creatDt: true,
        },
        skip,
        take: limit,
        orderBy: { [orderField]: sortOrder },
      }),
      prisma.employee.count({ where }),
    ]);

    const mapped = employees.map((e) => ({
      id: e.id,
      emplNo: e.emplNo,
      emplNm: e.emplNm,
      email: e.email,
      phoneNo: e.phoneNo,
      deptId: e.deptId,
      deptNm: e.department?.deptNm ?? null,
      posiNm: e.posiNm,
      joinDt: e.joinDt.toISOString().split('T')[0],
      emplSttsCd: e.emplSttsCd,
      hasUser: !!e.userId,
      creatDt: e.creatDt.toISOString(),
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

// POST /api/employees - Create a new employee
async function createHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { emplNm, email, phoneNo, deptId, posiNm, joinDt, resignDt, emplSttsCd, userId } =
      parsed.data;

    // Check unique email
    const existingEmail = await prisma.employee.findUnique({ where: { email } });
    if (existingEmail && existingEmail.delYn === 'N') {
      throw new ConflictError('Email đã được sử dụng bởi nhân viên khác.');
    }

    // Validate deptId exists
    if (deptId) {
      const dept = await prisma.department.findUnique({
        where: { id: deptId },
        select: { id: true, delYn: true },
      });
      if (!dept || dept.delYn === 'Y') {
        return errorResponse('Phòng ban không tồn tại.', 400);
      }
    }

    // Validate userId is not already linked
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, delYn: true },
      });
      if (!user || user.delYn === 'Y') {
        return errorResponse('Tài khoản không tồn tại.', 400);
      }

      const linkedEmployee = await prisma.employee.findUnique({
        where: { userId },
        select: { id: true, delYn: true },
      });
      if (linkedEmployee && linkedEmployee.delYn === 'N') {
        return errorResponse('Tài khoản đã được liên kết với nhân viên khác.', 400);
      }
    }

    // Auto-generate employee number
    const emplNo = await generateEmployeeNo();

    const employee = await prisma.employee.create({
      data: {
        emplNo,
        emplNm,
        email,
        phoneNo: phoneNo ?? null,
        deptId: deptId ?? null,
        posiNm: posiNm ?? null,
        joinDt: new Date(joinDt),
        resignDt: resignDt ? new Date(resignDt) : null,
        emplSttsCd,
        userId: userId ?? null,
        creatBy: req.user.email,
      },
      select: {
        id: true,
        emplNo: true,
        emplNm: true,
        email: true,
        deptId: true,
        posiNm: true,
        joinDt: true,
        emplSttsCd: true,
        creatDt: true,
      },
    });

    return successResponse(
      {
        ...employee,
        joinDt: employee.joinDt.toISOString().split('T')[0],
        creatDt: employee.creatDt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(listHandler);
export const POST = withRole(['ADMIN'])(createHandler);
