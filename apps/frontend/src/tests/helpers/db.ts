import { PrismaClient } from '@prisma/client';
import { TEST_USERS, TEST_TERMS } from './auth';

/** Reset toàn bộ dữ liệu test theo thứ tự FK */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.userAgreement.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.terms.deleteMany();
}

/** Seed Terms mặc định */
export async function seedTerms(prisma: PrismaClient) {
  return prisma.terms.createMany({
    data: [
      {
        id: TEST_TERMS.tos.id,
        typeCd: 'TERMS_OF_SERVICE',
        verNo: '1',
        title: 'Điều khoản sử dụng',
        content: 'Nội dung điều khoản test',
        reqYn: 'Y',
        actvYn: 'Y',
        enfcDt: new Date('2024-01-01'),
        creatBy: 'SYSTEM',
      },
      {
        id: TEST_TERMS.privacy.id,
        typeCd: 'PRIVACY_POLICY',
        verNo: '1',
        title: 'Chính sách bảo mật',
        content: 'Nội dung chính sách test',
        reqYn: 'Y',
        actvYn: 'Y',
        enfcDt: new Date('2024-01-01'),
        creatBy: 'SYSTEM',
      },
      {
        id: TEST_TERMS.optional.id,
        typeCd: 'OTHER',
        verNo: '1',
        title: 'Marketing (tùy chọn)',
        content: 'Nội dung marketing test',
        reqYn: 'N',
        actvYn: 'Y',
        enfcDt: new Date('2024-01-01'),
        creatBy: 'SYSTEM',
      },
    ],
    skipDuplicates: true,
  });
}

/** Seed admin user */
export async function seedAdminUser(prisma: PrismaClient) {
  return prisma.user.create({
    data: {
      id: TEST_USERS.admin.id,
      email: TEST_USERS.admin.email,
      firebaseUid: 'firebase-admin-test-uid',
      displayName: 'Admin Test',
      roleCd: 'ADMIN',
      sttsCd: 'ACTIVE',
      delYn: 'N',
      creatBy: 'SYSTEM',
    },
  });
}

/** Seed normal user */
export async function seedNormalUser(prisma: PrismaClient) {
  return prisma.user.create({
    data: {
      id: TEST_USERS.user.id,
      email: TEST_USERS.user.email,
      firebaseUid: 'firebase-user-test-uid',
      displayName: 'User Test',
      roleCd: 'USER',
      sttsCd: 'ACTIVE',
      delYn: 'N',
      creatBy: 'SYSTEM',
    },
  });
}
