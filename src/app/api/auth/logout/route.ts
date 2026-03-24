import { adminAuth } from '@/lib/firebase/admin';
import { withAuth, AuthenticatedRequest, SESSION_COOKIE_NAME } from '@/lib/auth/middleware';
import { successResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';

async function handler(req: AuthenticatedRequest, _context: { params: Promise<Record<string, string>> }) {
  try {
    // Revoke Firebase refresh tokens
    await adminAuth.revokeRefreshTokens(req.user.firebaseUid);

    // Clear session cookie
    const response = successResponse({ message: 'Đăng xuất thành công.' });

    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withAuth(handler);
