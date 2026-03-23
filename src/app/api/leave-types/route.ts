import prisma from '@/lib/db';
import { withAuth, withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, ConflictError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createLeaveTypeSchema } from '@/lib/validations/leave.schema';

// GET /api/leave-types — List leave types
async function listHandler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const useYn = searchParams.get('useYn') ?? undefined;

    const where: Record<string, unknown> = {};
    if (useYn) where.useYn = useYn;

    const types = await prisma.leaveType.findMany({
      where,
      orderBy: { lvTypeCd: 'asc' },
    });

    return successResponse(types);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/leave-types — Create leave type (ADMIN)
async function createHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const parsed = createLeaveTypeSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { lvTypeCd, lvTypeNm, maxDays } = parsed.data;

    const existing = await prisma.leaveType.findUnique({ where: { lvTypeCd } });
    if (existing) {
      throw new ConflictError('Mã loại nghỉ phép đã tồn tại.');
    }

    const leaveType = await prisma.leaveType.create({
      data: { lvTypeCd, lvTypeNm, maxDays: maxDays ?? null },
    });

    return successResponse(leaveType, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(listHandler);
export const POST = withRole(['ADMIN'])(createHandler);
