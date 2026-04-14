import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { SortDepartmentsDto } from './dto/sort-departments.dto';
import { ListDepartmentsQueryDto } from './dto/list-departments-query.dto';

export interface TreeNode {
  id: string;
  deptCd: string;
  deptNm: string;
  deptHeadNm: string | null;
  employeeCount: number;
  sortOrd: number | null;
  useYn: string;
  children: TreeNode[];
}

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ListDepartmentsQueryDto) {
    const { page = 1, limit = 20, search, useYn, parentId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { delYn: 'N' };
    if (search) {
      where.OR = [
        { deptNm: { contains: search, mode: 'insensitive' } },
        { deptCd: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (useYn) where.useYn = useYn;
    if (parentId) where.upperDeptId = parentId;

    const [departments, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        select: {
          id: true,
          deptCd: true,
          deptNm: true,
          upperDeptId: true,
          upperDept: { select: { deptNm: true } },
          deptHeadId: true,
          deptHead: { select: { emplNm: true } },
          sortOrd: true,
          useYn: true,
          creatDt: true,
          _count: { select: { employees: { where: { delYn: 'N' } } } },
        },
        skip,
        take: limit,
        orderBy: [{ sortOrd: 'asc' }, { creatDt: 'desc' }],
      }),
      this.prisma.department.count({ where }),
    ]);

    const mapped = departments.map((d) => ({
      id: d.id,
      deptCd: d.deptCd,
      deptNm: d.deptNm,
      upperDeptId: d.upperDeptId,
      upperDeptNm: d.upperDept?.deptNm ?? null,
      deptHeadId: d.deptHeadId,
      deptHeadNm: d.deptHead?.emplNm ?? null,
      sortOrd: d.sortOrd,
      useYn: d.useYn,
      employeeCount: d._count.employees,
      creatDt: d.creatDt.toISOString(),
    }));

    return {
      success: true,
      data: mapped,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        deptCd: true,
        deptNm: true,
        upperDeptId: true,
        upperDept: { select: { id: true, deptNm: true } },
        deptHeadId: true,
        deptHead: { select: { id: true, emplNm: true, posiNm: true } },
        childDepts: {
          where: { delYn: 'N' },
          select: { id: true, deptCd: true, deptNm: true },
          orderBy: { sortOrd: 'asc' },
        },
        employees: {
          where: { delYn: 'N' },
          select: { id: true, emplNo: true, emplNm: true, posiNm: true },
          orderBy: { emplNo: 'asc' },
        },
        sortOrd: true,
        useYn: true,
        creatDt: true,
        creatBy: true,
        updtDt: true,
        updtBy: true,
        delYn: true,
      },
    });

    if (!department || department.delYn === 'Y') {
      throw new NotFoundException('Phòng ban không tồn tại.');
    }

    return {
      ...department,
      employeeCount: department.employees.length,
      creatDt: department.creatDt.toISOString(),
      updtDt: department.updtDt?.toISOString() ?? null,
    };
  }

  async create(dto: CreateDepartmentDto, userEmail: string) {
    // Check unique deptCd
    const existing = await this.prisma.department.findUnique({
      where: { deptCd: dto.deptCd },
    });
    if (existing) {
      const msg =
        existing.delYn === 'Y'
          ? 'Mã phòng ban đã được sử dụng bởi phòng ban đã xóa. Vui lòng chọn mã khác.'
          : 'Mã phòng ban đã tồn tại.';
      throw new ConflictException(msg);
    }

    // Validate upperDeptId
    if (dto.upperDeptId) {
      const parent = await this.prisma.department.findUnique({
        where: { id: dto.upperDeptId },
        select: { id: true, delYn: true },
      });
      if (!parent || parent.delYn === 'Y') {
        throw new BadRequestException('Phòng ban cha không tồn tại.');
      }
    }

    // Validate deptHeadId
    if (dto.deptHeadId) {
      const head = await this.prisma.employee.findUnique({
        where: { id: dto.deptHeadId },
        select: { id: true, delYn: true },
      });
      if (!head || head.delYn === 'Y') {
        throw new BadRequestException('Nhân viên trưởng phòng không tồn tại.');
      }
    }

    return this.prisma.department.create({
      data: {
        deptCd: dto.deptCd,
        deptNm: dto.deptNm,
        upperDeptId: dto.upperDeptId ?? null,
        deptHeadId: dto.deptHeadId ?? null,
        sortOrd: dto.sortOrd ?? null,
        useYn: dto.useYn ?? 'Y',
        creatBy: userEmail,
      },
      select: {
        id: true,
        deptCd: true,
        deptNm: true,
        upperDeptId: true,
        deptHeadId: true,
        sortOrd: true,
        useYn: true,
        creatDt: true,
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto, userEmail: string) {
    const existing = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true, delYn: true },
    });
    if (!existing || existing.delYn === 'Y') {
      throw new NotFoundException('Phòng ban không tồn tại.');
    }

    // Validate upperDeptId — prevent circular reference
    if (dto.upperDeptId !== undefined) {
      if (dto.upperDeptId === id) {
        throw new BadRequestException(
          'Phòng ban không thể là cấp trên của chính mình.',
        );
      }
      if (dto.upperDeptId) {
        const parent = await this.prisma.department.findUnique({
          where: { id: dto.upperDeptId },
          select: { id: true, delYn: true },
        });
        if (!parent || parent.delYn === 'Y') {
          throw new BadRequestException('Phòng ban cha không tồn tại.');
        }
        const descendantIds = await this.getDescendantIds(id);
        if (descendantIds.includes(dto.upperDeptId)) {
          throw new BadRequestException(
            'Không thể đặt phòng ban con làm phòng ban cấp trên (vòng lặp).',
          );
        }
      }
    }

    // Validate deptHeadId
    if (dto.deptHeadId) {
      const head = await this.prisma.employee.findUnique({
        where: { id: dto.deptHeadId },
        select: { id: true, delYn: true },
      });
      if (!head || head.delYn === 'Y') {
        throw new BadRequestException('Nhân viên trưởng phòng không tồn tại.');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.deptNm !== undefined && { deptNm: dto.deptNm }),
        ...(dto.upperDeptId !== undefined && {
          upperDeptId: dto.upperDeptId ?? null,
        }),
        ...(dto.deptHeadId !== undefined && {
          deptHeadId: dto.deptHeadId ?? null,
        }),
        ...(dto.sortOrd !== undefined && { sortOrd: dto.sortOrd ?? null }),
        ...(dto.useYn !== undefined && { useYn: dto.useYn }),
        updtBy: userEmail,
      },
      select: {
        id: true,
        deptCd: true,
        deptNm: true,
        upperDeptId: true,
        deptHeadId: true,
        sortOrd: true,
        useYn: true,
      },
    });
  }

  async remove(id: string, userEmail: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        delYn: true,
        _count: {
          select: {
            employees: { where: { delYn: 'N' } },
            childDepts: { where: { delYn: 'N' } },
          },
        },
      },
    });

    if (!department || department.delYn === 'Y') {
      throw new NotFoundException('Phòng ban không tồn tại.');
    }

    if (department._count.employees > 0) {
      throw new ConflictException(
        `Phòng ban đang có ${department._count.employees} nhân viên. Vui lòng chuyển nhân viên trước khi xóa.`,
      );
    }

    if (department._count.childDepts > 0) {
      throw new ConflictException(
        `Phòng ban đang có ${department._count.childDepts} phòng ban con. Vui lòng xóa/chuyển phòng ban con trước.`,
      );
    }

    await this.prisma.department.update({
      where: { id },
      data: { delYn: 'Y', updtBy: userEmail },
    });

    return { message: 'Đã xóa phòng ban.' };
  }

  async getTree() {
    const departments = await this.prisma.department.findMany({
      where: { delYn: 'N' },
      select: {
        id: true,
        deptCd: true,
        deptNm: true,
        upperDeptId: true,
        deptHead: { select: { emplNm: true } },
        sortOrd: true,
        useYn: true,
        _count: { select: { employees: { where: { delYn: 'N' } } } },
      },
    });

    return this.buildTree(departments);
  }

  async sort(dto: SortDepartmentsDto, userEmail: string) {
    const ids = dto.items.map((item) => item.id);
    const existingCount = await this.prisma.department.count({
      where: { id: { in: ids }, delYn: 'N' },
    });
    if (existingCount !== ids.length) {
      throw new NotFoundException('Một hoặc nhiều phòng ban không tồn tại.');
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.department.update({
          where: { id: item.id },
          data: { sortOrd: item.sortOrd, updtBy: userEmail },
        }),
      ),
    );

    return { message: 'Đã cập nhật thứ tự sắp xếp.' };
  }

  private async getDescendantIds(deptId: string): Promise<string[]> {
    const allDepts = await this.prisma.department.findMany({
      where: { delYn: 'N' },
      select: { id: true, upperDeptId: true },
    });

    const childrenMap = new Map<string, string[]>();
    for (const d of allDepts) {
      if (d.upperDeptId) {
        const children = childrenMap.get(d.upperDeptId) ?? [];
        children.push(d.id);
        childrenMap.set(d.upperDeptId, children);
      }
    }

    const descendants: string[] = [];
    const queue = [deptId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = childrenMap.get(currentId) ?? [];
      for (const childId of children) {
        descendants.push(childId);
        queue.push(childId);
      }
    }

    return descendants;
  }

  private buildTree(
    departments: Array<{
      id: string;
      deptCd: string;
      deptNm: string;
      upperDeptId: string | null;
      deptHead: { emplNm: string } | null;
      sortOrd: number | null;
      useYn: string;
      _count: { employees: number };
    }>,
    parentId: string | null = null,
  ): TreeNode[] {
    return departments
      .filter((d) => d.upperDeptId === parentId)
      .sort((a, b) => (a.sortOrd ?? 999) - (b.sortOrd ?? 999))
      .map((d) => ({
        id: d.id,
        deptCd: d.deptCd,
        deptNm: d.deptNm,
        deptHeadNm: d.deptHead?.emplNm ?? null,
        employeeCount: d._count.employees,
        sortOrd: d.sortOrd,
        useYn: d.useYn,
        children: this.buildTree(departments, d.id),
      }));
  }
}
