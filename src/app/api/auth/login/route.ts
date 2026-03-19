import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { generateAccessToken, generateRefreshToken, hashToken } from '@/lib/auth/jwt';
import { loginSchema } from '@/lib/auth/validation';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/auth/rate-limit';
import { RateLimitError, handleApiError } from '@/lib/errors';

// Dummy hash for constant-time comparison when user not found
const DUMMY_HASH = '$2a$12$000000000000000000000uGHPOPNOGPMU0txPwWGr3JjOKSjGFUy';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 requests per minute per IP
    checkRateLimit(req, 'login', RATE_LIMITS.login);

    const body = await req.json();

    // Validate input
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { email, password } = parsed.data;
    const genericError = 'Email hoặc mật khẩu không chính xác.';

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always run bcrypt compare to prevent timing oracle
    const isValid = await verifyPassword(password, user?.passwdHash ?? DUMMY_HASH);

    // Check all auth conditions with same generic message
    if (!user || !isValid || user.delYn === 'Y' || user.sttsCd !== 'ACTIVE') {
      return errorResponse(genericError, 401);
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

    // Build response (tokens only in HttpOnly cookies, not body)
    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roleCd: user.roleCd,
      },
      pendingTerms:
        pendingTerms.length > 0
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
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    return handleApiError(error);
  }
}
