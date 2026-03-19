import prisma from '@/lib/db';
import { withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';

// GET /api/terms — List all terms (ADMIN only, including inactive)
async function getHandler(_req: AuthenticatedRequest) {
  try {
    const terms = await prisma.terms.findMany({
      orderBy: [{ typeCd: 'asc' }, { enfcDt: 'desc' }],
    });

    const mapped = terms.map((t) => ({
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

    return successResponse(mapped);
  } catch (error) {

    return handleApiError(error);
  }
}

// POST /api/terms — Create a new term (ADMIN only)
async function postHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();

    const { type, version, title, content, required, active, effectiveDate } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return errorResponse('Tiêu đề là bắt buộc.', 400);
    }
    if (!version) {
      return errorResponse('Phiên bản là bắt buộc.', 400);
    }
    const validTypes = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'OTHER'];
    if (type && !validTypes.includes(type)) {
      return errorResponse(`Loại điều khoản không hợp lệ. Cho phép: ${validTypes.join(', ')}`, 400);
    }
    if (effectiveDate && isNaN(Date.parse(effectiveDate))) {
      return errorResponse('Ngày hiệu lực không hợp lệ.', 400);
    }

    const term = await prisma.terms.create({
      data: {
        typeCd: type || 'TERMS_OF_SERVICE',
        verNo: String(version),
        title,
        content: content || '',
        reqYn: required !== false ? 'Y' : 'N',
        actvYn: active !== false ? 'Y' : 'N',
        enfcDt: effectiveDate ? new Date(effectiveDate) : new Date(),
        creatBy: req.user.sub,
      },
    });

    return successResponse(
      {
        id: term.id,
        type: term.typeCd,
        version: term.verNo,
        title: term.title,
        required: term.reqYn === 'Y',
        active: term.actvYn === 'Y',
        effectiveDate: term.enfcDt.toISOString(),
      },
      201,
    );
  } catch (error) {

    return handleApiError(error);
  }
}

export const GET = withRole(['ADMIN'])(getHandler);
export const POST = withRole(['ADMIN'])(postHandler);
