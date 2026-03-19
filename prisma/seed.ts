import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Create default admin user
  const adminEmail = 'admin@hrlite.com';
  const adminPassword = 'Admin@123456';
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwdHash: adminHash,
      displayName: 'Quản trị viên',
      roleCd: 'ADMIN',
      sttsCd: 'ACTIVE',
      creatBy: 'SYSTEM',
    },
  });

  // 2. Create default terms
  const termsOfService = await prisma.terms.upsert({
    where: { typeCd_verNo: { typeCd: 'TERMS_OF_SERVICE', verNo: '1' } },
    update: {},
    create: {
      typeCd: 'TERMS_OF_SERVICE',
      verNo: '1',
      title: 'Điều khoản sử dụng',
      content:
        'Bằng việc sử dụng HRLite, bạn đồng ý tuân thủ các điều khoản và điều kiện sau đây. ' +
        'HRLite cung cấp dịch vụ quản lý nhân sự nội bộ dành cho tổ chức của bạn. ' +
        'Bạn chịu trách nhiệm bảo mật thông tin tài khoản và không chia sẻ mật khẩu với người khác.',
      reqYn: 'Y',
      actvYn: 'Y',
      enfcDt: new Date(),
      creatBy: 'SYSTEM',
    },
  });

  const privacyPolicy = await prisma.terms.upsert({
    where: { typeCd_verNo: { typeCd: 'PRIVACY_POLICY', verNo: '1' } },
    update: {},
    create: {
      typeCd: 'PRIVACY_POLICY',
      verNo: '1',
      title: 'Chính sách bảo mật',
      content:
        'Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn. ' +
        'Dữ liệu nhân sự chỉ được sử dụng cho mục đích quản lý nội bộ tổ chức. ' +
        'Chúng tôi không chia sẻ thông tin cá nhân với bên thứ ba nếu không có sự đồng ý của bạn.',
      reqYn: 'Y',
      actvYn: 'Y',
      enfcDt: new Date(),
      creatBy: 'SYSTEM',
    },
  });

  // 3. Create agreement records for admin
  for (const term of [termsOfService, privacyPolicy]) {
    await prisma.userAgreement.upsert({
      where: { userId_trmsId: { userId: admin.id, trmsId: term.id } },
      update: {},
      create: {
        userId: admin.id,
        trmsId: term.id,
        agreYn: 'Y',
        agreDt: new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed completed:');
  // eslint-disable-next-line no-console
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
  // eslint-disable-next-line no-console
  console.log(`  Terms: ${termsOfService.title}, ${privacyPolicy.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
