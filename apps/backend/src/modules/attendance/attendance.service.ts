import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { ListAttendanceQueryDto } from './dto/list-attendance-query.dto';
import { calculateWorkHours, determineStatus, getTodayRange } from '../../common/utils/attendance-utils';
import logger from '../../common/logger';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ListAttendanceQueryDto, userRole: string, userId: string) {
    const {
      page = 1,
      limit = 20,
      emplId,
      deptId,
      month,
      status,
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

    if (status) where.atndSttsCd = status;

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const startDate = new Date(Date.UTC(year, mon - 1, 1));
      const endDate = new Date(Date.UTC(year, mon, 1));
      where.atndDt = { gte: startDate, lt: endDate };
    }

    const [attendances, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        select: {
          id: true,
          emplId: true,
          employee: {
            select: { emplNm: true, emplNo: true, department: { select: { deptNm: true } } },
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
      this.prisma.attendance.count({ where }),
    ]);

    const mapped = attendances.map((a) => ({
      id: a.id,
      emplId: a.emplId,
      emplNm: a.employee.emplNm,
      emplNo: a.employee.emplNo,
      deptNm: a.employee.department?.deptNm ?? null,
      atndDt: a.atndDt.toISOString().split('T')[0],
      chkInTm: a.chkInTm?.toISOString() ?? null,
      chkOutTm: a.chkOutTm?.toISOString() ?? null,
      workHour: a.workHour ? Number(a.workHour) : null,
      atndSttsCd: a.atndSttsCd,
      rmk: a.rmk,
      creatDt: a.creatDt.toISOString(),
    }));

    return {
      success: true,
      data: mapped,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateAttendanceDto, userEmail: string) {
    // Validate employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.emplId },
      select: { id: true, delYn: true },
    });
    if (!employee || employee.delYn === 'Y') {
      throw new NotFoundException('Nhân viên không tồn tại.');
    }

    // Check unique (emplId, atndDt)
    const existing = await this.prisma.attendance.findUnique({
      where: { emplId_atndDt: { emplId: dto.emplId, atndDt: new Date(dto.atndDt) } },
    });
    if (existing) {
      throw new ConflictException('Bản ghi chấm công đã tồn tại cho ngày này.');
    }

    // Calculate workHour if both check-in/out provided
    let workHour: number | null = null;
    if (dto.chkInTm && dto.chkOutTm) {
      workHour = calculateWorkHours(new Date(dto.chkInTm), new Date(dto.chkOutTm));
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        emplId: dto.emplId,
        atndDt: new Date(dto.atndDt),
        chkInTm: dto.chkInTm ? new Date(dto.chkInTm) : null,
        chkOutTm: dto.chkOutTm ? new Date(dto.chkOutTm) : null,
        workHour,
        atndSttsCd: dto.atndSttsCd,
        rmk: dto.rmk ?? null,
        creatBy: userEmail,
      },
      select: {
        id: true,
        emplId: true,
        atndDt: true,
        chkInTm: true,
        chkOutTm: true,
        workHour: true,
        atndSttsCd: true,
        rmk: true,
        creatDt: true,
      },
    });

    return {
      success: true,
      data: {
        ...attendance,
        atndDt: attendance.atndDt.toISOString().split('T')[0],
        chkInTm: attendance.chkInTm?.toISOString() ?? null,
        chkOutTm: attendance.chkOutTm?.toISOString() ?? null,
        workHour: attendance.workHour ? Number(attendance.workHour) : null,
        creatDt: attendance.creatDt.toISOString(),
      },
    };
  }

  async update(id: string, dto: UpdateAttendanceDto, userEmail: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
      select: { id: true, chkInTm: true, chkOutTm: true },
    });
    if (!existing) {
      throw new NotFoundException('Bản ghi chấm công không tồn tại.');
    }

    const updateData: Record<string, unknown> = { updtBy: userEmail };
    if (dto.chkInTm !== undefined) updateData.chkInTm = dto.chkInTm ? new Date(dto.chkInTm) : null;
    if (dto.chkOutTm !== undefined) updateData.chkOutTm = dto.chkOutTm ? new Date(dto.chkOutTm) : null;
    if (dto.atndSttsCd !== undefined) updateData.atndSttsCd = dto.atndSttsCd;
    if (dto.rmk !== undefined) updateData.rmk = dto.rmk ?? null;

    // Recalculate workHour
    const finalChkIn = dto.chkInTm !== undefined ? (dto.chkInTm ? new Date(dto.chkInTm) : null) : existing.chkInTm;
    const finalChkOut = dto.chkOutTm !== undefined ? (dto.chkOutTm ? new Date(dto.chkOutTm) : null) : existing.chkOutTm;
    if (finalChkIn && finalChkOut) {
      updateData.workHour = calculateWorkHours(finalChkIn, finalChkOut);
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        emplId: true,
        atndDt: true,
        chkInTm: true,
        chkOutTm: true,
        workHour: true,
        atndSttsCd: true,
        rmk: true,
      },
    });

    return {
      success: true,
      data: {
        ...updated,
        atndDt: updated.atndDt.toISOString().split('T')[0],
        chkInTm: updated.chkInTm?.toISOString() ?? null,
        chkOutTm: updated.chkOutTm?.toISOString() ?? null,
        workHour: updated.workHour ? Number(updated.workHour) : null,
      },
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Bản ghi chấm công không tồn tại.');
    }

    await this.prisma.attendance.delete({ where: { id } });

    return { success: true, data: { message: 'Đã xóa bản ghi chấm công.' } };
  }

  async checkIn(userId: string, userEmail: string) {
    // Find employee by userId
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true, emplNm: true, delYn: true },
    });
    if (!employee || employee.delYn === 'Y') {
      throw new BadRequestException('Không tìm thấy nhân viên liên kết với tài khoản.');
    }

    const { start, end } = getTodayRange();
    const vnNow = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    const atndDt = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()));

    const now = new Date();
    const status = determineStatus(now);

    try {
      const attendance = await this.prisma.attendance.create({
        data: {
          emplId: employee.id,
          atndDt,
          chkInTm: now,
          atndSttsCd: status,
          creatBy: userEmail,
        },
        select: {
          id: true,
          emplId: true,
          atndDt: true,
          chkInTm: true,
          chkOutTm: true,
          workHour: true,
          atndSttsCd: true,
          creatDt: true,
        },
      });

      return {
        success: true,
        data: {
          ...attendance,
          atndDt: attendance.atndDt.toISOString().split('T')[0],
          chkInTm: attendance.chkInTm?.toISOString() ?? null,
          chkOutTm: attendance.chkOutTm?.toISOString() ?? null,
          workHour: attendance.workHour ? Number(attendance.workHour) : null,
          creatDt: attendance.creatDt.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Bạn đã chấm công vào hôm nay rồi.');
      }
      throw error;
    }
  }

  async checkOut(userId: string, userEmail: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true, delYn: true },
    });
    if (!employee || employee.delYn === 'Y') {
      throw new BadRequestException('Không tìm thấy nhân viên liên kết với tài khoản.');
    }

    const { start, end } = getTodayRange();
    const vnNow = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    const atndDt = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()));

    const todayRecord = await this.prisma.attendance.findUnique({
      where: { emplId_atndDt: { emplId: employee.id, atndDt } },
    });
    if (!todayRecord) {
      throw new BadRequestException('Chưa có bản ghi chấm công vào hôm nay.');
    }
    if (todayRecord.chkOutTm) {
      throw new ConflictException('Bạn đã chấm công ra hôm nay rồi.');
    }

    const now = new Date();
    let workHour: number | null = null;
    let atndSttsCd = todayRecord.atndSttsCd;

    if (todayRecord.chkInTm) {
      workHour = calculateWorkHours(todayRecord.chkInTm, now);
      atndSttsCd = determineStatus(todayRecord.chkInTm, workHour);
    }

    const updated = await this.prisma.attendance.update({
      where: { id: todayRecord.id },
      data: {
        chkOutTm: now,
        workHour,
        atndSttsCd,
        updtBy: userEmail,
      },
      select: {
        id: true,
        emplId: true,
        atndDt: true,
        chkInTm: true,
        chkOutTm: true,
        workHour: true,
        atndSttsCd: true,
      },
    });

    return {
      success: true,
      data: {
        ...updated,
        atndDt: updated.atndDt.toISOString().split('T')[0],
        chkInTm: updated.chkInTm?.toISOString() ?? null,
        chkOutTm: updated.chkOutTm?.toISOString() ?? null,
        workHour: updated.workHour ? Number(updated.workHour) : null,
      },
    };
  }

  async getToday(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true, delYn: true },
    });
    if (!employee || employee.delYn === 'Y') {
      return { success: true, data: null };
    }

    const { start, end } = getTodayRange();
    const vnNow = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    const atndDt = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()));

    const attendance = await this.prisma.attendance.findUnique({
      where: { emplId_atndDt: { emplId: employee.id, atndDt } },
      select: {
        id: true,
        emplId: true,
        atndDt: true,
        chkInTm: true,
        chkOutTm: true,
        workHour: true,
        atndSttsCd: true,
        rmk: true,
      },
    });

    if (!attendance) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        ...attendance,
        atndDt: attendance.atndDt.toISOString().split('T')[0],
        chkInTm: attendance.chkInTm?.toISOString() ?? null,
        chkOutTm: attendance.chkOutTm?.toISOString() ?? null,
        workHour: attendance.workHour ? Number(attendance.workHour) : null,
      },
    };
  }

  async getStats() {
    const totalEmployees = await this.prisma.employee.count({
      where: { delYn: 'N', emplSttsCd: 'WORKING' },
    });

    const { start, end } = getTodayRange();
    const vnNow = new Date(start.getTime() + 7 * 60 * 60 * 1000);
    const atndDt = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()));

    const todayAttendances = await this.prisma.attendance.findMany({
      where: { atndDt },
      select: { chkInTm: true, chkOutTm: true, atndSttsCd: true },
    });

    const checkedIn = todayAttendances.filter((a) => a.chkInTm).length;
    const checkedOut = todayAttendances.filter((a) => a.chkOutTm).length;
    const lateCount = todayAttendances.filter((a) => a.atndSttsCd === 'LATE').length;
    const notCheckedIn = totalEmployees - checkedIn;

    return {
      success: true,
      data: { totalEmployees, checkedIn, notCheckedIn, checkedOut, lateCount },
    };
  }

  async getSummary(month?: string, deptId?: string) {
    let startDate: Date;
    let endDate: Date;

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      startDate = new Date(Date.UTC(year, mon - 1, 1));
      endDate = new Date(Date.UTC(year, mon, 1));
    } else {
      const now = new Date();
      startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
    }

    const employeeWhere: Record<string, unknown> = { delYn: 'N' };
    if (deptId) employeeWhere.deptId = deptId;

    const employees = await this.prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        emplNm: true,
        emplNo: true,
        department: { select: { deptNm: true } },
        attendances: {
          where: { atndDt: { gte: startDate, lt: endDate } },
          select: { atndSttsCd: true, workHour: true },
        },
      },
    });

    const summary = employees.map((emp) => {
      let present = 0;
      let late = 0;
      let halfDay = 0;
      let absent = 0;
      let totalWorkHours = 0;

      for (const a of emp.attendances) {
        switch (a.atndSttsCd) {
          case 'PRESENT':
            present++;
            break;
          case 'LATE':
            late++;
            break;
          case 'HALF_DAY':
            halfDay++;
            break;
          case 'ABSENT':
            absent++;
            break;
        }
        if (a.workHour) totalWorkHours += Number(a.workHour);
      }

      return {
        emplId: emp.id,
        emplNo: emp.emplNo,
        emplNm: emp.emplNm,
        deptNm: emp.department?.deptNm ?? null,
        present,
        late,
        halfDay,
        absent,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      };
    });

    return { success: true, data: summary };
  }
}
