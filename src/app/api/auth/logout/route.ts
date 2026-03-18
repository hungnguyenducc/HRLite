import prisma from '@/lib/db';
import { hashToken } from '@/lib/auth/jwt';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

async function handler(req: AuthenticatedRequest) {
  try {
    // Discard the current refresh token
    const refreshTokenValue = req.cookies.get('refresh_token')?.value;

    if (refreshTokenValue) {
      const tknHash = await hashToken(refreshTokenValue);
      await prisma.refreshToken.updateMany({
        where: { tknHash, dscdDt: null },
        data: { dscdDt: new Date() },
      });
    }

    // Build response and clear cookies
    const response = successResponse({ message: 'Đăng xuất thành công.' });

    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return errorResponse(message, 500);
  }
}

export const POST = withAuth(handler);
