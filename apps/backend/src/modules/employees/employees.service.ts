import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { LinkUserDto } from './dto/link-user.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  private async generateEmployeeNo(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const prefix = 'NV-';
    const lastEmployee = await tx.employee.findFirst({
      where: { emplNo: { startsWith: prefix } },
      orderBy: { emplNo: 'desc' },
      select: { emplNo: true },
    });

    if (!lastEmployee) return `${prefix}0001`;
    const lastNumber = parseInt(lastEmployee.emplNo.replace(prefix, ''), 10);
    return `${prefix}${(lastNumber + 1).toString().padStart(4, '0')}`;
  }

  async findAll(query: ListEmployeesQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      deptId,
      status,
      position,
      sortBy = 'creatDt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { delYn: 'N' };
    if (search) {
      where.OR = [
        { emplNm: { contains: search, mode: 'insensitive' } },
        { emplNo: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (deptId) where.deptId = deptId;
    if (status) where.emplSttsCd = status;
    if (position) where.posiNm = { contains: position, mode: 'insensitive' };

    const validSortFields: Record<string, string> = {
      emplNo: 'emplNo',
      emplNm: 'emplNm',
      joinDt: 'joinDt',
      creatDt: 'creatDt',
    };
    const orderField = validSortFields[sortBy] ?? 'creatDt';

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
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
      this.prisma.employee.count({ where }),
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

    return {
      success: true,
      data: mapped,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        emplNo: true,
        emplNm: true,
        email: true,
        phoneNo: true,
        deptId: true,
        department: { select: { id: true, deptCd: true, deptNm: true } },
        posiNm: true,
        joinDt: true,
        resignDt: true,
        emplSttsCd: true,
        userId: true,
        user: { select: { id: true, email: true, roleCd: true } },
        creatDt: true,
        creatBy: true,
        updtDt: true,
        updtBy: true,
        delYn: true,
      },
    });

    if (!employee || employee.delYn === 'Y') {
      throw new NotFoundException('Nhân viên không tồn tại.');
    }

    return {
      ...employee,
      joinDt: employee.joinDt.toISOString().split('T')[0],
      resignDt: employee.resignDt?.toISOString().split('T')[0] ?? null,
      creatDt: employee.creatDt.toISOString(),
      updtDt: employee.updtDt?.toISOString() ?? null,
      user: employee.user ?? null,
    };
  }

  async create(dto: CreateEmployeeDto, userEmail: string) {
    // Check unique email
    const existingEmail = await this.prisma.employee.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail && existingEmail.delYn === 'N') {
      throw new ConflictException('Email đã được sử dụng bởi nhân viên khác.');
    }

    // Validate deptId
    if (dto.deptId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.deptId },
        select: { id: true, delYn: true },
      });
      if (!dept || dept.delYn === 'Y') {
        throw new BadRequestException('Phòng ban không tồn tại.');
      }
    }

    // Validate userId
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, delYn: true },
      });
      if (!user || user.delYn === 'Y') {
        throw new BadRequestException('Tài khoản không tồn tại.');
      }
      const linkedEmployee = await this.prisma.employee.findUnique({
        where: { userId: dto.userId },
        select: { id: true, delYn: true },
      });
      if (linkedEmployee && linkedEmployee.delYn === 'N') {
        throw new BadRequestException(
          'Tài khoản đã được liên kết với nhân viên khác.',
        );
      }
    }

    const employee = await this.prisma.$transaction(async (tx) => {
      const emplNo = await this.generateEmployeeNo(tx);
      return tx.employee.create({
        data: {
          emplNo,
          emplNm: dto.emplNm,
          email: dto.email,
          phoneNo: dto.phoneNo ?? null,
          deptId: dto.deptId ?? null,
          posiNm: dto.posiNm ?? null,
          joinDt: new Date(dto.joinDt),
          resignDt: dto.resignDt ? new Date(dto.resignDt) : null,
          emplSttsCd: dto.emplSttsCd ?? 'WORKING',
          userId: dto.userId ?? null,
          creatBy: userEmail,
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
    });

    return {
      ...employee,
      joinDt: employee.joinDt.toISOString().split('T')[0],
      creatDt: employee.creatDt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateEmployeeDto, userEmail: string) {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true, delYn: true, emplSttsCd: true },
    });
    if (!existing || existing.delYn === 'Y') {
      throw new NotFoundException('Nhân viên không tồn tại.');
    }

    if (dto.email !== undefined) {
      const emailTaken = await this.prisma.employee.findFirst({
        where: { email: dto.email, id: { not: id }, delYn: 'N' },
        select: { id: true },
      });
      if (emailTaken) {
        throw new ConflictException(
          'Email đã được sử dụng bởi nhân viên khác.',
        );
      }
    }

    if (dto.deptId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.deptId },
        select: { id: true, delYn: true },
      });
      if (!dept || dept.delYn === 'Y') {
        throw new BadRequestException('Phòng ban không tồn tại.');
      }
    }

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, delYn: true },
      });
      if (!user || user.delYn === 'Y') {
        throw new BadRequestException('Tài khoản không tồn tại.');
      }
      const linkedEmployee = await this.prisma.employee.findFirst({
        where: { userId: dto.userId, id: { not: id }, delYn: 'N' },
        select: { id: true },
      });
      if (linkedEmployee) {
        throw new BadRequestException(
          'Tài khoản đã được liên kết với nhân viên khác.',
        );
      }
    }

    const updateData: Record<string, unknown> = { updtBy: userEmail };
    if (dto.emplNm !== undefined) updateData.emplNm = dto.emplNm;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phoneNo !== undefined) updateData.phoneNo = dto.phoneNo ?? null;
    if (dto.deptId !== undefined) updateData.deptId = dto.deptId ?? null;
    if (dto.posiNm !== undefined) updateData.posiNm = dto.posiNm ?? null;
    if (dto.joinDt !== undefined) updateData.joinDt = new Date(dto.joinDt);
    if (dto.resignDt !== undefined)
      updateData.resignDt = dto.resignDt ? new Date(dto.resignDt) : null;
    if (dto.userId !== undefined) updateData.userId = dto.userId ?? null;

    const needsDeptHeadCleanup =
      dto.emplSttsCd === 'RESIGNED' && existing.emplSttsCd !== 'RESIGNED';

    if (dto.emplSttsCd !== undefined) {
      updateData.emplSttsCd = dto.emplSttsCd;
      if (needsDeptHeadCleanup && !dto.resignDt) {
        updateData.resignDt = new Date();
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (needsDeptHeadCleanup) {
        await tx.department.updateMany({
          where: { deptHeadId: id },
          data: { deptHeadId: null, updtBy: userEmail },
        });
      }
      return tx.employee.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          emplNo: true,
          emplNm: true,
          email: true,
          deptId: true,
          posiNm: true,
          joinDt: true,
          resignDt: true,
          emplSttsCd: true,
        },
      });
    });

    return {
      ...updated,
      joinDt: updated.joinDt.toISOString().split('T')[0],
      resignDt: updated.resignDt?.toISOString().split('T')[0] ?? null,
    };
  }

  async remove(id: string, userEmail: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true, delYn: true },
    });
    if (!employee || employee.delYn === 'Y') {
      throw new NotFoundException('Nhân viên không tồn tại.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.department.updateMany({
        where: { deptHeadId: id },
        data: { deptHeadId: null, updtBy: userEmail },
      });
      await tx.employee.update({
        where: { id },
        data: { delYn: 'Y', userId: null, updtBy: userEmail },
      });
    });

    return { message: 'Đã xóa nhân viên.' };
  }

  async getStats() {
    const where = { delYn: 'N' as const };

    const [total, working, onLeave, resigned, byDepartment] =
      await Promise.all([
        this.prisma.employee.count({ where }),
        this.prisma.employee.count({
          where: { ...where, emplSttsCd: 'WORKING' },
        }),
        this.prisma.employee.count({
          where: { ...where, emplSttsCd: 'ON_LEAVE' },
        }),
        this.prisma.employee.count({
          where: { ...where, emplSttsCd: 'RESIGNED' },
        }),
        this.prisma.department.findMany({
          where: { delYn: 'N', useYn: 'Y' },
          select: {
            deptNm: true,
            _count: { select: { employees: { where } } },
          },
          orderBy: { sortOrd: 'asc' },
        }),
      ]);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = await this.prisma.employee.count({
      where: { ...where, creatDt: { gte: firstOfMonth } },
    });

    return {
      total,
      working,
      onLeave,
      resigned,
      newThisMonth,
      byDepartment: byDepartment.map((d) => ({
        deptNm: d.deptNm,
        count: d._count.employees,
      })),
    };
  }

  async linkUser(id: string, dto: LinkUserDto, userEmail: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true, delYn: true, emplNm: true },
    });
    if (!employee || employee.delYn === 'Y') {
      throw new NotFoundException('Nhân viên không tồn tại.');
    }

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, email: true, delYn: true },
      });
      if (!user || user.delYn === 'Y') {
        throw new BadRequestException('Tài khoản không tồn tại.');
      }

      const linkedEmployee = await this.prisma.employee.findFirst({
        where: { userId: dto.userId, id: { not: id }, delYn: 'N' },
        select: { id: true, emplNm: true },
      });
      if (linkedEmployee) {
        throw new BadRequestException(
          `Tài khoản đã được liên kết với nhân viên "${linkedEmployee.emplNm}".`,
        );
      }

      await this.prisma.employee.update({
        where: { id },
        data: { userId: dto.userId, updtBy: userEmail },
      });

      return {
        message: `Đã liên kết tài khoản "${user.email}" với nhân viên "${employee.emplNm}".`,
      };
    } else {
      await this.prisma.employee.update({
        where: { id },
        data: { userId: null, updtBy: userEmail },
      });
      return { message: 'Đã hủy liên kết tài khoản.' };
    }
  }
}
