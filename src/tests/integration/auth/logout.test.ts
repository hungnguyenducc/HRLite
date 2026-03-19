import { PrismaClient } from '@prisma/client';
import { cleanDatabase, seedTerms, seedNormalUser } from '../../helpers/db';
import { createRequest, createContext } from '../../helpers/request';
import { TEST_USERS, createAccessToken, createTokenHash } from '../../helpers/auth';
import { __resetStoreForTesting } from '@/lib/auth/rate-limit';
import { SignJWT } from 'jose';

import { POST } from '@/app/api/auth/logout/route';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanDatabase(prisma);
  __resetStoreForTesting();
  await seedTerms(prisma);
  await seedNormalUser(prisma);
});

/** Tạo refresh token duy nhất bằng cách thêm jti để tránh trùng hash */
let tokenCounter = 0;
async function createUniqueRefreshToken(userId: string): Promise<string> {
  tokenCounter++;
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  return new SignJWT({
    sub: userId,
    email: TEST_USERS.user.email,
    role: TEST_USERS.user.role,
    type: 'refresh' as const,
    jti: `test-logout-${tokenCounter}-${Date.now()}`,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES || '7d')
    .sign(secret);
}

/** Helper: tạo refresh token trong DB và trả về token string */
async function createStoredRefreshToken(userId: string): Promise<string> {
  const token = await createUniqueRefreshToken(userId);
  const tknHash = await createTokenHash(token);

  const expryDt = new Date();
  expryDt.setDate(expryDt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId,
      tknHash,
      expryDt,
    },
  });

  return token;
}

describe('POST /api/auth/logout', () => {
  it('nên đăng xuất thành công khi có access_token và refresh_token', async () => {
    const userPayload = {
      id: TEST_USERS.user.id,
      email: TEST_USERS.user.email,
      role: TEST_USERS.user.role,
    };
    const accessToken = await createAccessToken(userPayload);
    const refreshToken = await createStoredRefreshToken(TEST_USERS.user.id);

    const req = createRequest('/api/auth/logout', {
      method: 'POST',
      cookies: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });

    const response = await POST(req, createContext({}));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.message).toContain('Đăng xuất thành công');

    // Kiểm tra cookies bị xóa (maxAge=0)
    const setCookies = response.headers.getSetCookie();
    const cookieStr = setCookies.join('; ');
    expect(cookieStr).toContain('access_token=');
    expect(cookieStr).toContain('refresh_token=');
    // Cookie maxAge=0 → "Max-Age=0" trong set-cookie header
    const accessCookie = setCookies.find((c) => c.startsWith('access_token='));
    expect(accessCookie).toContain('Max-Age=0');
    const refreshCookie = setCookies.find((c) => c.startsWith('refresh_token='));
    expect(refreshCookie).toContain('Max-Age=0');

    // Kiểm tra refresh token đã bị discard trong DB
    const tknHash = await createTokenHash(refreshToken);
    const dbToken = await prisma.refreshToken.findUnique({
      where: { tknHash },
    });
    expect(dbToken!.dscdDt).not.toBeNull();
  });

  it('nên trả về 200 khi chỉ có access_token mà không có refresh_token', async () => {
    const userPayload = {
      id: TEST_USERS.user.id,
      email: TEST_USERS.user.email,
      role: TEST_USERS.user.role,
    };
    const accessToken = await createAccessToken(userPayload);

    const req = createRequest('/api/auth/logout', {
      method: 'POST',
      cookies: {
        access_token: accessToken,
      },
    });

    const response = await POST(req, createContext({}));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.message).toContain('Đăng xuất thành công');
  });

  it('nên trả về 401 khi không có access token', async () => {
    const req = createRequest('/api/auth/logout', {
      method: 'POST',
    });

    const response = await POST(req, createContext({}));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Chưa xác thực');
  });
});
