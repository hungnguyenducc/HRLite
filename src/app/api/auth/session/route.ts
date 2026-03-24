import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import prisma from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { handleApiError, ConflictError } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/auth/rate-limit';
import { RateLimitError } from '@/lib/errors';
import { SESSION_COOKIE_NAME } from '@/lib/auth/middleware';

const SESSION_MAX_AGE = Number(process.env.SESSION_COOKIE_MAX_AGE) || 432000; // 5 days in seconds

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req, 'login', RATE_LIMITS.login);

    const body = await req.json();
    const { idToken, agreedTermsIds } = body;

    if (!idToken || typeof idToken !== 'string') {
      return errorResponse('ID Token không hợp lệ.', 400);
    }

    // Verify Firebase ID Token
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Find user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: {
        id: true,
        email: true,
        displayName: true,
        roleCd: true,
        sttsCd: true,
        delYn: true,
      },
    });

    // --- EXISTING USER PATH ---
    if (user) {
      if (user.delYn === 'Y' || user.sttsCd === 'WITHDRAWN') {
        return errorResponse('Tài khoản đã bị xóa.', 403);
      }

      if (user.sttsCd === 'SUSPENDED') {
        return errorResponse('Tài khoản đã bị đình chỉ.', 403);
      }

      if (user.sttsCd !== 'ACTIVE') {
        return errorResponse('Tài khoản không hoạt động.', 403);
      }

      // Check pending required terms
      const requiredTerms = await prisma.terms.findMany({
        where: { actvYn: 'Y', reqYn: 'Y' },
        select: { id: true, title: true, typeCd: true },
      });

      const agreedTermIds = (
        await prisma.userAgreement.findMany({
          where: { userId: user.id, agreYn: 'Y' },
          select: { trmsId: true },
        })
      ).map((a) => a.trmsId);

      const pendingTerms = requiredTerms.filter((t) => !agreedTermIds.includes(t.id));

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginDt: new Date(), updtBy: user.id },
      });

      // Create Firebase session cookie
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_MAX_AGE * 1000,
      });

      const response = successResponse({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.roleCd,
          status: user.sttsCd,
        },
        pendingTerms: pendingTerms.length > 0 ? pendingTerms : null,
      });

      response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });

      return response;
    }

    // --- NEW USER PATH (Google auto-register) ---
    // User not found by firebaseUid — check if this is a Google sign-in scenario

    if (!decoded.email) {
      return errorResponse('Tài khoản chưa được đăng ký trong hệ thống.', 401);
    }

    // Check email conflict outside transaction first (fast path for 409)
    const existingByEmail = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    if (existingByEmail) {
      return errorResponse('Email đã được sử dụng bằng phương thức đăng nhập khác.', 409);
    }

    // Load required terms
    const requiredTerms = await prisma.terms.findMany({
      where: { actvYn: 'Y', reqYn: 'Y' },
      select: { id: true, title: true, typeCd: true },
    });

    // If there are required terms and user hasn't agreed yet
    if (requiredTerms.length > 0 && (!Array.isArray(agreedTermsIds) || agreedTermsIds.length === 0)) {
      return successResponse({
        requiresRegistration: true,
        pendingTerms: requiredTerms,
      });
    }

    // Validate agreed terms cover all required terms
    if (requiredTerms.length > 0) {
      const validTerms = await prisma.terms.findMany({
        where: { id: { in: agreedTermsIds }, actvYn: 'Y' },
      });
      if (validTerms.length !== agreedTermsIds.length) {
        return errorResponse('Một hoặc nhiều điều khoản không hợp lệ hoặc không còn hiệu lực.', 400);
      }

      const requiredIds = requiredTerms.map((t) => t.id);
      const missingRequired = requiredIds.filter((id: string) => !agreedTermsIds.includes(id));
      if (missingRequired.length > 0) {
        return errorResponse('Vui lòng đồng ý tất cả các điều khoản bắt buộc.', 400);
      }
    }

    // Extract Google profile data from decoded token
    const displayName = decoded.name ?? null;
    const photoUrl = decoded.picture ?? null;

    const ipAddr = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const dvcInfo = req.headers.get('user-agent') ?? undefined;

    // Create user and agreements in a single transaction (with email re-check to prevent race condition)
    let newUser;
    try {
      newUser = await prisma.$transaction(async (tx) => {
        // Re-check email inside transaction to prevent race condition
        const emailConflict = await tx.user.findUnique({
          where: { email: decoded.email as string },
        });
        if (emailConflict) {
          throw new ConflictError('Email đã được sử dụng bằng phương thức đăng nhập khác.');
        }

        const created = await tx.user.create({
          data: {
            firebaseUid: decoded.uid,
            email: decoded.email as string,
            displayName,
            photoUrl,
            creatBy: 'GOOGLE',
          },
        });

        if (Array.isArray(agreedTermsIds) && agreedTermsIds.length > 0) {
          await tx.userAgreement.createMany({
            data: agreedTermsIds.map((trmsId: string) => ({
              userId: created.id,
              trmsId,
              agreYn: 'Y',
              agreDt: new Date(),
              ipAddr,
              dvcInfo,
            })),
          });
        }

        return created;
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        return errorResponse(error.message, 409);
      }
      throw error;
    }

    // Create Firebase session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const response = successResponse(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          role: newUser.roleCd,
          status: newUser.sttsCd,
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
