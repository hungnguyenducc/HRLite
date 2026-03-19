import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import type { VerifiedPayload } from '@/lib/auth/jwt';

// Mock the jwt module
jest.mock('@/lib/auth/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

// Mock the api-response module
jest.mock('@/lib/api-response', () => ({
  errorResponse: jest.fn((message: string, status: number) =>
    NextResponse.json({ success: false, error: message }, { status }),
  ),
}));

import { verifyAccessToken } from '@/lib/auth/jwt';

const mockVerify = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;

const validPayload: VerifiedPayload = {
  sub: 'user-123',
  email: 'test@example.com',
  role: 'admin',
  type: 'access',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900,
};

const dummyContext = { params: Promise.resolve({}) };

function createRequestWithBearer(token: string): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    headers: new Headers({ Authorization: `Bearer ${token}` }),
  });
}

function createRequestWithCookie(token: string): NextRequest {
  const req = new NextRequest('http://localhost/api/test');
  // Set cookie via the cookie store
  req.cookies.set('access_token', token);
  return req;
}

function createRequestWithoutAuth(): NextRequest {
  return new NextRequest('http://localhost/api/test');
}

describe('Middleware', () => {
  const successHandler = jest.fn(async (req: AuthenticatedRequest) =>
    NextResponse.json({ success: true, data: { userId: req.user.sub } }),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withAuth', () => {
    it('nen goi handler voi user payload khi Bearer token hop le', async () => {
      mockVerify.mockResolvedValue(validPayload);

      const wrappedHandler = withAuth(successHandler);
      const req = createRequestWithBearer('valid-token');
      const response = await wrappedHandler(req, dummyContext);
      const body = await response.json();

      expect(mockVerify).toHaveBeenCalledWith('valid-token');
      expect(successHandler).toHaveBeenCalled();
      expect(body.success).toBe(true);
      expect(body.data.userId).toBe('user-123');
    });

    it('nen goi handler voi user payload khi cookie token hop le', async () => {
      mockVerify.mockResolvedValue(validPayload);

      const wrappedHandler = withAuth(successHandler);
      const req = createRequestWithCookie('cookie-token');
      const response = await wrappedHandler(req, dummyContext);
      const body = await response.json();

      expect(mockVerify).toHaveBeenCalledWith('cookie-token');
      expect(successHandler).toHaveBeenCalled();
      expect(body.success).toBe(true);
    });

    it('nen tra ve 401 khi khong co token', async () => {
      const wrappedHandler = withAuth(successHandler);
      const req = createRequestWithoutAuth();
      const response = await wrappedHandler(req, dummyContext);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toContain('xác thực');
      expect(successHandler).not.toHaveBeenCalled();
    });

    it('nen tra ve 401 khi token khong hop le', async () => {
      mockVerify.mockResolvedValue(null);

      const wrappedHandler = withAuth(successHandler);
      const req = createRequestWithBearer('invalid-token');
      const response = await wrappedHandler(req, dummyContext);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Token');
      expect(successHandler).not.toHaveBeenCalled();
    });
  });

  describe('withRole', () => {
    it('nen goi handler khi role phu hop', async () => {
      mockVerify.mockResolvedValue(validPayload); // role: 'admin'

      const wrappedHandler = withRole(['admin', 'hr_manager'])(successHandler);
      const req = createRequestWithBearer('valid-token');
      const response = await wrappedHandler(req, dummyContext);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(successHandler).toHaveBeenCalled();
    });

    it('nen tra ve 403 khi role khong phu hop', async () => {
      mockVerify.mockResolvedValue(validPayload); // role: 'admin'

      const wrappedHandler = withRole(['hr_manager'])(successHandler);
      const req = createRequestWithBearer('valid-token');
      const response = await wrappedHandler(req, dummyContext);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error).toContain('quyền');
      expect(successHandler).not.toHaveBeenCalled();
    });

    it('nen tra ve 401 truoc khi kiem tra role khi khong co token', async () => {
      const wrappedHandler = withRole(['admin'])(successHandler);
      const req = createRequestWithoutAuth();
      const response = await wrappedHandler(req, dummyContext);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(successHandler).not.toHaveBeenCalled();
      // verifyAccessToken should not even be called
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('nen tra ve 401 khi token khong hop le truoc khi kiem tra role', async () => {
      mockVerify.mockResolvedValue(null);

      const wrappedHandler = withRole(['admin'])(successHandler);
      const req = createRequestWithBearer('invalid-token');
      const response = await wrappedHandler(req, dummyContext);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(successHandler).not.toHaveBeenCalled();
    });
  });
});
