import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withAuth, withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, ConflictError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createAttendanceSchema } from '@/lib/validations/attendance.schema';
import { calculateWorkHours } from '@/lib/attendance-utils';

// GET /api/attendance — List attendance records
async function listHandler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const emplId = searchParams.get('emplId') ?? undefined;
    const deptId = searchParams.get('deptId') ?? undefined;
    const month = searchParams.get('month') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : ('desc' as const);

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      employee: { delYn: 'N' },
    };

    // Non-admin users can only see their own records
    if (req.user.role !== 'ADMIN') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.sub },
        select: { id: true },
      });
      if (!employee) {
        return NextResponse.json({
          success: true,
          data: [],
          meta: { page, limit, total: 0, totalPages: 0 },
        });
      }
      where.emplId = employee.id;
    } else {
      if (emplId) where.emplId = emplId;
      if (deptId) where.employee = { ...(where.employee as object), deptId };
    }

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      where.atndDt = { gte: start, lt: end };
    }

    if (status) {
      where.atndSttsCd = status;
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        select: {
          id: true,
          emplId: true,
          employee: {
            select: {
              emplNo: true,
              emplNm: true,
              department: { select: { deptNm: true } },
            },
          },
          atndDt: true,
          chkInTm: true,
          chkOutTm: true,
          workHour: true,
          atndSttsCd: true,
          rmk: true,
          creatDt: true,
        },
        skip,
        take: limit,
        orderBy: { atndDt: sortOrder },
      }),
      prisma.attendance.count({ where }),
    ]);

    const mapped = records.map((r) => ({
      id: r.id,
      emplId: r.emplId,
      employee: {
        emplNo: r.employee.emplNo,
        emplNm: r.employee.emplNm,
        deptNm: r.employee.department?.deptNm ?? null,
      },
      atndDt: r.atndDt.toISOString().split('T')[0],
      chkInTm: r.chkInTm?.toISOString() ?? null,
      chkOutTm: r.chkOutTm?.toISOString() ?? null,
      workHour: r.workHour ? Number(r.workHour) : null,
      atndSttsCd: r.atndSttsCd,
      rmk: r.rmk,
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

// POST /api/attendance — Admin creates attendance record manually
async function createHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const parsed = createAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { emplId, atndDt, chkInTm, chkOutTm, atndSttsCd, rmk } = parsed.data;

    // Validate employee exists and is WORKING
    const employee = await prisma.employee.findUnique({
      where: { id: emplId },
      select: { id: true, emplSttsCd: true, delYn: true },
    });
    if (!employee || employee.delYn === 'Y') {
      return errorResponse('Nhân viên không tồn tại.', 400);
    }

    // Check unique (emplId, atndDt)
    const atndDate = new Date(atndDt);
    const nextDay = new Date(atndDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await prisma.attendance.findFirst({
      where: {
        emplId,
        atndDt: { gte: atndDate, lt: nextDay },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError('Nhân viên đã có bản ghi chấm công ngày này.');
    }

    // Calculate work hours if both times provided
    let workHour: number | undefined;
    if (chkInTm && chkOutTm) {
      workHour = calculateWorkHours(new Date(chkInTm), new Date(chkOutTm));
    }

    const attendance = await prisma.attendance.create({
      data: {
        emplId,
        atndDt: atndDate,
        chkInTm: chkInTm ? new Date(chkInTm) : null,
        chkOutTm: chkOutTm ? new Date(chkOutTm) : null,
        workHour: workHour ?? null,
        atndSttsCd,
        rmk: rmk ?? null,
        creatBy: req.user.email,
      },
      select: {
        id: true,
        atndDt: true,
        chkInTm: true,
        chkOutTm: true,
        workHour: true,
        atndSttsCd: true,
        rmk: true,
      },
    });

    return successResponse(
      {
        ...attendance,
        atndDt: attendance.atndDt.toISOString().split('T')[0],
        chkInTm: attendance.chkInTm?.toISOString() ?? null,
        chkOutTm: attendance.chkOutTm?.toISOString() ?? null,
        workHour: attendance.workHour ? Number(attendance.workHour) : null,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(listHandler);
export const POST = withRole(['ADMIN'])(createHandler);
