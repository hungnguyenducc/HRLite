import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { generateAccessToken, generateRefreshToken, hashToken } from '@/lib/auth/jwt';
import { signupSchema } from '@/lib/auth/validation';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/auth/rate-limit';
import { RateLimitError, handleApiError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 requests per minute per IP
    checkRateLimit(req, 'signup', RATE_LIMITS.signup);

    const body = await req.json();

    // Validate input
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ';
      return errorResponse(firstError, 400);
    }

    const { email, password, displayName, agreedTermsIds } = parsed.data;

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return errorResponse('Email đã được sử dụng.', 409);
    }

    // Verify that all agreed terms exist and are active
    const terms = await prisma.terms.findMany({
      where: {
        id: { in: agreedTermsIds },
        actvYn: 'Y',
      },
    });
    if (terms.length !== agreedTermsIds.length) {
      return errorResponse('Một hoặc nhiều điều khoản không hợp lệ hoặc không còn hiệu lực.', 400);
    }

    // Check that all required terms are agreed
    const requiredTerms = await prisma.terms.findMany({
      where: { actvYn: 'Y', reqYn: 'Y' },
    });
    const requiredIds = requiredTerms.map((t) => t.id);
    const missingRequired = requiredIds.filter((id) => !agreedTermsIds.includes(id));
    if (missingRequired.length > 0) {
      return errorResponse('Vui lòng đồng ý tất cả các điều khoản bắt buộc.', 400);
    }

    // Hash password
    const passwdHash = await hashPassword(password);

    // Get IP address from request
    const ipAddr = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const dvcInfo = req.headers.get('user-agent') ?? undefined;

    // Create user and agreements in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwdHash,
          displayName,
          creatBy: 'SYSTEM',
        },
      });

      // Create term agreements
      await tx.userAgreement.createMany({
        data: agreedTermsIds.map((trmsId) => ({
          userId: newUser.id,
          trmsId,
          agreYn: 'Y',
          agreDt: new Date(),
          ipAddr,
          dvcInfo,
        })),
      });

      return newUser;
    });

    // Generate tokens
    const tokenPayload = { sub: user.id, email: user.email, role: user.roleCd };
    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    // Store refresh token hash
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

    // Build response with cookies (tokens only in HttpOnly cookies, not body)
    const response = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          roleCd: user.roleCd,
        },
      },
      201,
    );

    // Set HTTP-only cookies
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60, // 30 minutes
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    return handleApiError(error);
  }
}
