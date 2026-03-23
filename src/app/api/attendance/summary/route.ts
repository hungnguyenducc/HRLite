import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';

// GET /api/attendance/summary — Monthly attendance summary per employee (ADMIN)
async function handler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month =
      searchParams.get('month') ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const deptId = searchParams.get('deptId') ?? undefined;

    const [yearStr, monStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const mon = parseInt(monStr, 10);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);

    // Count working days in month (exclude weekends)
    let workingDays = 0;
    const cur = new Date(start);
    while (cur < end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) workingDays++;
      cur.setDate(cur.getDate() + 1);
    }

    // Fetch all employees (filtered by dept if provided)
    const emplWhere: Record<string, unknown> = { delYn: 'N', emplSttsCd: 'WORKING' };
    if (deptId) emplWhere.deptId = deptId;

    const employees = await prisma.employee.findMany({
      where: emplWhere,
      select: {
        id: true,
        emplNo: true,
        emplNm: true,
        department: { select: { deptNm: true } },
        attendances: {
          where: { atndDt: { gte: start, lt: end } },
          select: { atndSttsCd: true, workHour: true },
        },
      },
      orderBy: { emplNo: 'asc' },
    });

    const summaryData = employees.map((e) => {
      let presentDays = 0;
      let lateDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let totalWorkHours = 0;

      for (const a of e.attendances) {
        switch (a.atndSttsCd) {
          case 'PRESENT':
            presentDays++;
            break;
          case 'LATE':
            lateDays++;
            break;
          case 'HALF_DAY':
            halfDays++;
            break;
          case 'ABSENT':
            absentDays++;
            break;
        }
        if (a.workHour) totalWorkHours += Number(a.workHour);
      }

      // Days without any record count as absent
      const recordedDays = e.attendances.length;
      const unrecordedAbsent = Math.max(0, workingDays - recordedDays);

      return {
        emplNo: e.emplNo,
        emplNm: e.emplNm,
        deptNm: e.department?.deptNm ?? null,
        presentDays,
        lateDays,
        halfDays,
        absentDays: absentDays + unrecordedAbsent,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      };
    });

    return NextResponse.json({
      success: true,
      data: { month, workingDays, employees: summaryData },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withRole(['ADMIN'])(handler);
