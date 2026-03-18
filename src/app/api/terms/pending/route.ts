import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET /api/terms/pending - Return terms not yet agreed by current user
async function handler(req: AuthenticatedRequest) {
  try {
    const userId = req.user.sub;

    // Get all active terms
    const activeTerms = await prisma.terms.findMany({
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

    // Get terms already agreed by this user
    const agreedTerms = await prisma.userAgreement.findMany({
      where: { userId, agreYn: 'Y' },
      select: { trmsId: true },
    });
    const agreedIds = new Set(agreedTerms.map((a) => a.trmsId));

    // Filter to only pending (not yet agreed) terms
    const pendingTerms = activeTerms.filter((t) => !agreedIds.has(t.id));

    return successResponse(pendingTerms);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return errorResponse(message, 500);
  }
}

export const GET = withAuth(handler);
