import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { agreeTermsSchema } from '@/lib/auth/validation';
import { successResponse, errorResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';

// POST /api/terms/agree - Create agreement records
async function handler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();

    const parsed = agreeTermsSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { termsIds } = parsed.data;
    const userId = req.user.sub;

    // Verify all terms exist and are active
    const terms = await prisma.terms.findMany({
      where: {
        id: { in: termsIds },
        actvYn: 'Y',
      },
    });

    if (terms.length !== termsIds.length) {
      return errorResponse('Một hoặc nhiều điều khoản không hợp lệ hoặc không còn hiệu lực.', 400);
    }

    // Get existing agreements to avoid duplicates
    const existingAgreements = await prisma.userAgreement.findMany({
      where: { userId, trmsId: { in: termsIds } },
      select: { trmsId: true },
    });
    const alreadyAgreedIds = existingAgreements.map((a) => a.trmsId);
    const newTermsIds = termsIds.filter((id) => !alreadyAgreedIds.includes(id));

    if (newTermsIds.length === 0) {
      return successResponse({ message: 'Tất cả điều khoản đã được đồng ý trước đó.' });
    }

    const ipAddr = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const dvcInfo = req.headers.get('user-agent') ?? undefined;

    // Create new agreement records (skipDuplicates to handle race conditions)
    await prisma.userAgreement.createMany({
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

    return successResponse({ message: 'Đã đồng ý điều khoản thành công.', agreedCount: newTermsIds.length });
  } catch (error) {

    return handleApiError(error);
  }
}

export const POST = withAuth(handler);
