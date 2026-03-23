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
    {
      emplNo: 'NV-0001',
      emplNm: 'Nguyễn Văn An',
      email: 'an.nguyen@hrlite.com',
      deptId: deptHR.id,
      posiNm: 'Trưởng phòng',
      userId: admin.id,
    },
    {
      emplNo: 'NV-0002',
      emplNm: 'Trần Thị Bình',
      email: 'binh.tran@hrlite.com',
      deptId: deptHR.id,
      posiNm: 'Chuyên viên',
    },
    {
      emplNo: 'NV-0003',
      emplNm: 'Lê Hoàng Cường',
      email: 'cuong.le@hrlite.com',
      deptId: deptTech.id,
      posiNm: 'Tech Lead',
    },
    {
      emplNo: 'NV-0004',
      emplNm: 'Phạm Minh Dũng',
      email: 'dung.pham@hrlite.com',
      deptId: deptTech.id,
      posiNm: 'Senior Developer',
    },
    {
      emplNo: 'NV-0005',
      emplNm: 'Hoàng Thị Ên',
      email: 'en.hoang@hrlite.com',
      deptId: deptTech.id,
      posiNm: 'Junior Developer',
    },
    {
      emplNo: 'NV-0006',
      emplNm: 'Võ Đức Phú',
      email: 'phu.vo@hrlite.com',
      deptId: deptSales.id,
      posiNm: 'Trưởng phòng',
    },
    {
      emplNo: 'NV-0007',
      emplNm: 'Đặng Thùy Giang',
      email: 'giang.dang@hrlite.com',
      deptId: deptSales.id,
      posiNm: 'Nhân viên kinh doanh',
    },
    {
      emplNo: 'NV-0008',
      emplNm: 'Bùi Quang Hải',
      email: 'hai.bui@hrlite.com',
      deptId: deptTech.id,
      posiNm: 'DevOps Engineer',
    },
    {
      emplNo: 'NV-0009',
      emplNm: 'Ngô Thị Lan',
      email: 'lan.ngo@hrlite.com',
      deptId: deptHR.id,
      posiNm: 'Chuyên viên tuyển dụng',
    },
    {
      emplNo: 'NV-0010',
      emplNm: 'Mai Thanh Khoa',
      email: 'khoa.mai@hrlite.com',
      deptId: deptSales.id,
      posiNm: 'Nhân viên kinh doanh',
      sttsCd: 'ON_LEAVE',
    },
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

  if (nvAn)
    await prisma.department.update({ where: { deptCd: 'DEPT-HR' }, data: { deptHeadId: nvAn.id } });
  if (nvCuong)
    await prisma.department.update({
      where: { deptCd: 'DEPT-TECH' },
      data: { deptHeadId: nvCuong.id },
    });
  if (nvPhu)
    await prisma.department.update({
      where: { deptCd: 'DEPT-SALES' },
      data: { deptHeadId: nvPhu.id },
    });

  // 6. Create leave types
  const leaveTypes = [
    { lvTypeCd: 'ANNUAL', lvTypeNm: 'Nghỉ phép năm', maxDays: 12 },
    { lvTypeCd: 'SICK', lvTypeNm: 'Nghỉ ốm', maxDays: 30 },
    { lvTypeCd: 'MARRIAGE', lvTypeNm: 'Nghỉ cưới', maxDays: 3 },
    { lvTypeCd: 'MATERNITY', lvTypeNm: 'Nghỉ thai sản', maxDays: 180 },
    { lvTypeCd: 'PATERNITY', lvTypeNm: 'Nghỉ chăm con', maxDays: 5 },
    { lvTypeCd: 'BEREAVEMENT', lvTypeNm: 'Nghỉ tang', maxDays: 3 },
    { lvTypeCd: 'UNPAID', lvTypeNm: 'Nghỉ không lương', maxDays: null },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { lvTypeCd: lt.lvTypeCd },
      update: {},
      create: lt,
    });
  }

  // 7. Create sample attendance records (last 2 weeks for working employees)
  const workingEmployees = await prisma.employee.findMany({
    where: { delYn: 'N', emplSttsCd: 'WORKING' },
    select: { id: true, emplNo: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const emp of workingEmployees) {
    for (let dayOffset = 14; dayOffset >= 1; dayOffset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      // Random check-in between 07:30 and 09:15
      const inHour = 7 + Math.floor(Math.random() * 2);
      const inMin = Math.floor(Math.random() * 60);
      const chkIn = new Date(date);
      chkIn.setHours(inHour, inMin, 0, 0);

      // Random check-out between 17:00 and 18:30
      const outHour = 17 + Math.floor(Math.random() * 2);
      const outMin = Math.floor(Math.random() * 30);
      const chkOut = new Date(date);
      chkOut.setHours(outHour, outMin, 0, 0);

      const workHour = Math.round(((chkOut.getTime() - chkIn.getTime()) / 3600000) * 100) / 100;
      let status = 'PRESENT';
      if (inHour > 9 || (inHour === 9 && inMin > 0)) status = 'LATE';
      if (workHour < 4) status = 'HALF_DAY';

      try {
        await prisma.attendance.upsert({
          where: { emplId_atndDt: { emplId: emp.id, atndDt: date } },
          update: {},
          create: {
            emplId: emp.id,
            atndDt: date,
            chkInTm: chkIn,
            chkOutTm: chkOut,
            workHour,
            atndSttsCd: status,
            creatBy: 'SYSTEM',
          },
        });
      } catch {
        // Ignore duplicate constraint errors
      }
    }
  }

  // 8. Create sample leave requests
  const sampleLeaves = [
    { emplIdx: 1, lvTypeCd: 'ANNUAL', startOffset: 5, endOffset: 6, rsn: 'Việc gia đình', status: 'APPROVED' },
    { emplIdx: 3, lvTypeCd: 'SICK', startOffset: 3, endOffset: 3, rsn: 'Khám sức khỏe định kỳ', status: 'APPROVED' },
    { emplIdx: 5, lvTypeCd: 'ANNUAL', startOffset: -2, endOffset: -1, rsn: 'Du lịch', status: 'APPROVED' },
    { emplIdx: 6, lvTypeCd: 'ANNUAL', startOffset: 7, endOffset: 8, rsn: 'Nghỉ phép cá nhân', status: 'PENDING' },
    { emplIdx: 2, lvTypeCd: 'BEREAVEMENT', startOffset: 10, endOffset: 12, rsn: 'Tang gia', status: 'PENDING' },
    { emplIdx: 7, lvTypeCd: 'ANNUAL', startOffset: -5, endOffset: -4, rsn: 'Về quê', status: 'REJECTED' },
  ];

  for (const sl of sampleLeaves) {
    const emp = workingEmployees[sl.emplIdx % workingEmployees.length];
    const startDt = new Date(today);
    startDt.setDate(startDt.getDate() + sl.startOffset);
    const endDt = new Date(today);
    endDt.setDate(endDt.getDate() + sl.endOffset);

    // Calculate days (simple, no weekend check for seed)
    let days = 0;
    const cur = new Date(startDt);
    while (cur <= endDt) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) days++;
      cur.setDate(cur.getDate() + 1);
    }
    if (days === 0) days = 1;

    try {
      await prisma.leaveRequest.create({
        data: {
          emplId: emp.id,
          lvTypeCd: sl.lvTypeCd,
          startDt,
          endDt,
          lvDays: days,
          rsn: sl.rsn,
          aprvlSttsCd: sl.status,
          aprvrId: sl.status !== 'PENDING' ? nvAn?.id : null,
          aprvlDt: sl.status !== 'PENDING' ? new Date() : null,
          creatBy: 'SYSTEM',
        },
      });
    } catch {
      // Ignore if already exists
    }
  }

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
  // eslint-disable-next-line no-console
  console.log(`  Leave types: ${leaveTypes.length}`);
  // eslint-disable-next-line no-console
  console.log(`  Attendance records: ~${workingEmployees.length * 10} (2 weeks)`);
  // eslint-disable-next-line no-console
  console.log(`  Leave requests: ${sampleLeaves.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
