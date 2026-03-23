import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET /api/leave/balance — Get leave balance by type for an employee
async function handler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let emplId = searchParams.get('emplId') ?? undefined;
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);

    // Resolve employee
    if (!emplId) {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.sub },
        select: { id: true },
      });
      if (!employee) {
        return errorResponse('Tài khoản chưa liên kết với nhân viên nào.', 400);
      }
      emplId = employee.id;
    } else if (req.user.role !== 'ADMIN') {
      // Non-admin can only check their own balance
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.sub },
        select: { id: true },
      });
      if (!employee || employee.id !== emplId) {
        return errorResponse('Bạn chỉ có thể xem số phép của mình.', 403);
      }
    }

    const employeeInfo = await prisma.employee.findUnique({
      where: { id: emplId },
      select: { emplNo: true, emplNm: true },
    });
    if (!employeeInfo) {
      return errorResponse('Nhân viên không tồn tại.', 400);
    }

    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year + 1}-01-01`);

    // Get all active leave types
    const leaveTypes = await prisma.leaveType.findMany({
      where: { useYn: 'Y' },
      orderBy: { lvTypeCd: 'asc' },
    });

    // Get usage per type
    const usage = await prisma.leaveRequest.groupBy({
      by: ['lvTypeCd', 'aprvlSttsCd'],
      where: {
        emplId,
        aprvlSttsCd: { in: ['APPROVED', 'PENDING'] },
        startDt: { gte: yearStart, lt: yearEnd },
      },
      _sum: { lvDays: true },
    });

    const balances = leaveTypes.map((lt) => {
      const approved = usage.find((u) => u.lvTypeCd === lt.lvTypeCd && u.aprvlSttsCd === 'APPROVED');
      const pending = usage.find((u) => u.lvTypeCd === lt.lvTypeCd && u.aprvlSttsCd === 'PENDING');
      const usedDays = Number(approved?._sum.lvDays || 0);
      const pendingDays = Number(pending?._sum.lvDays || 0);
      const remainingDays = lt.maxDays ? lt.maxDays - usedDays - pendingDays : null;

      return {
        lvTypeCd: lt.lvTypeCd,
        lvTypeNm: lt.lvTypeNm,
        maxDays: lt.maxDays,
        usedDays,
        pendingDays,
        remainingDays,
      };
    });

    return successResponse({
      year,
      emplNo: employeeInfo.emplNo,
      emplNm: employeeInfo.emplNm,
      balances,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(handler);
