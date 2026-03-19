import { PrismaClient } from '@prisma/client';
import { cleanDatabase, seedTerms, seedNormalUser } from '../../helpers/db';
import { createRequest } from '../../helpers/request';
import { TEST_USERS, TEST_TERMS } from '../../helpers/auth';
import { __resetStoreForTesting } from '@/lib/auth/rate-limit';

import { POST } from '@/app/api/auth/login/route';

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

describe('POST /api/auth/login', () => {
  const validCredentials = {
    email: TEST_USERS.user.email,
    password: TEST_USERS.user.password,
  };

  it('nên đăng nhập thành công khi thông tin xác thực đúng', async () => {
    // Tạo user agreement cho required terms để không có pendingTerms
    await prisma.userAgreement.createMany({
      data: [
        {
          userId: TEST_USERS.user.id,
          trmsId: TEST_TERMS.tos.id,
          agreYn: 'Y',
          agreDt: new Date(),
        },
        {
          userId: TEST_USERS.user.id,
          trmsId: TEST_TERMS.privacy.id,
          agreYn: 'Y',
          agreDt: new Date(),
        },
      ],
    });

    const req = createRequest('/api/auth/login', {
      method: 'POST',
      body: validCredentials,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe(validCredentials.email);
    expect(data.data.user.id).toBe(TEST_USERS.user.id);
    // Tokens should NOT be in body (httpOnly cookies only)
    expect(data.data.accessToken).toBeUndefined();
    expect(data.data.refreshToken).toBeUndefined();
    expect(data.data.pendingTerms).toBeUndefined();

    // Kiểm tra cookies được thiết lập
    const setCookies = response.headers.getSetCookie();
    const cookieStr = setCookies.join('; ');
    expect(cookieStr).toContain('access_token=');
    expect(cookieStr).toContain('refresh_token=');

    // Kiểm tra lastLoginDt được cập nhật
    const dbUser = await prisma.user.findUnique({
      where: { id: TEST_USERS.user.id },
    });
    expect(dbUser!.lastLoginDt).not.toBeNull();
  });

  it('nên trả về pendingTerms khi user chưa đồng ý điều khoản bắt buộc mới', async () => {
    // Không tạo agreement → tất cả required terms đều pending
    const req = createRequest('/api/auth/login', {
      method: 'POST',
      body: validCredentials,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.pendingTerms).toBeDefined();
    expect(data.data.pendingTerms).toHaveLength(2);
    expect(data.data.pendingTerms.map((t: { id: string }) => t.id)).toEqual(
      expect.arrayContaining([TEST_TERMS.tos.id, TEST_TERMS.privacy.id]),
    );
  });

  it('nên trả về 401 khi email sai', async () => {
    const req = createRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'nonexistent@test.hrlite.local', password: 'SomePass@1' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Email hoặc mật khẩu không chính xác');
  });

  it('nên trả về 401 khi mật khẩu sai', async () => {
    const req = createRequest('/api/auth/login', {
      method: 'POST',
      body: { email: TEST_USERS.user.email, password: 'WrongPass@1' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Email hoặc mật khẩu không chính xác');
  });

  it('nên trả về 401 khi user đã bị xóa (delYn=Y)', async () => {
    await prisma.user.update({
      where: { id: TEST_USERS.user.id },
      data: { delYn: 'Y' },
    });

    const req = createRequest('/api/auth/login', {
      method: 'POST',
      body: validCredentials,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Email hoặc mật khẩu không chính xác');
  });

  it('nên trả về 401 khi user bị vô hiệu hóa (sttsCd=SUSPENDED)', async () => {
    await prisma.user.update({
      where: { id: TEST_USERS.user.id },
      data: { sttsCd: 'SUSPENDED' },
    });

    const req = createRequest('/api/auth/login', {
      method: 'POST',
      body: validCredentials,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Email hoặc mật khẩu không chính xác');
  });

  it('nên trả về 429 khi vượt quá giới hạn 5 request', async () => {
    // Gửi 5 request (cùng IP) — dùng sai mật khẩu để tránh tạo duplicate refresh token
    for (let i = 0; i < 5; i++) {
      const req = createRequest('/api/auth/login', {
        method: 'POST',
        body: { email: TEST_USERS.user.email, password: `WrongPass@${i}` },
        headers: { 'x-forwarded-for': '192.168.200.1' },
      });
      const res = await POST(req);
      // 401 vì sai mật khẩu, nhưng không phải 429
      expect(res.status).toBe(401);
    }

    // Request thứ 6 phải bị chặn
    const req = createRequest('/api/auth/login', {
      method: 'POST',
      body: validCredentials,
      headers: { 'x-forwarded-for': '192.168.200.1' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Quá nhiều yêu cầu');
  });
});
