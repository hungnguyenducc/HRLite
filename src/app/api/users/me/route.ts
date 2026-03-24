import prisma from '@/lib/db';
import { adminAuth } from '@/lib/firebase/admin';
import { withAuth, AuthenticatedRequest, SESSION_COOKIE_NAME } from '@/lib/auth/middleware';
import { updateProfileSchema } from '@/lib/auth/validation';
import { successResponse, errorResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';

// GET /api/users/me - Return current user profile
async function getHandler(req: AuthenticatedRequest) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        photoUrl: true,
        roleCd: true,
        sttsCd: true,
        lastLoginDt: true,
        creatDt: true,
      },
    });

    if (!user) {
      return errorResponse('Không tìm thấy người dùng.', 404);
    }

    return successResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      photoUrl: user.photoUrl,
      role: user.roleCd,
      status: user.sttsCd,
      lastLoginAt: user.lastLoginDt?.toISOString() ?? null,
      createdAt: user.creatDt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/users/me - Update profile fields
async function patchHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();

    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { displayName, phone, photoUrl } = parsed.data;

    const updated = await prisma.user.update({
      where: { id: req.user.sub },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(phone !== undefined && { phone }),
        ...(photoUrl !== undefined && { photoUrl }),
        updtBy: req.user.sub,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        photoUrl: true,
        roleCd: true,
        sttsCd: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/users/me - Soft delete account + Firebase delete
async function deleteHandler(req: AuthenticatedRequest) {
  try {
    const userId = req.user.sub;
    const firebaseUid = req.user.firebaseUid;
    const now = new Date();

    // Soft delete in DB
    await prisma.user.update({
      where: { id: userId },
      data: {
        delYn: 'Y',
        deleteDt: now,
        withdrawDt: now,
        email: `withdrawn_${userId}@deleted.local`,
        phone: null,
        photoUrl: null,
        sttsCd: 'WITHDRAWN',
        updtBy: userId,
      },
    });

    // Discard all legacy refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId, dscdDt: null },
      data: { dscdDt: now },
    });

    // Revoke all Firebase tokens and delete user
    try {
      await adminAuth.revokeRefreshTokens(firebaseUid);
      await adminAuth.deleteUser(firebaseUid);
    } catch (fbError) {
      // Only ignore "user not found"; other errors are logged but not blocking
      const code = (fbError as { code?: string }).code;
      if (code !== 'auth/user-not-found') {
        // In production, this should be sent to a logger service
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Firebase withdrawal error:', fbError);
        }
      }
    }

    // Clear session cookie
    const response = successResponse({ message: 'Tài khoản đã được xóa thành công.' });

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

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
