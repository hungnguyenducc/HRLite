import { PrismaClient } from '@prisma/client';
import { cleanDatabase, seedTerms } from '../../helpers/db';
import { createRequest } from '../../helpers/request';
import { TEST_USERS, TEST_TERMS } from '../../helpers/auth';
import { __resetStoreForTesting } from '@/lib/auth/rate-limit';

import { POST } from '@/app/api/auth/signup/route';

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
});

describe('POST /api/auth/signup', () => {
  const validBody = {
    email: 'newuser@test.hrlite.local',
    password: 'Strong@123',
    displayName: 'Người dùng mới',
    agreedTermsIds: [TEST_TERMS.tos.id, TEST_TERMS.privacy.id],
  };

  it('nên tạo user thành công khi dữ liệu hợp lệ', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: validBody,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe(validBody.email);
    expect(data.data.user.displayName).toBe(validBody.displayName);
    expect(data.data.user.roleCd).toBe('USER');
    // Tokens should NOT be in response body (httpOnly cookies only)
    expect(data.data.accessToken).toBeUndefined();
    expect(data.data.refreshToken).toBeUndefined();

    // Kiểm tra cookies được thiết lập
    const setCookies = response.headers.getSetCookie();
    const cookieStr = setCookies.join('; ');
    expect(cookieStr).toContain('access_token=');
    expect(cookieStr).toContain('refresh_token=');

    // Kiểm tra user được tạo trong DB
    const dbUser = await prisma.user.findUnique({
      where: { email: validBody.email },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.email).toBe(validBody.email);

    // Kiểm tra agreements được tạo trong DB
    const agreements = await prisma.userAgreement.findMany({
      where: { userId: dbUser!.id },
    });
    expect(agreements).toHaveLength(2);
    expect(agreements.every((a) => a.agreYn === 'Y')).toBe(true);

    // Kiểm tra refresh token được lưu trong DB
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: dbUser!.id },
    });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].dscdDt).toBeNull();
  });

  it('nên trả về 400 khi email không hợp lệ', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: { ...validBody, email: 'not-an-email' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('email');
  });

  it('nên trả về 400 khi mật khẩu yếu', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: { ...validBody, password: 'weak' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('nên trả về 400 khi agreedTermsIds rỗng', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: { ...validBody, agreedTermsIds: [] },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('nên trả về 409 khi email đã tồn tại', async () => {
    // Tạo user trước
    const firstReq = createRequest('/api/auth/signup', {
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    const firstResponse = await POST(firstReq);
    expect(firstResponse.status).toBe(201);

    // Đăng ký lại với cùng email
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: validBody,
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Email đã được sử dụng');
  });

  it('nên trả về 400 khi chỉ đồng ý điều khoản tùy chọn mà thiếu điều khoản bắt buộc', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        ...validBody,
        agreedTermsIds: [TEST_TERMS.optional.id],
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('điều khoản bắt buộc');
  });

  it('nên trả về 400 khi agreedTermsIds chứa ID không tồn tại', async () => {
    const fakeTermId = '99999999-0000-0000-0000-000000000099';
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        ...validBody,
        agreedTermsIds: [TEST_TERMS.tos.id, TEST_TERMS.privacy.id, fakeTermId],
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('không hợp lệ hoặc không còn hiệu lực');
  });

  it('nên trả về 429 khi vượt quá giới hạn 3 request', async () => {
    // Gửi 3 request hợp lệ (dùng email khác nhau, cùng IP)
    for (let i = 0; i < 3; i++) {
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: {
          ...validBody,
          email: `ratelimit-${i}@test.hrlite.local`,
        },
        headers: { 'x-forwarded-for': '192.168.100.1' },
      });
      const res = await POST(req);
      expect(res.status).toBeLessThan(429);
    }

    // Request thứ 4 phải bị chặn
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        ...validBody,
        email: 'ratelimit-blocked@test.hrlite.local',
      },
      headers: { 'x-forwarded-for': '192.168.100.1' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Quá nhiều yêu cầu');
  });
});
