import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalEmployees,
      activeEmployees,
      onLeaveToday,
      departments,
      checkedInToday,
      pendingLeaves,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { delYn: 'N' } }),
      this.prisma.employee.count({
        where: { delYn: 'N', emplSttsCd: 'WORKING' },
      }),
      this.prisma.leaveRequest.count({
        where: {
          aprvlSttsCd: 'APPROVED',
          startDt: { lte: today },
          endDt: { gte: today },
        },
      }),
      this.prisma.department.count({ where: { delYn: 'N', useYn: 'Y' } }),
      this.prisma.attendance.count({
        where: {
          atndDt: { gte: today, lt: tomorrow },
          employee: { delYn: 'N' },
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          aprvlSttsCd: 'PENDING',
          employee: { delYn: 'N' },
        },
      }),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      onLeaveToday,
      departments,
      checkedInToday,
      pendingLeaves,
    };
  }
}
