import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import prisma from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/auth/rate-limit';
import { RateLimitError } from '@/lib/errors';
import { SESSION_COOKIE_NAME } from '@/lib/auth/middleware';

const SESSION_MAX_AGE = Number(process.env.SESSION_COOKIE_MAX_AGE) || 432000;

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req, 'signup', RATE_LIMITS.signup);

    const body = await req.json();
    const { idToken, displayName, agreedTermsIds } = body;

    if (!idToken || typeof idToken !== 'string') {
      return errorResponse('ID Token không hợp lệ.', 400);
    }

    if (!Array.isArray(agreedTermsIds)) {
      return errorResponse('Danh sách điều khoản không hợp lệ.', 400);
    }

    // Verify Firebase ID Token
    const decoded = await adminAuth.verifyIdToken(idToken);
    const { uid: firebaseUid, email } = decoded;

    if (!email) {
      return errorResponse('Email không tồn tại trong token.', 400);
    }

    // Check email uniqueness in DB
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return errorResponse('Email đã được sử dụng.', 409);
    }

    // Verify that all agreed terms exist and are active
    const terms = await prisma.terms.findMany({
      where: { id: { in: agreedTermsIds }, actvYn: 'Y' },
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

    // Get IP and device info
    const ipAddr = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const dvcInfo = req.headers.get('user-agent') ?? undefined;

    // Create user and agreements in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firebaseUid,
          email,
          displayName: displayName || null,
          creatBy: 'SYSTEM',
        },
      });

      await tx.userAgreement.createMany({
        data: agreedTermsIds.map((trmsId: string) => ({
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

    // Create Firebase session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const response = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.roleCd,
        },
      },
      201,
    );

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    return handleApiError(error);
  }
}
