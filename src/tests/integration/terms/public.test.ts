import { PrismaClient } from '@prisma/client';
import { cleanDatabase, seedTerms } from '../../helpers/db';
import { createRequest } from '../../helpers/request';
import { TEST_TERMS } from '../../helpers/auth';
import { __resetStoreForTesting } from '@/lib/auth/rate-limit';
import { GET } from '@/app/api/terms/active/route';

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

describe('GET /api/terms/active (public)', () => {
  it('nen tra ve cac dieu khoan dang hoat dong voi enfcDt <= hien tai', async () => {
    await seedTerms(prisma);
    const req = createRequest('/api/terms/active');

    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(3);

    // Verify each term has expected fields
    json.data.forEach((term: Record<string, unknown>) => {
      expect(term.id).toBeDefined();
      expect(term.typeCd).toBeDefined();
      expect(term.verNo).toBeDefined();
      expect(term.title).toBeDefined();
      expect(term.content).toBeDefined();
      expect(term.reqYn).toBeDefined();
      expect(term.enfcDt).toBeDefined();
    });
  });

  it('nen loai tru cac dieu khoan khong hoat dong', async () => {
    await seedTerms(prisma);

    // Deactivate one term
    await prisma.terms.update({
      where: { id: TEST_TERMS.optional.id },
      data: { actvYn: 'N' },
    });

    const req = createRequest('/api/terms/active');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.length).toBe(2);
    const ids = json.data.map((t: Record<string, unknown>) => t.id);
    expect(ids).not.toContain(TEST_TERMS.optional.id);
  });

  it('nen loai tru cac dieu khoan co ngay hieu luc trong tuong lai', async () => {
    await seedTerms(prisma);

    // Set one term to future date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    await prisma.terms.update({
      where: { id: TEST_TERMS.privacy.id },
      data: { enfcDt: futureDate },
    });

    const req = createRequest('/api/terms/active');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.length).toBe(2);
    const ids = json.data.map((t: Record<string, unknown>) => t.id);
    expect(ids).not.toContain(TEST_TERMS.privacy.id);
  });
});
