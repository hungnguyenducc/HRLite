import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createLeaveRequestSchema } from '@/lib/validations/leave.schema';
import { calculateLeaveDays, checkOverlap, checkLeaveBalance } from '@/lib/leave-utils';

// GET /api/leave — List leave requests
async function listHandler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const emplId = searchParams.get('emplId') ?? undefined;
    const deptId = searchParams.get('deptId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const lvTypeCd = searchParams.get('lvTypeCd') ?? undefined;
    const year = searchParams.get('year')
      ? parseInt(searchParams.get('year')!, 10)
      : new Date().getFullYear();
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : ('desc' as const);

    const skip = (page - 1) * limit;
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year + 1}-01-01`);

    const where: Record<string, unknown> = {
      employee: { delYn: 'N' },
      startDt: { gte: yearStart, lt: yearEnd },
    };

    // Non-admin: only own requests
    if (req.user.role !== 'ADMIN') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.sub },
        select: { id: true },
      });
      if (!employee) {
        return NextResponse.json({ success: true, data: [], meta: { page, limit, total: 0, totalPages: 0 } });
      }
      where.emplId = employee.id;
    } else {
      if (emplId) where.emplId = emplId;
      if (deptId) where.employee = { ...where.employee as object, deptId };
    }

    if (status) where.aprvlSttsCd = status;
    if (lvTypeCd) where.lvTypeCd = lvTypeCd;

    const [records, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        select: {
          id: true,
          employee: {
            select: {
              emplNo: true,
              emplNm: true,
              department: { select: { deptNm: true } },
            },
          },
          leaveType: { select: { lvTypeCd: true, lvTypeNm: true } },
          startDt: true,
          endDt: true,
          lvDays: true,
          rsn: true,
          aprvlSttsCd: true,
          approver: { select: { emplNm: true } },
          aprvlDt: true,
          creatDt: true,
        },
        skip,
        take: limit,
        orderBy: { creatDt: sortOrder },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    const mapped = records.map((r) => ({
      id: r.id,
      employee: {
        emplNo: r.employee.emplNo,
        emplNm: r.employee.emplNm,
        deptNm: r.employee.department?.deptNm ?? null,
      },
      leaveType: r.leaveType,
      startDt: r.startDt.toISOString().split('T')[0],
      endDt: r.endDt.toISOString().split('T')[0],
      lvDays: Number(r.lvDays),
      rsn: r.rsn,
      aprvlSttsCd: r.aprvlSttsCd,
      approver: r.approver?.emplNm ?? null,
      aprvlDt: r.aprvlDt?.toISOString() ?? null,
      creatDt: r.creatDt.toISOString(),
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

// POST /api/leave — Create leave request
async function createHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const parsed = createLeaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { lvTypeCd, startDt, endDt, rsn } = parsed.data;
    let { emplId } = parsed.data;

    // Resolve employee
    if (!emplId) {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.sub },
        select: { id: true, emplSttsCd: true, delYn: true },
      });
      if (!employee || employee.delYn === 'Y') {
        return errorResponse('Tài khoản chưa liên kết với nhân viên nào.', 400);
      }
      if (employee.emplSttsCd !== 'WORKING') {
        return errorResponse('Nhân viên không ở trạng thái đang làm việc.', 400);
      }
      emplId = employee.id;
    } else {
      // Admin creating on behalf
      if (req.user.role !== 'ADMIN') {
        return errorResponse('Chỉ ADMIN được tạo yêu cầu cho nhân viên khác.', 403);
      }
      const employee = await prisma.employee.findUnique({
        where: { id: emplId },
        select: { id: true, emplSttsCd: true, delYn: true },
      });
      if (!employee || employee.delYn === 'Y') {
        return errorResponse('Nhân viên không tồn tại.', 400);
      }
    }

    // Validate leave type
    const leaveType = await prisma.leaveType.findUnique({ where: { lvTypeCd } });
    if (!leaveType || leaveType.useYn !== 'Y') {
      return errorResponse('Loại nghỉ phép không tồn tại hoặc đã ngừng sử dụng.', 400);
    }

    const startDate = new Date(startDt);
    const endDate = new Date(endDt);

    // Non-admin: start date must be today or future
    if (req.user.role !== 'ADMIN') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        return errorResponse('Ngày bắt đầu phải từ hôm nay trở đi.', 400);
      }
    }

    // Calculate leave days
    const lvDays = calculateLeaveDays(startDate, endDate);
    if (lvDays === 0) {
      return errorResponse('Khoảng thời gian nghỉ không có ngày làm việc.', 400);
    }

    // Check overlap
    const hasOverlap = await checkOverlap(emplId, startDate, endDate);
    if (hasOverlap) {
      return errorResponse('Đã có yêu cầu nghỉ phép trùng ngày.', 400);
    }

    // Check balance
    const year = startDate.getFullYear();
    const balance = await checkLeaveBalance(emplId, lvTypeCd, lvDays, year);
    if (!balance.available) {
      return errorResponse(
        `Số phép còn lại không đủ. Còn ${balance.remaining} ngày, yêu cầu ${lvDays} ngày.`,
        400,
      );
    }

    const request = await prisma.leaveRequest.create({
      data: {
        emplId,
        lvTypeCd,
        startDt: startDate,
        endDt: endDate,
        lvDays,
        rsn,
        aprvlSttsCd: 'PENDING',
        creatBy: req.user.email,
      },
      select: {
        id: true,
        startDt: true,
        endDt: true,
        lvDays: true,
        aprvlSttsCd: true,
        creatDt: true,
      },
    });

    return successResponse(
      {
        ...request,
        startDt: request.startDt.toISOString().split('T')[0],
        endDt: request.endDt.toISOString().split('T')[0],
        lvDays: Number(request.lvDays),
        creatDt: request.creatDt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(listHandler);
export const POST = withAuth(createHandler);
