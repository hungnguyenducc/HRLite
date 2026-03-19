import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, VerifiedPayload } from './jwt';
import { errorResponse } from '../api-response';

// Extended request type that carries the authenticated user payload
export interface AuthenticatedRequest extends NextRequest {
  user: VerifiedPayload;
}

// Route context type for Next.js 15
interface RouteContext {
  params: Promise<Record<string, string>>;
}

// Internal handler type that receives the authenticated request
type AuthHandler = (req: AuthenticatedRequest, context: RouteContext) => Promise<NextResponse>;

// Next.js route handler type
type NextRouteHandler = (req: NextRequest, context: RouteContext) => Promise<NextResponse>;

// Extract JWT from Authorization header or cookie
function extractToken(req: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Fall back to cookie
  const cookie = req.cookies.get('access_token');
  return cookie?.value ?? null;
}

// Middleware: requires valid JWT authentication
export function withAuth(handler: AuthHandler): NextRouteHandler {
  return async (req, context) => {
    const token = extractToken(req);
    if (!token) {
      return errorResponse('Chưa xác thực. Vui lòng đăng nhập.', 401);
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return errorResponse('Token không hợp lệ hoặc đã hết hạn.', 401);
    }

    // Attach verified user info to the request
    const authReq = req as AuthenticatedRequest;
    authReq.user = payload;

    return handler(authReq, context);
  };
}

// Middleware: requires specific role(s)
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
