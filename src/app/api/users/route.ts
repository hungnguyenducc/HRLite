import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { errorResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';

// GET /api/users - List users (ADMIN only) with pagination, search, filters
async function handler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const search = searchParams.get('search') ?? undefined;
    const role = searchParams.get('role') ?? undefined;
    const status = searchParams.get('status') ?? undefined;

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

    if (role) {
      where.roleCd = role;
    }

    if (status) {
      where.sttsCd = status;
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

    // Map Prisma fields to frontend-expected names
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

    // Return flat structure matching frontend UsersResponse
    return NextResponse.json({
      success: true,
      data: mapped,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {

    return handleApiError(error);
  }
}

export const GET = withRole(['ADMIN'])(handler);
