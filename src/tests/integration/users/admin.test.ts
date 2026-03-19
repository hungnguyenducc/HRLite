import { PrismaClient } from '@prisma/client';
import { cleanDatabase, seedNormalUser, seedAdminUser } from '../../helpers/db';
import { createRequest, createContext } from '../../helpers/request';
import { TEST_USERS, createBearerHeader } from '../../helpers/auth';
import { __resetStoreForTesting } from '@/lib/auth/rate-limit';
import { GET } from '@/app/api/users/route';
import { PATCH } from '@/app/api/users/[id]/route';

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

describe('GET /api/users (ADMIN)', () => {
  it('nen tra ve danh sach phan trang voi pagination mac dinh khi co du lieu', async () => {
    await seedAdminUser(prisma);
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/users', { headers });

    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(2);
    expect(json.meta).toBeDefined();
    expect(json.meta.page).toBe(1);
    expect(json.meta.limit).toBe(20);
    expect(json.meta.total).toBe(2);
    expect(json.meta.totalPages).toBe(1);
  });

  it('nen tim kiem theo ten hoac email khi truyen tham so search', async () => {
    await seedAdminUser(prisma);
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/users', {
      headers,
      searchParams: { search: 'User Test' },
    });

    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.length).toBe(1);
    expect(json.data[0].email).toBe(TEST_USERS.user.email);
  });

  it('nen loc theo role khi truyen tham so role', async () => {
    await seedAdminUser(prisma);
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/users', {
      headers,
      searchParams: { role: 'ADMIN' },
    });

    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.length).toBe(1);
    expect(json.data[0].role).toBe('ADMIN');
  });

  it('nen loc theo status khi truyen tham so status', async () => {
    await seedAdminUser(prisma);
    await seedNormalUser(prisma);

    // Suspend the normal user
    await prisma.user.update({
      where: { id: TEST_USERS.user.id },
      data: { sttsCd: 'SUSPENDED' },
    });

    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/users', {
      headers,
      searchParams: { status: 'SUSPENDED' },
    });

    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.length).toBe(1);
    expect(json.data[0].status).toBe('SUSPENDED');
  });

  it('nen loai tru user da soft-delete khi truy van danh sach', async () => {
    await seedAdminUser(prisma);
    await seedNormalUser(prisma);

    // Soft-delete the normal user
    await prisma.user.update({
      where: { id: TEST_USERS.user.id },
      data: { delYn: 'Y' },
    });

    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/users', { headers });

    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.length).toBe(1);
    expect(json.data[0].id).toBe(TEST_USERS.admin.id);
  });

  it('nen tra ve 403 khi user khong phai ADMIN', async () => {
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/users', { headers });

    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

describe('PATCH /api/users/[id] (ADMIN)', () => {
  it('nen cap nhat role thanh cong khi admin thay doi role user khac', async () => {
    await seedAdminUser(prisma);
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest(`/api/users/${TEST_USERS.user.id}`, {
      method: 'PATCH',
      headers,
      body: { role: 'ADMIN' },
    });
    const ctx = createContext({ id: TEST_USERS.user.id });

    const response = await PATCH(req, ctx);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.role).toBe('ADMIN');
  });

  it('nen cap nhat status thanh cong khi admin thay doi trang thai user', async () => {
    await seedAdminUser(prisma);
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest(`/api/users/${TEST_USERS.user.id}`, {
      method: 'PATCH',
      headers,
      body: { status: 'SUSPENDED' },
    });
    const ctx = createContext({ id: TEST_USERS.user.id });

    const response = await PATCH(req, ctx);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('SUSPENDED');
  });

  it('nen tra ve 400 khi admin tu thay doi role cua chinh minh', async () => {
    await seedAdminUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest(`/api/users/${TEST_USERS.admin.id}`, {
      method: 'PATCH',
      headers,
      body: { role: 'USER' },
    });
    const ctx = createContext({ id: TEST_USERS.admin.id });

    const response = await PATCH(req, ctx);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('nen tra ve 404 khi user khong ton tai', async () => {
    await seedAdminUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const nonExistentId = '99999999-9999-9999-9999-999999999999';
    const req = createRequest(`/api/users/${nonExistentId}`, {
      method: 'PATCH',
      headers,
      body: { role: 'ADMIN' },
    });
    const ctx = createContext({ id: nonExistentId });

    const response = await PATCH(req, ctx);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('nen tra ve 400 khi gia tri role khong hop le', async () => {
    await seedAdminUser(prisma);
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest(`/api/users/${TEST_USERS.user.id}`, {
      method: 'PATCH',
      headers,
      body: { role: 'SUPERADMIN' },
    });
    const ctx = createContext({ id: TEST_USERS.user.id });

    const response = await PATCH(req, ctx);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('nen tra ve 403 khi user khong phai ADMIN', async () => {
    await seedAdminUser(prisma);
    await seedNormalUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest(`/api/users/${TEST_USERS.admin.id}`, {
      method: 'PATCH',
      headers,
      body: { role: 'USER' },
    });
    const ctx = createContext({ id: TEST_USERS.admin.id });

    const response = await PATCH(req, ctx);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});
