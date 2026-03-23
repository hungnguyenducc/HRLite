import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { successResponse, errorResponse } from '@/lib/api-response';
import { updateAttendanceSchema } from '@/lib/validations/attendance.schema';
import { calculateWorkHours } from '@/lib/attendance-utils';

// PATCH /api/attendance/[id] — Admin updates attendance record
async function updateHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { id } = await context.params;

    const existing = await prisma.attendance.findUnique({
      where: { id },
      select: { id: true, chkInTm: true, chkOutTm: true },
    });
    if (!existing) {
      throw new NotFoundError('Bản ghi chấm công không tồn tại.');
    }

    const body = await req.json();
    const parsed = updateAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const data: Record<string, unknown> = { updtBy: req.user.email };

    if (parsed.data.chkInTm !== undefined) {
      data.chkInTm = parsed.data.chkInTm ? new Date(parsed.data.chkInTm) : null;
    }
    if (parsed.data.chkOutTm !== undefined) {
      data.chkOutTm = parsed.data.chkOutTm ? new Date(parsed.data.chkOutTm) : null;
    }
    if (parsed.data.atndSttsCd !== undefined) {
      data.atndSttsCd = parsed.data.atndSttsCd;
    }
    if (parsed.data.rmk !== undefined) {
      data.rmk = parsed.data.rmk;
    }

    // Recalculate work hours if times changed
    const finalInTm = (data.chkInTm as Date | null | undefined) ?? existing.chkInTm;
    const finalOutTm = (data.chkOutTm as Date | null | undefined) ?? existing.chkOutTm;
    if (finalInTm && finalOutTm) {
      if (finalOutTm <= finalInTm) {
        return errorResponse('Giờ ra phải sau giờ vào.', 400);
      }
      data.workHour = calculateWorkHours(finalInTm, finalOutTm);
    } else {
      data.workHour = null;
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data,
      select: {
        id: true,
        atndDt: true,
        chkInTm: true,
        chkOutTm: true,
        workHour: true,
        atndSttsCd: true,
        rmk: true,
      },
    });

    return successResponse({
      ...updated,
      atndDt: updated.atndDt.toISOString().split('T')[0],
      chkInTm: updated.chkInTm?.toISOString() ?? null,
      chkOutTm: updated.chkOutTm?.toISOString() ?? null,
      workHour: updated.workHour ? Number(updated.workHour) : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/attendance/[id] — Admin deletes attendance record (hard delete)
async function deleteHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    const { id } = await context.params;

    const existing = await prisma.attendance.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Bản ghi chấm công không tồn tại.');
    }

    await prisma.attendance.delete({ where: { id } });

    return successResponse({ message: 'Đã xóa bản ghi chấm công.' });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withRole(['ADMIN'])(updateHandler);
export const DELETE = withRole(['ADMIN'])(deleteHandler);
