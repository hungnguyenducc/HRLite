import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ListLeaveQueryDto } from './dto/list-leave-query.dto';
import { calculateLeaveDays } from '../../common/utils/leave-utils';
import logger from '../../common/logger';

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async findAll(query: ListLeaveQueryDto, userRole: string, userId: string) {
    const {
      page = 1,
      limit = 20,
      emplId,
      deptId,
      status,
      lvTypeCd,
      year,
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Non-admin sees only own records
    if (userRole !== 'ADMIN') {
      const employee = await this.prisma.employee.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!employee) {
        return { success: true, data: [], meta: { page, limit, total: 0, totalPages: 0 } };
      }
      where.emplId = employee.id;
    } else {
      if (emplId) where.emplId = emplId;
      if (deptId) {
        where.employee = { deptId };
      }
    }

    if (status) where.aprvlSttsCd = status;
    if (lvTypeCd) where.lvTypeCd = lvTypeCd;

    if (year) {
      const startDate = new Date(Date.UTC(year, 0, 1));
      const endDate = new Date(Date.UTC(year + 1, 0, 1));
      where.startDt = { gte: startDate, lt: endDate };
    }

    const [leaveRequests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        select: {
          id: true,
          emplId: true,
          employee: {
            select: { emplNm: true, emplNo: true, department: { select: { deptNm: true } } },
          },
          lvTypeCd: true,
          leaveType: { select: { lvTypeNm: true } },
          startDt: true,
          endDt: true,
          lvDays: true,
          rsn: true,
          aprvlSttsCd: true,
          aprvrId: true,
          approver: { select: { emplNm: true } },
          aprvlDt: true,
          rjctRsn: true,
          creatDt: true,
        },
        skip,
        take: limit,
        orderBy: { creatDt: sortOrder },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    const mapped = leaveRequests.map((lr) => ({
      id: lr.id,
      emplId: lr.emplId,
      emplNm: lr.employee.emplNm,
      emplNo: lr.employee.emplNo,
      deptNm: lr.employee.department?.deptNm ?? null,
      lvTypeCd: lr.lvTypeCd,
      lvTypeNm: lr.leaveType.lvTypeNm,
      startDt: lr.startDt.toISOString().split('T')[0],
      endDt: lr.endDt.toISOString().split('T')[0],
      lvDays: Number(lr.lvDays),
      rsn: lr.rsn,
      aprvlSttsCd: lr.aprvlSttsCd,
      aprvrNm: lr.approver?.emplNm ?? null,
      aprvlDt: lr.aprvlDt?.toISOString() ?? null,
      rjctRsn: lr.rjctRsn,
      creatDt: lr.creatDt.toISOString(),
    }));

    return {
      success: true,
      data: mapped,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateLeaveRequestDto, userRole: string, userId: string, userEmail: string) {
    // Resolve employee
    let emplId: string;

    if (dto.emplId && userRole === 'ADMIN') {
      // Admin creating on behalf of employee
      const employee = await this.prisma.employee.findUnique({
        where: { id: dto.emplId },
        select: { id: true, delYn: true },
      });
      if (!employee || employee.delYn === 'Y') {
        throw new NotFoundException('Nhân viên không tồn tại.');
      }
      emplId = employee.id;
    } else {
      // Self-request
      const employee = await this.prisma.employee.findUnique({
        where: { userId },
        select: { id: true, delYn: true },
      });
      if (!employee || employee.delYn === 'Y') {
        throw new BadRequestException('Không tìm thấy nhân viên liên kết với tài khoản.');
      }
      emplId = employee.id;
    }

    // Validate leave type
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { lvTypeCd: dto.lvTypeCd },
      select: { lvTypeCd: true, lvTypeNm: true, maxDays: true, useYn: true },
    });
    if (!leaveType || leaveType.useYn !== 'Y') {
      throw new BadRequestException('Loại nghỉ phép không hợp lệ.');
    }

    const startDt = new Date(dto.startDt);
    const endDt = new Date(dto.endDt);

    if (startDt > endDt) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc.');
    }

    // Non-admin: start date must be in the future
    if (userRole !== 'ADMIN') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDt < today) {
        throw new BadRequestException('Ngày bắt đầu phải từ hôm nay trở đi.');
      }
    }

    // Calculate leave days
    const lvDays = calculateLeaveDays(startDt, endDt);
    if (lvDays <= 0) {
      throw new BadRequestException('Khoảng thời gian nghỉ phép không hợp lệ (không có ngày làm việc).');
    }

    // Check overlap
    await this.checkOverlap(emplId, startDt, endDt);

    // Check leave balance
    if (leaveType.maxDays) {
      await this.checkLeaveBalance(emplId, dto.lvTypeCd, leaveType.maxDays, lvDays, startDt.getFullYear());
    }

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        emplId,
        lvTypeCd: dto.lvTypeCd,
        startDt,
        endDt,
        lvDays,
        rsn: dto.rsn,
        aprvlSttsCd: 'PENDING',
        creatBy: userEmail,
      },
      select: {
        id: true,
        emplId: true,
        lvTypeCd: true,
        startDt: true,
        endDt: true,
        lvDays: true,
        rsn: true,
        aprvlSttsCd: true,
        creatDt: true,
      },
    });

    return {
      success: true,
      data: {
        ...leaveRequest,
        startDt: leaveRequest.startDt.toISOString().split('T')[0],
        endDt: leaveRequest.endDt.toISOString().split('T')[0],
        lvDays: Number(leaveRequest.lvDays),
        creatDt: leaveRequest.creatDt.toISOString(),
      },
    };
  }

  async approve(id: string, userId: string, userEmail: string) {
    // Find approver employee
    const approver = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true, emplNm: true },
    });

    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
      select: {
        id: true,
        aprvlSttsCd: true,
        employee: { select: { email: true, emplNm: true } },
        leaveType: { select: { lvTypeNm: true } },
        lvTypeCd: true,
        startDt: true,
        endDt: true,
        lvDays: true,
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Yêu cầu nghỉ phép không tồn tại.');
    }
    if (leaveRequest.aprvlSttsCd !== 'PENDING') {
      throw new ConflictException('Yêu cầu nghỉ phép không ở trạng thái chờ duyệt.');
    }

    await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        aprvlSttsCd: 'APPROVED',
        aprvrId: approver?.id ?? null,
        aprvlDt: new Date(),
        updtBy: userEmail,
      },
    });

    // Fire-and-forget email
    this.emailService.sendLeaveApprovedEmail({
      employeeEmail: leaveRequest.employee.email,
      employeeName: leaveRequest.employee.emplNm,
      leaveType: leaveRequest.leaveType.lvTypeNm,
      startDate: leaveRequest.startDt.toISOString().split('T')[0],
      endDate: leaveRequest.endDt.toISOString().split('T')[0],
      days: Number(leaveRequest.lvDays),
      approverName: approver?.emplNm ?? userEmail,
    });

    return { success: true, data: { message: 'Đã phê duyệt yêu cầu nghỉ phép.' } };
  }

  async reject(id: string, reason: string | undefined, userId: string, userEmail: string) {
    const approver = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true, emplNm: true },
    });

    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
      select: {
        id: true,
        aprvlSttsCd: true,
        employee: { select: { email: true, emplNm: true } },
        leaveType: { select: { lvTypeNm: true } },
        lvTypeCd: true,
        startDt: true,
        endDt: true,
        lvDays: true,
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Yêu cầu nghỉ phép không tồn tại.');
    }
    if (leaveRequest.aprvlSttsCd !== 'PENDING') {
      throw new ConflictException('Yêu cầu nghỉ phép không ở trạng thái chờ duyệt.');
    }

    await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        aprvlSttsCd: 'REJECTED',
        aprvrId: approver?.id ?? null,
        aprvlDt: new Date(),
        rjctRsn: reason ?? null,
        updtBy: userEmail,
      },
    });

    // Fire-and-forget email
    this.emailService.sendLeaveRejectedEmail({
      employeeEmail: leaveRequest.employee.email,
      employeeName: leaveRequest.employee.emplNm,
      leaveType: leaveRequest.leaveType.lvTypeNm,
      startDate: leaveRequest.startDt.toISOString().split('T')[0],
      endDate: leaveRequest.endDt.toISOString().split('T')[0],
      days: Number(leaveRequest.lvDays),
      approverName: approver?.emplNm ?? userEmail,
      reason,
    });

    return { success: true, data: { message: 'Đã từ chối yêu cầu nghỉ phép.' } };
  }

  async cancel(id: string, userRole: string, userId: string, userEmail: string) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
      select: {
        id: true,
        emplId: true,
        aprvlSttsCd: true,
        employee: { select: { userId: true } },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Yêu cầu nghỉ phép không tồn tại.');
    }

    // Check ownership or ADMIN
    if (userRole !== 'ADMIN' && leaveRequest.employee.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy yêu cầu này.');
    }

    if (leaveRequest.aprvlSttsCd !== 'PENDING') {
      throw new BadRequestException('Chỉ có thể hủy yêu cầu đang ở trạng thái chờ duyệt.');
    }

    await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        aprvlSttsCd: 'CANCELLED',
        updtBy: userEmail,
      },
    });

    return { success: true, data: { message: 'Đã hủy yêu cầu nghỉ phép.' } };
  }

  async getBalance(emplId: string | undefined, userId: string, userRole: string, year: number) {
    // Resolve employee
    let resolvedEmplId: string;

    if (emplId && userRole === 'ADMIN') {
      resolvedEmplId = emplId;
    } else {
      const employee = await this.prisma.employee.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!employee) {
        throw new BadRequestException('Không tìm thấy nhân viên liên kết với tài khoản.');
      }
      resolvedEmplId = employee.id;
    }

    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { useYn: 'Y' },
      select: { lvTypeCd: true, lvTypeNm: true, maxDays: true },
    });

    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year + 1, 0, 1));

    const usedLeaves = await this.prisma.leaveRequest.groupBy({
      by: ['lvTypeCd'],
      where: {
        emplId: resolvedEmplId,
        aprvlSttsCd: { in: ['APPROVED', 'PENDING'] },
        startDt: { gte: startDate, lt: endDate },
      },
      _sum: { lvDays: true },
    });

    const usedMap = new Map(
      usedLeaves.map((u) => [u.lvTypeCd, Number(u._sum.lvDays ?? 0)]),
    );

    const balance = leaveTypes.map((lt) => {
      const used = usedMap.get(lt.lvTypeCd) ?? 0;
      const maxDays = lt.maxDays ?? null;
      const remaining = maxDays !== null ? maxDays - used : null;

      return {
        lvTypeCd: lt.lvTypeCd,
        lvTypeNm: lt.lvTypeNm,
        maxDays,
        used,
        remaining,
      };
    });

    return { success: true, data: balance };
  }

  async getStats() {
    const today = new Date();
    const todayStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const firstOfMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
    const firstOfNextMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 1));

    const nextWeek = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [onLeaveToday, pendingRequests, approvedThisMonth, upcomingLeaves] =
      await Promise.all([
        this.prisma.leaveRequest.count({
          where: {
            aprvlSttsCd: 'APPROVED',
            startDt: { lte: todayStart },
            endDt: { gte: todayStart },
          },
        }),
        this.prisma.leaveRequest.count({
          where: { aprvlSttsCd: 'PENDING' },
        }),
        this.prisma.leaveRequest.count({
          where: {
            aprvlSttsCd: 'APPROVED',
            aprvlDt: { gte: firstOfMonth, lt: firstOfNextMonth },
          },
        }),
        this.prisma.leaveRequest.count({
          where: {
            aprvlSttsCd: 'APPROVED',
            startDt: { gte: todayStart, lte: nextWeek },
          },
        }),
      ]);

    return {
      success: true,
      data: { onLeaveToday, pendingRequests, approvedThisMonth, upcomingLeaves },
    };
  }

  private async checkOverlap(emplId: string, startDt: Date, endDt: Date, excludeId?: string): Promise<void> {
    const whereClause: Record<string, unknown> = {
      emplId,
      aprvlSttsCd: { in: ['PENDING', 'APPROVED'] },
      startDt: { lte: endDt },
      endDt: { gte: startDt },
    };
    if (excludeId) {
      whereClause.id = { not: excludeId };
    }

    const overlap = await this.prisma.leaveRequest.findFirst({
      where: whereClause,
      select: { id: true },
    });

    if (overlap) {
      throw new ConflictException('Khoảng thời gian nghỉ phép bị trùng với yêu cầu đã có.');
    }
  }

  private async checkLeaveBalance(
    emplId: string,
    lvTypeCd: string,
    maxDays: number,
    requestDays: number,
    year: number,
  ): Promise<void> {
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year + 1, 0, 1));

    const used = await this.prisma.leaveRequest.aggregate({
      where: {
        emplId,
        lvTypeCd,
        aprvlSttsCd: { in: ['APPROVED', 'PENDING'] },
        startDt: { gte: startDate, lt: endDate },
      },
      _sum: { lvDays: true },
    });

    const totalUsed = Number(used._sum.lvDays ?? 0);
    if (totalUsed + requestDays > maxDays) {
      const remaining = maxDays - totalUsed;
      throw new BadRequestException(
        `Số ngày nghỉ vượt quá hạn mức. Còn lại: ${remaining} ngày, yêu cầu: ${requestDays} ngày.`,
      );
    }
  }
}
