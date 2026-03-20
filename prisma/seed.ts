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

  // 4. Create departments (org tree)
  const deptCompany = await prisma.department.upsert({
    where: { deptCd: 'COMPANY' },
    update: {},
    create: {
      deptCd: 'COMPANY',
      deptNm: 'Công ty HRLite',
      sortOrd: 0,
      creatBy: 'SYSTEM',
    },
  });

  const deptHR = await prisma.department.upsert({
    where: { deptCd: 'DEPT-HR' },
    update: {},
    create: {
      deptCd: 'DEPT-HR',
      deptNm: 'Phòng Nhân sự',
      upperDeptId: deptCompany.id,
      sortOrd: 1,
      creatBy: 'SYSTEM',
    },
  });

  const deptTech = await prisma.department.upsert({
    where: { deptCd: 'DEPT-TECH' },
    update: {},
    create: {
      deptCd: 'DEPT-TECH',
      deptNm: 'Phòng Kỹ thuật',
      upperDeptId: deptCompany.id,
      sortOrd: 2,
      creatBy: 'SYSTEM',
    },
  });

  const deptSales = await prisma.department.upsert({
    where: { deptCd: 'DEPT-SALES' },
    update: {},
    create: {
      deptCd: 'DEPT-SALES',
      deptNm: 'Phòng Kinh doanh',
      upperDeptId: deptCompany.id,
      sortOrd: 3,
      creatBy: 'SYSTEM',
    },
  });

  await prisma.department.upsert({
    where: { deptCd: 'TEAM-BE' },
    update: {},
    create: {
      deptCd: 'TEAM-BE',
      deptNm: 'Tổ Backend',
      upperDeptId: deptTech.id,
      sortOrd: 1,
      creatBy: 'SYSTEM',
    },
  });

  await prisma.department.upsert({
    where: { deptCd: 'TEAM-FE' },
    update: {},
    create: {
      deptCd: 'TEAM-FE',
      deptNm: 'Tổ Frontend',
      upperDeptId: deptTech.id,
      sortOrd: 2,
      creatBy: 'SYSTEM',
    },
  });

  // 5. Create sample employees
  const employeeData = [
    { emplNo: 'NV-0001', emplNm: 'Nguyễn Văn An', email: 'an.nguyen@hrlite.com', deptId: deptHR.id, posiNm: 'Trưởng phòng', userId: admin.id },
    { emplNo: 'NV-0002', emplNm: 'Trần Thị Bình', email: 'binh.tran@hrlite.com', deptId: deptHR.id, posiNm: 'Chuyên viên' },
    { emplNo: 'NV-0003', emplNm: 'Lê Hoàng Cường', email: 'cuong.le@hrlite.com', deptId: deptTech.id, posiNm: 'Tech Lead' },
    { emplNo: 'NV-0004', emplNm: 'Phạm Minh Dũng', email: 'dung.pham@hrlite.com', deptId: deptTech.id, posiNm: 'Senior Developer' },
    { emplNo: 'NV-0005', emplNm: 'Hoàng Thị Ên', email: 'en.hoang@hrlite.com', deptId: deptTech.id, posiNm: 'Junior Developer' },
    { emplNo: 'NV-0006', emplNm: 'Võ Đức Phú', email: 'phu.vo@hrlite.com', deptId: deptSales.id, posiNm: 'Trưởng phòng' },
    { emplNo: 'NV-0007', emplNm: 'Đặng Thùy Giang', email: 'giang.dang@hrlite.com', deptId: deptSales.id, posiNm: 'Nhân viên kinh doanh' },
    { emplNo: 'NV-0008', emplNm: 'Bùi Quang Hải', email: 'hai.bui@hrlite.com', deptId: deptTech.id, posiNm: 'DevOps Engineer' },
    { emplNo: 'NV-0009', emplNm: 'Ngô Thị Lan', email: 'lan.ngo@hrlite.com', deptId: deptHR.id, posiNm: 'Chuyên viên tuyển dụng' },
    { emplNo: 'NV-0010', emplNm: 'Mai Thanh Khoa', email: 'khoa.mai@hrlite.com', deptId: deptSales.id, posiNm: 'Nhân viên kinh doanh', sttsCd: 'ON_LEAVE' },
  ];

  for (const emp of employeeData) {
    await prisma.employee.upsert({
      where: { emplNo: emp.emplNo },
      update: {},
      create: {
        emplNo: emp.emplNo,
        emplNm: emp.emplNm,
        email: emp.email,
        deptId: emp.deptId,
        posiNm: emp.posiNm ?? null,
        joinDt: new Date('2024-01-15'),
        emplSttsCd: emp.sttsCd ?? 'WORKING',
        userId: emp.userId ?? null,
        creatBy: 'SYSTEM',
      },
    });
  }

  // Update department heads
  const nvAn = await prisma.employee.findUnique({ where: { emplNo: 'NV-0001' } });
  const nvCuong = await prisma.employee.findUnique({ where: { emplNo: 'NV-0003' } });
  const nvPhu = await prisma.employee.findUnique({ where: { emplNo: 'NV-0006' } });

  if (nvAn) await prisma.department.update({ where: { deptCd: 'DEPT-HR' }, data: { deptHeadId: nvAn.id } });
  if (nvCuong) await prisma.department.update({ where: { deptCd: 'DEPT-TECH' }, data: { deptHeadId: nvCuong.id } });
  if (nvPhu) await prisma.department.update({ where: { deptCd: 'DEPT-SALES' }, data: { deptHeadId: nvPhu.id } });

  // eslint-disable-next-line no-console
  console.log('Seed completed:');
  // eslint-disable-next-line no-console
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
  // eslint-disable-next-line no-console
  console.log(`  Terms: ${termsOfService.title}, ${privacyPolicy.title}`);
  // eslint-disable-next-line no-console
  console.log(`  Departments: 6 (Company + 3 PB + 2 Tổ)`);
  // eslint-disable-next-line no-console
  console.log(`  Employees: ${employeeData.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
