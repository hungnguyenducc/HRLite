import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { generateAccessToken, generateRefreshToken, hashToken } from '@/lib/auth/jwt';
import { loginSchema } from '@/lib/auth/validation';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { email, password } = parsed.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return errorResponse('Email hoặc mật khẩu không chính xác.', 401);
    }

    // Check if user is soft-deleted
    if (user.delYn === 'Y') {
      return errorResponse('Tài khoản đã bị xóa.', 401);
    }

    // Check user status
    if (user.sttsCd !== 'ACTIVE') {
      return errorResponse('Tài khoản đã bị vô hiệu hóa.', 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwdHash);
    if (!isValid) {
      return errorResponse('Email hoặc mật khẩu không chính xác.', 401);
    }

    // Check for pending required terms
    const requiredActiveTerms = await prisma.terms.findMany({
      where: { actvYn: 'Y', reqYn: 'Y' },
    });
    const agreedTerms = await prisma.userAgreement.findMany({
      where: { userId: user.id, agreYn: 'Y' },
      select: { trmsId: true },
    });
    const agreedTermsIds = agreedTerms.map((a) => a.trmsId);
    const pendingTerms = requiredActiveTerms.filter((t) => !agreedTermsIds.includes(t.id));

    // Generate tokens
    const tokenPayload = { sub: user.id, email: user.email, role: user.roleCd };
    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    // Store refresh token hash
    const dvcInfo = req.headers.get('user-agent') ?? undefined;
    const tknHash = await hashToken(refreshToken);
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tknHash,
        dvcInfo,
        expryDt: refreshExpiry,
      },
    });

    // Update lastLoginDt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginDt: new Date() },
    });

    // Build response
    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roleCd: user.roleCd,
      },
      accessToken,
      refreshToken,
      pendingTerms: pendingTerms.length > 0
        ? pendingTerms.map((t) => ({ id: t.id, typeCd: t.typeCd, title: t.title }))
        : undefined,
    });

    // Set HTTP-only cookies
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
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
