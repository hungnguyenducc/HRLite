import { PrismaClient } from '@prisma/client';
import { cleanDatabase, seedTerms, seedNormalUser } from '../../helpers/db';
import { createRequest } from '../../helpers/request';
import {
  TEST_USERS,
  createAccessToken,
  createRefreshToken,
  createTokenHash,
} from '../../helpers/auth';
import { __resetStoreForTesting } from '@/lib/auth/rate-limit';
import { SignJWT } from 'jose';

import { POST } from '@/app/api/auth/refresh/route';

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
    jti: `test-${tokenCounter}-${Date.now()}`,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES || '7d')
    .sign(secret);
}

/** Helper: tạo refresh token trong DB và trả về token string */
async function createStoredRefreshToken(
  userId: string,
  options: { discarded?: boolean } = {},
): Promise<string> {
  const token = await createUniqueRefreshToken(userId);
  const tknHash = await createTokenHash(token);

  const expryDt = new Date();
  expryDt.setDate(expryDt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId,
      tknHash,
      expryDt,
      dscdDt: options.discarded ? new Date() : null,
    },
  });

  return token;
}

describe('POST /api/auth/refresh', () => {
  it('nên làm mới token thành công khi refresh token hợp lệ trong cookie', async () => {
    const refreshToken = await createStoredRefreshToken(TEST_USERS.user.id);

    const req = createRequest('/api/auth/refresh', {
      method: 'POST',
      cookies: { refresh_token: refreshToken },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.accessToken).toBeDefined();
    expect(data.data.refreshToken).toBeDefined();
    // Token mới phải khác token cũ
    expect(data.data.refreshToken).not.toBe(refreshToken);

    // Kiểm tra cookies được cập nhật
    const setCookies = response.headers.getSetCookie();
    const cookieStr = setCookies.join('; ');
    expect(cookieStr).toContain('access_token=');
    expect(cookieStr).toContain('refresh_token=');

    // Kiểm tra token cũ đã bị discard trong DB
    const oldHash = await createTokenHash(refreshToken);
    const oldToken = await prisma.refreshToken.findUnique({
      where: { tknHash: oldHash },
    });
    expect(oldToken!.dscdDt).not.toBeNull();

    // Kiểm tra token mới được lưu trong DB
    const newHash = await createTokenHash(data.data.refreshToken);
    const newToken = await prisma.refreshToken.findUnique({
      where: { tknHash: newHash },
    });
    expect(newToken).not.toBeNull();
    expect(newToken!.dscdDt).toBeNull();
  });

  it('nên phát hiện tấn công token reuse và thu hồi tất cả token khi dùng token đã bị discard', async () => {
    // Tạo token đã bị discard (mô phỏng token reuse)
    const discardedToken = await createStoredRefreshToken(TEST_USERS.user.id, {
      discarded: true,
    });

    // Tạo thêm một token hợp lệ khác cho user (mô phỏng token mới đã được cấp)
    const validToken = await createStoredRefreshToken(TEST_USERS.user.id);

    const req = createRequest('/api/auth/refresh', {
      method: 'POST',
      cookies: { refresh_token: discardedToken },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('đã bị thu hồi');

    // Kiểm tra tất cả token của user đều bị discard
    const allTokens = await prisma.refreshToken.findMany({
      where: { userId: TEST_USERS.user.id },
    });
    expect(allTokens.every((t) => t.dscdDt !== null)).toBe(true);
  });

  it('nên trả về 401 khi JWT không hợp lệ', async () => {
    const req = createRequest('/api/auth/refresh', {
      method: 'POST',
      cookies: { refresh_token: 'invalid.jwt.token' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('không hợp lệ');
  });

  it('nên trả về 401 khi dùng access token thay vì refresh token', async () => {
    const userPayload = {
      id: TEST_USERS.user.id,
      email: TEST_USERS.user.email,
      role: TEST_USERS.user.role,
    };
    const accessToken = await createAccessToken(userPayload);

    const req = createRequest('/api/auth/refresh', {
      method: 'POST',
      cookies: { refresh_token: accessToken },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('nên trả về 400 khi không cung cấp token', async () => {
    const req = createRequest('/api/auth/refresh', {
      method: 'POST',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('không được cung cấp');
  });

  it('nên trả về 401 khi user bị vô hiệu hóa sau khi token được tạo', async () => {
    const refreshToken = await createStoredRefreshToken(TEST_USERS.user.id);

    // Vô hiệu hóa user sau khi token đã được tạo
    await prisma.user.update({
      where: { id: TEST_USERS.user.id },
      data: { sttsCd: 'SUSPENDED' },
    });

    const req = createRequest('/api/auth/refresh', {
      method: 'POST',
      cookies: { refresh_token: refreshToken },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Tài khoản không hợp lệ');
  });
});
