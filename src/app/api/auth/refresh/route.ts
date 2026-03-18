import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '@/lib/auth/jwt';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    // Extract refresh token from cookie or body
    let refreshTokenValue = req.cookies.get('refresh_token')?.value;

    if (!refreshTokenValue) {
      const body = await req.json().catch(() => null);
      refreshTokenValue = body?.refreshToken;
    }

    if (!refreshTokenValue) {
      return errorResponse('Refresh token không được cung cấp.', 400);
    }

    // Verify JWT
    const payload = await verifyRefreshToken(refreshTokenValue);
    if (!payload) {
      return errorResponse('Refresh token không hợp lệ hoặc đã hết hạn.', 401);
    }

    // Find token hash in DB
    const oldHash = await hashToken(refreshTokenValue);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tknHash: oldHash },
    });

    if (!storedToken) {
      return errorResponse('Refresh token không tồn tại.', 401);
    }

    // Check not already discarded
    if (storedToken.dscdDt) {
      // Possible token reuse attack: discard ALL tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, dscdDt: null },
        data: { dscdDt: new Date() },
      });
      return errorResponse('Refresh token đã bị thu hồi. Vui lòng đăng nhập lại.', 401);
    }

    // Verify token belongs to the claimed user
    if (storedToken.userId !== payload.sub) {
      return errorResponse('Token không hợp lệ.', 401);
    }

    // Token rotation: discard old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { dscdDt: new Date() },
    });

    // Fetch fresh user data
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.delYn === 'Y' || user.sttsCd !== 'ACTIVE') {
      return errorResponse('Tài khoản không hợp lệ.', 401);
    }

    // Generate new tokens
    const tokenPayload = { sub: user.id, email: user.email, role: user.roleCd };
    const newAccessToken = await generateAccessToken(tokenPayload);
    const newRefreshToken = await generateRefreshToken(tokenPayload);

    // Store new refresh token hash
    const newHash = await hashToken(newRefreshToken);
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tknHash: newHash,
        dvcInfo: req.headers.get('user-agent') ?? undefined,
        expryDt: refreshExpiry,
      },
    });

    // Build response
    const response = successResponse({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    // Update cookies
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return errorResponse(message, 500);
  }
}
