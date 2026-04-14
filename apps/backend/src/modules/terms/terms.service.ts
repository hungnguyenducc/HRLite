import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTermsDto } from './dto/create-terms.dto';
import { UpdateTermsDto } from './dto/update-terms.dto';
import { AgreeTermsDto } from './dto/agree-terms.dto';

@Injectable()
export class TermsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const terms = await this.prisma.terms.findMany({
      orderBy: [{ typeCd: 'asc' }, { enfcDt: 'desc' }],
    });

    return terms.map((t) => ({
      id: t.id,
      type: t.typeCd,
      version: t.verNo,
      title: t.title,
      content: t.content,
      required: t.reqYn === 'Y',
      active: t.actvYn === 'Y',
      effectiveDate: t.enfcDt.toISOString(),
      createdAt: t.creatDt.toISOString(),
    }));
  }

  async create(dto: CreateTermsDto, userId: string) {
    const term = await this.prisma.terms.create({
      data: {
        typeCd: dto.type || 'TERMS_OF_SERVICE',
        verNo: String(dto.version),
        title: dto.title,
        content: dto.content || '',
        reqYn: dto.required !== false ? 'Y' : 'N',
        actvYn: dto.active !== false ? 'Y' : 'N',
        enfcDt: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
        creatBy: userId,
      },
    });

    return {
      id: term.id,
      type: term.typeCd,
      version: term.verNo,
      title: term.title,
      required: term.reqYn === 'Y',
      active: term.actvYn === 'Y',
      effectiveDate: term.enfcDt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateTermsDto, userId: string) {
    const existing = await this.prisma.terms.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy điều khoản.');
    }

    const updateData: Record<string, unknown> = { updtBy: userId };

    if (dto.type !== undefined) updateData.typeCd = dto.type;
    if (dto.version !== undefined) updateData.verNo = String(dto.version);
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.required !== undefined) updateData.reqYn = dto.required ? 'Y' : 'N';
    if (dto.active !== undefined) updateData.actvYn = dto.active ? 'Y' : 'N';
    if (dto.effectiveDate !== undefined) updateData.enfcDt = new Date(dto.effectiveDate);

    const updated = await this.prisma.terms.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      type: updated.typeCd,
      version: updated.verNo,
      title: updated.title,
      content: updated.content,
      required: updated.reqYn === 'Y',
      active: updated.actvYn === 'Y',
      effectiveDate: updated.enfcDt.toISOString(),
    };
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.terms.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy điều khoản.');
    }

    await this.prisma.terms.update({
      where: { id },
      data: { actvYn: 'N', updtBy: userId },
    });

    return { message: 'Đã xóa điều khoản thành công.' };
  }

  async findActive() {
    return this.prisma.terms.findMany({
      where: {
        actvYn: 'Y',
        enfcDt: { lte: new Date() },
      },
      select: {
        id: true,
        typeCd: true,
        verNo: true,
        title: true,
        content: true,
        reqYn: true,
        enfcDt: true,
      },
      orderBy: [{ typeCd: 'asc' }, { enfcDt: 'desc' }],
    });
  }

  async findPending(userId: string) {
    const activeTerms = await this.prisma.terms.findMany({
      where: {
        actvYn: 'Y',
        enfcDt: { lte: new Date() },
      },
      select: {
        id: true,
        typeCd: true,
        verNo: true,
        title: true,
        content: true,
        reqYn: true,
        enfcDt: true,
      },
    });

    const agreedTerms = await this.prisma.userAgreement.findMany({
      where: { userId, agreYn: 'Y' },
      select: { trmsId: true },
    });
    const agreedIds = new Set(agreedTerms.map((a) => a.trmsId));

    return activeTerms.filter((t) => !agreedIds.has(t.id));
  }

  async agree(
    dto: AgreeTermsDto,
    userId: string,
    ipAddr?: string,
    dvcInfo?: string,
  ) {
    // Verify all terms exist and are active
    const terms = await this.prisma.terms.findMany({
      where: { id: { in: dto.termsIds }, actvYn: 'Y' },
    });
    if (terms.length !== dto.termsIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều điều khoản không hợp lệ hoặc không còn hiệu lực.',
      );
    }

    // Get existing agreements to avoid duplicates
    const existingAgreements = await this.prisma.userAgreement.findMany({
      where: { userId, trmsId: { in: dto.termsIds } },
      select: { trmsId: true },
    });
    const alreadyAgreedIds = existingAgreements.map((a) => a.trmsId);
    const newTermsIds = dto.termsIds.filter(
      (id) => !alreadyAgreedIds.includes(id),
    );

    if (newTermsIds.length === 0) {
      return { message: 'Tất cả điều khoản đã được đồng ý trước đó.' };
    }

    await this.prisma.userAgreement.createMany({
      data: newTermsIds.map((trmsId) => ({
        userId,
        trmsId,
        agreYn: 'Y',
        agreDt: new Date(),
        ipAddr,
        dvcInfo,
      })),
      skipDuplicates: true,
    });

    return {
      message: 'Đã đồng ý điều khoản thành công.',
      agreedCount: newTermsIds.length,
    };
  }
}
