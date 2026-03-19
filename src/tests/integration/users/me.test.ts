import { PrismaClient } from '@prisma/client';
import { cleanDatabase, seedNormalUser, seedAdminUser } from '../../helpers/db';
import { createRequest } from '../../helpers/request';
import { TEST_USERS, createBearerHeader, createAccessToken } from '../../helpers/auth';
import { __resetStoreForTesting } from '@/lib/auth/rate-limit';
import { GET, PATCH, DELETE } from '@/app/api/users/me/route';

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
});

describe('GET /api/users/me', () => {
  it('nen tra ve thong tin profile khong chua password hash khi dang nhap hop le', async () => {
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/users/me', { headers });

    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(TEST_USERS.user.id);
    expect(json.data.email).toBe(TEST_USERS.user.email);
    expect(json.data.displayName).toBe('User Test');
    expect(json.data.roleCd).toBe('USER');
    expect(json.data.sttsCd).toBe('ACTIVE');
    // Must not contain password hash
    expect(json.data.passwdHash).toBeUndefined();
    expect(json.data.password).toBeUndefined();
  });

  it('nen tra ve 401 khi khong co token xac thuc', async () => {
    const req = createRequest('/api/users/me');

    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });
});

describe('PATCH /api/users/me', () => {
  it('nen cap nhat displayName va phone khi gui du lieu hop le', async () => {
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/users/me', {
      method: 'PATCH',
      headers,
      body: { displayName: 'Nguyen Van A', phone: '0901234567' },
    });

    const response = await PATCH(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.displayName).toBe('Nguyen Van A');
    expect(json.data.phone).toBe('0901234567');
  });

  it('nen cap nhat mot truong duy nhat khi chi gui displayName', async () => {
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/users/me', {
      method: 'PATCH',
      headers,
      body: { displayName: 'Chi Cap Nhat Ten' },
    });

    const response = await PATCH(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.displayName).toBe('Chi Cap Nhat Ten');
  });

  it('nen tra ve 400 khi photoUrl khong hop le', async () => {
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/users/me', {
      method: 'PATCH',
      headers,
      body: { photoUrl: 'not-a-valid-url' },
    });

    const response = await PATCH(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('nen tra ve 401 khi khong co token xac thuc', async () => {
    const req = createRequest('/api/users/me', {
      method: 'PATCH',
      body: { displayName: 'Test' },
    });

    const response = await PATCH(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });
});

describe('DELETE /api/users/me', () => {
  it('nen soft-delete tai khoan voi delYn=Y, email masked, sttsCd=WITHDRAWN', async () => {
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/users/me', {
      method: 'DELETE',
      headers,
    });

    const response = await DELETE(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify in DB
    const user = await prisma.user.findUnique({ where: { id: TEST_USERS.user.id } });
    expect(user).not.toBeNull();
    expect(user!.delYn).toBe('Y');
    expect(user!.sttsCd).toBe('WITHDRAWN');
    expect(user!.email).toBe(`deleted_${TEST_USERS.user.id}@withdrawn.local`);
    expect(user!.deleteDt).not.toBeNull();
    expect(user!.withdrawDt).not.toBeNull();
  });

  it('nen huy tat ca refresh token khi xoa tai khoan', async () => {
    await seedNormalUser(prisma);

    // Create a refresh token for the user
    await prisma.refreshToken.create({
      data: {
        userId: TEST_USERS.user.id,
        tknHash: 'test-hash-value-delete-test',
        expryDt: new Date(Date.now() + 86400000),
      },
    });

    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/users/me', {
      method: 'DELETE',
      headers,
    });

    await DELETE(req, { params: Promise.resolve({}) });

    // Verify refresh tokens are discarded
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: TEST_USERS.user.id },
    });
    expect(tokens.length).toBeGreaterThanOrEqual(1);
    tokens.forEach((token) => {
      expect(token.dscdDt).not.toBeNull();
    });
  });

  it('nen xoa cookies khi xoa tai khoan', async () => {
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/users/me', {
      method: 'DELETE',
      headers,
    });

    const response = await DELETE(req, { params: Promise.resolve({}) });

    // Check Set-Cookie headers clear the tokens
    const setCookies = response.headers.getSetCookie();
    expect(setCookies.length).toBeGreaterThanOrEqual(2);

    const accessCookie = setCookies.find((c) => c.startsWith('access_token='));
    const refreshCookie = setCookies.find((c) => c.startsWith('refresh_token='));
    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
    expect(accessCookie).toContain('Max-Age=0');
    expect(refreshCookie).toContain('Max-Age=0');
  });
});
