import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET /api/users - List users (ADMIN only) with pagination, search, filters
async function handler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const search = searchParams.get('search') ?? undefined;
    const roleCd = searchParams.get('roleCd') ?? undefined;
    const sttsCd = searchParams.get('sttsCd') ?? undefined;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      delYn: 'N',
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleCd) {
      where.roleCd = roleCd;
    }

    if (sttsCd) {
      where.sttsCd = sttsCd;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
      prisma.user.count({ where }),
    ]);

    return successResponse({
      items: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return errorResponse(message, 500);
  }
}

export const GET = withRole(['ADMIN'])(handler);
