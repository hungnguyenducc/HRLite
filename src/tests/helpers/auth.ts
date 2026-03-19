import { generateAccessToken, generateRefreshToken, hashToken } from '@/lib/auth/jwt';
import { hashPassword } from '@/lib/auth/password';

export interface TestUserPayload {
  id: string;
  email: string;
  role: string;
}

export const TEST_USERS = {
  admin: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@test.hrlite.local',
    role: 'ADMIN',
    password: 'Admin@12345',
  },
  user: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'user@test.hrlite.local',
    role: 'USER',
    password: 'User@12345',
  },
} as const;

export const TEST_TERMS = {
  tos: { id: '10000000-0000-0000-0000-000000000001' },
  privacy: { id: '10000000-0000-0000-0000-000000000002' },
  optional: { id: '10000000-0000-0000-0000-000000000003' },
} as const;

export async function createAccessToken(p: TestUserPayload): Promise<string> {
  return generateAccessToken({ sub: p.id, email: p.email, role: p.role });
}

export async function createRefreshToken(p: TestUserPayload): Promise<string> {
  return generateRefreshToken({ sub: p.id, email: p.email, role: p.role });
}

export async function createBearerHeader(p: TestUserPayload): Promise<Record<string, string>> {
  const token = await createAccessToken(p);
  return { Authorization: `Bearer ${token}` };
}

export async function createAuthCookies(p: TestUserPayload) {
  const access = await createAccessToken(p);
  const refresh = await createRefreshToken(p);
  return { access_token: access, refresh_token: refresh };
}

export async function createPasswordHash(password: string): Promise<string> {
  return hashPassword(password);
}

export async function createTokenHash(token: string): Promise<string> {
  return hashToken(token);
}
