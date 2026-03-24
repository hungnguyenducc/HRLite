import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import prisma from '@/lib/db';
import { errorResponse } from '../api-response';

export interface VerifiedPayload {
  sub: string;
  email: string;
  role: string;
  firebaseUid: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user: VerifiedPayload;
}

interface RouteContext {
  params: Promise<Record<string, string>>;
}

type AuthHandler = (req: AuthenticatedRequest, context: RouteContext) => Promise<NextResponse>;
type NextRouteHandler = (req: NextRequest, context: RouteContext) => Promise<NextResponse>;

const SESSION_COOKIE_NAME = '__session';

export function withAuth(handler: AuthHandler): NextRouteHandler {
  return async (req, context) => {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return errorResponse('Chưa xác thực. Vui lòng đăng nhập.', 401);
    }

    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

      const user = await prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: { id: true, email: true, roleCd: true, sttsCd: true, delYn: true },
      });

      if (!user || user.delYn === 'Y' || user.sttsCd !== 'ACTIVE') {
        return errorResponse('Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa.', 401);
      }

      const authReq = req as AuthenticatedRequest;
      authReq.user = {
        sub: user.id,
        email: user.email,
        role: user.roleCd,
        firebaseUid: decoded.uid,
      };

      return handler(authReq, context);
    } catch {
      return errorResponse('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', 401);
    }
  };
}

export function withRole(roles: string[]) {
  return (handler: AuthHandler): NextRouteHandler => {
    return withAuth(async (req, context) => {
      if (!roles.includes(req.user.role)) {
        return errorResponse('Bạn không có quyền truy cập tài nguyên này.', 403);
      }
      return handler(req, context);
    });
  };
}

export { SESSION_COOKIE_NAME };
