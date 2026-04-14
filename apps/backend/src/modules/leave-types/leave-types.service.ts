import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/create-leave-type.dto';

@Injectable()
export class LeaveTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll(useYn?: string) {
    const where: Record<string, unknown> = {};
    if (useYn) where.useYn = useYn;

    return this.prisma.leaveType.findMany({
      where,
      orderBy: { lvTypeCd: 'asc' },
    });
  }

  async create(dto: CreateLeaveTypeDto) {
    const existing = await this.prisma.leaveType.findUnique({
      where: { lvTypeCd: dto.lvTypeCd },
    });
    if (existing) {
      throw new ConflictException('Mã loại nghỉ phép đã tồn tại.');
    }

    return this.prisma.leaveType.create({
      data: {
        lvTypeCd: dto.lvTypeCd,
        lvTypeNm: dto.lvTypeNm,
        maxDays: dto.maxDays ?? null,
      },
    });
  }

  async update(cd: string, dto: UpdateLeaveTypeDto) {
    const existing = await this.prisma.leaveType.findUnique({
      where: { lvTypeCd: cd },
    });
    if (!existing) {
      throw new NotFoundException('Loại nghỉ phép không tồn tại.');
    }

    return this.prisma.leaveType.update({
      where: { lvTypeCd: cd },
      data: dto,
    });
  }

  async remove(cd: string) {
    const existing = await this.prisma.leaveType.findUnique({
      where: { lvTypeCd: cd },
    });
    if (!existing) {
      throw new NotFoundException('Loại nghỉ phép không tồn tại.');
    }

    const usageCount = await this.prisma.leaveRequest.count({
      where: { lvTypeCd: cd },
    });
    if (usageCount > 0) {
      throw new ConflictException(
        `Không thể xóa. Có ${usageCount} yêu cầu nghỉ phép đang sử dụng loại này.`,
      );
    }

    await this.prisma.leaveType.delete({ where: { lvTypeCd: cd } });
    return { message: 'Đã xóa loại nghỉ phép.' };
  }
}
