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
  },
  user: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'user@test.hrlite.local',
    role: 'USER',
  },
} as const;

export const TEST_TERMS = {
  tos: { id: '10000000-0000-0000-0000-000000000001' },
  privacy: { id: '10000000-0000-0000-0000-000000000002' },
  optional: { id: '10000000-0000-0000-0000-000000000003' },
} as const;
