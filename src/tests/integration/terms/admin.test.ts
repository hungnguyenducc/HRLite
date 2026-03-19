import { PrismaClient } from '@prisma/client';
import { cleanDatabase, seedTerms, seedAdminUser, seedNormalUser } from '../../helpers/db';
import { createRequest, createContext } from '../../helpers/request';
import { TEST_USERS, TEST_TERMS, createBearerHeader } from '../../helpers/auth';
import { __resetStoreForTesting } from '@/lib/auth/rate-limit';
import { GET, POST } from '@/app/api/terms/route';
import { PATCH, DELETE } from '@/app/api/terms/[id]/route';

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

describe('GET /api/terms (ADMIN)', () => {
  it('nen tra ve tat ca dieu khoan bao gom ca khong hoat dong khi la ADMIN', async () => {
    await seedAdminUser(prisma);
    await seedTerms(prisma);

    // Deactivate one term
    await prisma.terms.update({
      where: { id: TEST_TERMS.optional.id },
      data: { actvYn: 'N' },
    });

    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/terms', { headers });

    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(3);

    // Verify the inactive term is included
    const inactiveTerm = json.data.find(
      (t: Record<string, unknown>) => t.id === TEST_TERMS.optional.id,
    );
    expect(inactiveTerm).toBeDefined();
    expect(inactiveTerm.active).toBe(false);
  });

  it('nen tra ve 403 khi user khong phai ADMIN', async () => {
    await seedNormalUser(prisma);
    await seedTerms(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/terms', { headers });

    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

describe('POST /api/terms (ADMIN)', () => {
  it('nen tao dieu khoan moi voi day du truong khi gui du lieu hop le', async () => {
    await seedAdminUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/terms', {
      method: 'POST',
      headers,
      body: {
        type: 'PRIVACY_POLICY',
        version: '2.0',
        title: 'Chinh sach bao mat v2',
        content: 'Noi dung chinh sach bao mat phien ban 2',
        required: true,
        active: true,
        effectiveDate: '2024-06-01T00:00:00.000Z',
      },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.type).toBe('PRIVACY_POLICY');
    expect(json.data.version).toBe('2.0');
    expect(json.data.title).toBe('Chinh sach bao mat v2');
    expect(json.data.required).toBe(true);
    expect(json.data.active).toBe(true);
    expect(json.data.id).toBeDefined();
  });

  it('nen tra ve 400 khi thieu title', async () => {
    await seedAdminUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/terms', {
      method: 'POST',
      headers,
      body: {
        version: '1.0',
        content: 'Noi dung',
      },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('nen tra ve 400 khi thieu version', async () => {
    await seedAdminUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/terms', {
      method: 'POST',
      headers,
      body: {
        title: 'Dieu khoan moi',
        content: 'Noi dung',
      },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('nen tra ve 400 khi type khong hop le', async () => {
    await seedAdminUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/terms', {
      method: 'POST',
      headers,
      body: {
        type: 'INVALID_TYPE',
        version: '1.0',
        title: 'Dieu khoan moi',
        content: 'Noi dung',
      },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('nen tra ve 400 khi effectiveDate khong hop le', async () => {
    await seedAdminUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest('/api/terms', {
      method: 'POST',
      headers,
      body: {
        version: '1.0',
        title: 'Dieu khoan moi',
        content: 'Noi dung',
        effectiveDate: 'not-a-date',
      },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });
});

describe('PATCH /api/terms/[id] (ADMIN)', () => {
  it('nen cap nhat cac truong dieu khoan khi gui du lieu hop le', async () => {
    await seedAdminUser(prisma);
    await seedTerms(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest(`/api/terms/${TEST_TERMS.tos.id}`, {
      method: 'PATCH',
      headers,
      body: {
        title: 'Dieu khoan su dung (cap nhat)',
        version: '1.1',
        required: false,
      },
    });
    const ctx = createContext({ id: TEST_TERMS.tos.id });

    const response = await PATCH(req, ctx);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Dieu khoan su dung (cap nhat)');
    expect(json.data.version).toBe('1.1');
    expect(json.data.required).toBe(false);
  });

  it('nen tra ve 404 khi dieu khoan khong ton tai', async () => {
    await seedAdminUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const nonExistentId = '99999999-9999-9999-9999-999999999999';
    const req = createRequest(`/api/terms/${nonExistentId}`, {
      method: 'PATCH',
      headers,
      body: { title: 'Khong ton tai' },
    });
    const ctx = createContext({ id: nonExistentId });

    const response = await PATCH(req, ctx);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
  });
});

describe('DELETE /api/terms/[id] (ADMIN)', () => {
  it('nen soft-delete dieu khoan bang cach set actvYn=N va updtBy khi xoa', async () => {
    await seedAdminUser(prisma);
    await seedTerms(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const req = createRequest(`/api/terms/${TEST_TERMS.tos.id}`, {
      method: 'DELETE',
      headers,
    });
    const ctx = createContext({ id: TEST_TERMS.tos.id });

    const response = await DELETE(req, ctx);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify in DB
    const term = await prisma.terms.findUnique({ where: { id: TEST_TERMS.tos.id } });
    expect(term).not.toBeNull();
    expect(term!.actvYn).toBe('N');
    expect(term!.updtBy).toBe(TEST_USERS.admin.id);
  });

  it('nen tra ve 404 khi dieu khoan khong ton tai', async () => {
    await seedAdminUser(prisma);
    const headers = await createBearerHeader(TEST_USERS.admin);
    const nonExistentId = '99999999-9999-9999-9999-999999999999';
    const req = createRequest(`/api/terms/${nonExistentId}`, {
      method: 'DELETE',
      headers,
    });
    const ctx = createContext({ id: nonExistentId });

    const response = await DELETE(req, ctx);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
  });
});
