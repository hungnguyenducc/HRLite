import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { successResponse } from '@/lib/api-response';

// GET /api/employees/stats - Employee statistics
async function handler(_req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const where = { delYn: 'N' };

    const [total, working, onLeave, resigned, byDepartment] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.count({ where: { ...where, emplSttsCd: 'WORKING' } }),
      prisma.employee.count({ where: { ...where, emplSttsCd: 'ON_LEAVE' } }),
      prisma.employee.count({ where: { ...where, emplSttsCd: 'RESIGNED' } }),
      prisma.department.findMany({
        where: { delYn: 'N', useYn: 'Y' },
        select: {
          deptNm: true,
          _count: { select: { employees: { where } } },
        },
        orderBy: { sortOrd: 'asc' },
      }),
    ]);

    // New employees this month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = await prisma.employee.count({
      where: { ...where, creatDt: { gte: firstOfMonth } },
    });

    return successResponse({
      total,
      working,
      onLeave,
      resigned,
      newThisMonth,
      byDepartment: byDepartment.map((d) => ({
        deptNm: d.deptNm,
        count: d._count.employees,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(handler);
