import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';

// GET /api/terms/active - Return active terms list (public endpoint)
export async function GET(_req: NextRequest) {
  try {
    const terms = await prisma.terms.findMany({
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

    return successResponse(terms);
  } catch (error) {

    return handleApiError(error);
  }
}
