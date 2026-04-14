import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateProfileDto, AdminUpdateUserDto } from './dto/update-user.dto';
import logger from '../../common/logger';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private firebaseAdmin: FirebaseAdminService,
  ) {}

  async findAll(query: ListUsersQueryDto) {
    const { page = 1, limit = 20, search, role, status } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { delYn: 'N' };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.roleCd = role;
    if (status) where.sttsCd = status;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          displayName: true,
          phone: true,
          roleCd: true,
          sttsCd: true,
          lastLoginDt: true,
          creatDt: true,
        },
        skip,
        take: limit,
        orderBy: { creatDt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const mapped = users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      phone: u.phone,
      role: u.roleCd,
      status: u.sttsCd,
      lastLoginAt: u.lastLoginDt?.toISOString() ?? null,
      createdAt: u.creatDt.toISOString(),
    }));

    return {
      success: true,
      data: mapped,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        photoUrl: true,
        roleCd: true,
        sttsCd: true,
        lastLoginDt: true,
        creatDt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      photoUrl: user.photoUrl,
      role: user.roleCd,
      status: user.sttsCd,
      lastLoginAt: user.lastLoginDt?.toISOString() ?? null,
      createdAt: user.creatDt.toISOString(),
    };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        updtBy: userId,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        photoUrl: true,
        roleCd: true,
        sttsCd: true,
      },
    });
  }

  async deleteMe(userId: string, firebaseUid: string) {
    const now = new Date();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        delYn: 'Y',
        deleteDt: now,
        withdrawDt: now,
        email: `withdrawn_${userId}@deleted.local`,
        phone: null,
        photoUrl: null,
        sttsCd: 'WITHDRAWN',
        updtBy: userId,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, dscdDt: null },
      data: { dscdDt: now },
    });

    try {
      await this.firebaseAdmin.getAuth().revokeRefreshTokens(firebaseUid);
      await this.firebaseAdmin.getAuth().deleteUser(firebaseUid);
    } catch (fbError) {
      const code = (fbError as { code?: string }).code;
      if (code !== 'auth/user-not-found') {
        logger.error('Firebase withdrawal error', { error: fbError });
      }
    }

    return { message: 'Tài khoản đã được xóa thành công.' };
  }

  async adminUpdateUser(
    targetId: string,
    dto: AdminUpdateUserDto,
    currentUserId: string,
  ) {
    if (dto.role !== undefined && targetId === currentUserId) {
      throw new BadRequestException(
        'Không thể thay đổi vai trò của chính mình.',
      );
    }

    if (dto.role === undefined && dto.status === undefined) {
      throw new BadRequestException(
        'Vui lòng cung cấp ít nhất role hoặc status.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!targetUser || targetUser.delYn === 'Y') {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    const updateData: Record<string, unknown> = { updtBy: currentUserId };
    if (dto.role !== undefined) updateData.roleCd = dto.role;
    if (dto.status !== undefined) updateData.sttsCd = dto.status;

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        roleCd: true,
        sttsCd: true,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.roleCd,
      status: updated.sttsCd,
    };
  }
}
