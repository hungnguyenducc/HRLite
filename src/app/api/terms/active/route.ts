import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

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
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return errorResponse(message, 500);
  }
}
