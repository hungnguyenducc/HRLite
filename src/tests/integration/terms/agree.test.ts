import { PrismaClient } from '@prisma/client';
import { cleanDatabase, seedTerms, seedNormalUser } from '../../helpers/db';
import { createRequest } from '../../helpers/request';
import { TEST_USERS, TEST_TERMS, createBearerHeader } from '../../helpers/auth';
import { __resetStoreForTesting } from '@/lib/auth/rate-limit';
import { POST } from '@/app/api/terms/agree/route';
import { GET as GET_PENDING } from '@/app/api/terms/pending/route';

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

describe('POST /api/terms/agree', () => {
  it('nen tao ban ghi dong y dieu khoan khi gui termsIds hop le', async () => {
    await seedNormalUser(prisma);
    await seedTerms(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/terms/agree', {
      method: 'POST',
      headers,
      body: { termsIds: [TEST_TERMS.tos.id, TEST_TERMS.privacy.id] },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.agreedCount).toBe(2);

    // Verify in DB
    const agreements = await prisma.userAgreement.findMany({
      where: { userId: TEST_USERS.user.id },
    });
    expect(agreements.length).toBe(2);
    agreements.forEach((a) => {
      expect(a.agreYn).toBe('Y');
      expect(a.agreDt).not.toBeNull();
    });
  });

  it('nen tra ve thanh cong khi dong y lai cac dieu khoan da dong y (idempotent)', async () => {
    await seedNormalUser(prisma);
    await seedTerms(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);

    // First agreement
    const req1 = createRequest('/api/terms/agree', {
      method: 'POST',
      headers,
      body: { termsIds: [TEST_TERMS.tos.id] },
    });
    const response1 = await POST(req1, { params: Promise.resolve({}) });
    expect((await response1.json()).success).toBe(true);

    // Re-agree the same term
    const req2 = createRequest('/api/terms/agree', {
      method: 'POST',
      headers,
      body: { termsIds: [TEST_TERMS.tos.id] },
    });
    const response2 = await POST(req2, { params: Promise.resolve({}) });
    const json2 = await response2.json();

    expect(response2.status).toBe(200);
    expect(json2.success).toBe(true);

    // Should still only have 1 agreement record (no duplicates)
    const agreements = await prisma.userAgreement.findMany({
      where: { userId: TEST_USERS.user.id, trmsId: TEST_TERMS.tos.id },
    });
    expect(agreements.length).toBe(1);
  });

  it('nen tra ve 400 khi termsIds chua ID khong ton tai', async () => {
    await seedNormalUser(prisma);
    await seedTerms(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const fakeId = '99999999-9999-9999-9999-999999999999';
    const req = createRequest('/api/terms/agree', {
      method: 'POST',
      headers,
      body: { termsIds: [fakeId] },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('nen tra ve 401 khi khong co token xac thuc', async () => {
    const req = createRequest('/api/terms/agree', {
      method: 'POST',
      body: { termsIds: [TEST_TERMS.tos.id] },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });
});

describe('GET /api/terms/pending', () => {
  it('nen tra ve cac dieu khoan chua dong y khi user chua dong y tat ca', async () => {
    await seedNormalUser(prisma);
    await seedTerms(prisma);
    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/terms/pending', { headers });

    const response = await GET_PENDING(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(3);
  });

  it('nen tra ve danh sach rong khi user da dong y tat ca dieu khoan', async () => {
    await seedNormalUser(prisma);
    await seedTerms(prisma);

    // Agree to all terms
    const allTermIds = [TEST_TERMS.tos.id, TEST_TERMS.privacy.id, TEST_TERMS.optional.id];
    await prisma.userAgreement.createMany({
      data: allTermIds.map((trmsId) => ({
        userId: TEST_USERS.user.id,
        trmsId,
        agreYn: 'Y',
        agreDt: new Date(),
      })),
    });

    const headers = await createBearerHeader(TEST_USERS.user);
    const req = createRequest('/api/terms/pending', { headers });

    const response = await GET_PENDING(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(0);
  });

  it('nen tra ve 401 khi khong co token xac thuc', async () => {
    const req = createRequest('/api/terms/pending');

    const response = await GET_PENDING(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });
});
