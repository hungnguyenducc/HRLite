import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';

// PATCH /api/terms/[id] — Update a term (ADMIN only)
async function patchHandler(req: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.terms.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Không tìm thấy điều khoản.', 404);
    }

    const updateData: Record<string, unknown> = {
      updtBy: req.user.sub,
    };

    if (body.type !== undefined) {
      const validTypes = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'OTHER'];
      if (!validTypes.includes(body.type)) {
        return errorResponse(`Loại điều khoản không hợp lệ. Cho phép: ${validTypes.join(', ')}`, 400);
      }
      updateData.typeCd = body.type;
    }
    if (body.version !== undefined) updateData.verNo = String(body.version);
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.required !== undefined) updateData.reqYn = body.required ? 'Y' : 'N';
    if (body.active !== undefined) updateData.actvYn = body.active ? 'Y' : 'N';
    if (body.effectiveDate !== undefined) updateData.enfcDt = new Date(body.effectiveDate);

    const updated = await prisma.terms.update({
      where: { id },
      data: updateData,
    });

    return successResponse({
      id: updated.id,
      type: updated.typeCd,
      version: updated.verNo,
      title: updated.title,
      content: updated.content,
      required: updated.reqYn === 'Y',
      active: updated.actvYn === 'Y',
      effectiveDate: updated.enfcDt.toISOString(),
    });
  } catch (error) {

    return handleApiError(error);
  }
}

// DELETE /api/terms/[id] — Soft delete a term (ADMIN only)
async function deleteHandler(req: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context.params;

    const existing = await prisma.terms.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Không tìm thấy điều khoản.', 404);
    }

    await prisma.terms.update({
      where: { id },
      data: { actvYn: 'N', updtBy: req.user.sub },
    });

    return successResponse({ message: 'Đã xóa điều khoản thành công.' });
  } catch (error) {

    return handleApiError(error);
  }
}

export const PATCH = withRole(['ADMIN'])(patchHandler);
export const DELETE = withRole(['ADMIN'])(deleteHandler);
