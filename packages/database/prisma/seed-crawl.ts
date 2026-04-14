import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

/** Cấu hình crawl */
const CRAWL_CONFIG = {
  /** Số lượng người dùng cần crawl */
  totalUsers: 50,
  /** Số lượng mỗi lần gọi API (max 5000) */
  batchSize: 50,
  /** URL API */
  apiUrl: 'https://randomuser.me/api/',
};

/** Danh sách chức vụ mẫu */
const POSITIONS = [
  'Nhân viên',
  'Chuyên viên',
  'Senior Developer',
  'Junior Developer',
  'Trưởng nhóm',
  'Kế toán',
  'Nhân viên kinh doanh',
  'QA Engineer',
  'Designer',
  'DevOps Engineer',
  'Business Analyst',
  'Project Manager',
];

interface RandomUserResult {
  results: RandomUser[];
  info: { seed: string; results: number; page: number; version: string };
}

interface RandomUser {
  gender: string;
  name: { title: string; first: string; last: string };
  email: string;
  phone: string;
  cell: string;
  dob: { date: string; age: number };
  location: {
    street: { number: number; name: string };
    city: string;
    state: string;
    country: string;
  };
  login: { uuid: string; username: string };
  picture: { large: string; medium: string; thumbnail: string };
  nat: string;
}

/**
 * Crawl dữ liệu từ randomuser.me API
 */
async function crawlRandomUsers(count: number): Promise<RandomUser[]> {
  const allUsers: RandomUser[] = [];
  let remaining = count;

  while (remaining > 0) {
    const batch = Math.min(remaining, CRAWL_CONFIG.batchSize);
    const url = `${CRAWL_CONFIG.apiUrl}?results=${batch}&nat=us,gb,fr,de,au`;

    // eslint-disable-next-line no-console
    console.log(`Crawling ${batch} users from randomuser.me...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data: RandomUserResult = await response.json();
    allUsers.push(...data.results);
    remaining -= batch;

    // Rate limiting: chờ 1 giây giữa các batch
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return allUsers;
}

/**
 * Tạo mã nhân viên theo format NV-XXXX
 */
function generateEmplNo(index: number, existingCount: number): string {
  const num = existingCount + index + 1;
  return `NV-${num.toString().padStart(4, '0')}`;
}

/**
 * Tạo email @gmail.com từ tên người dùng
 */
function toGmailAddress(user: RandomUser): string {
  const first = user.name.first.toLowerCase().replace(/[^a-z]/g, '');
  const last = user.name.last.toLowerCase().replace(/[^a-z]/g, '');
  const rand = Math.floor(Math.random() * 999);
  return `${first}.${last}${rand}@gmail.com`;
}

/**
 * Format số điện thoại Việt Nam giả
 */
function toVNPhoneNumber(): string {
  const prefixes = ['090', '091', '093', '094', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039', '070', '076', '077', '078', '079', '081', '082', '083', '084', '085', '086', '088', '089', '056', '058', '059'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${suffix}`;
}

/**
 * Chọn chức vụ ngẫu nhiên
 */
function randomPosition(): string {
  return POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
}

/**
 * Tạo ngày vào làm ngẫu nhiên (trong 5 năm gần đây)
 */
function randomJoinDate(): Date {
  const now = Date.now();
  const fiveYearsAgo = now - 5 * 365 * 24 * 60 * 60 * 1000;
  const randomTime = fiveYearsAgo + Math.random() * (now - fiveYearsAgo);
  return new Date(randomTime);
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('=== Bắt đầu crawl dữ liệu từ randomuser.me ===\n');

  // 1. Lấy danh sách phòng ban hiện có
  const departments = await prisma.department.findMany({
    where: { delYn: 'N', useYn: 'Y' },
    select: { id: true, deptNm: true, deptCd: true },
  });

  if (departments.length === 0) {
    // eslint-disable-next-line no-console
    console.error('Chưa có phòng ban nào. Hãy chạy seed chính trước: npx prisma db seed');
    process.exit(1);
  }

  // Loại bỏ dept COMPANY (gốc), chỉ phân bổ vào phòng ban con
  const assignableDepts = departments.filter((d) => d.deptCd !== 'COMPANY');
  // eslint-disable-next-line no-console
  console.log(`Phòng ban có sẵn: ${assignableDepts.map((d) => d.deptNm).join(', ')}\n`);

  // 2. Đếm nhân viên hiện có để tạo mã NV tiếp theo
  const existingCount = await prisma.employee.count();
  // eslint-disable-next-line no-console
  console.log(`Nhân viên hiện có: ${existingCount}\n`);

  // 3. Crawl dữ liệu
  const users = await crawlRandomUsers(CRAWL_CONFIG.totalUsers);
  // eslint-disable-next-line no-console
  console.log(`\nĐã crawl ${users.length} người dùng\n`);

  // 4. Kiểm tra email trùng lặp với DB
  const existingEmails = new Set(
    (await prisma.employee.findMany({ select: { email: true } })).map((e) => e.email),
  );

  // 5. Seed vào DB
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const email = toGmailAddress(user);

    if (existingEmails.has(email)) {
      skipped++;
      continue;
    }

    const emplNo = generateEmplNo(created, existingCount);
    const dept = assignableDepts[Math.floor(Math.random() * assignableDepts.length)];
    const fullName = `${user.name.first} ${user.name.last}`;

    try {
      await prisma.employee.create({
        data: {
          emplNo,
          emplNm: fullName,
          email,
          phoneNo: toVNPhoneNumber(),
          deptId: dept.id,
          posiNm: randomPosition(),
          joinDt: randomJoinDate(),
          emplSttsCd: 'WORKING',
          creatBy: 'CRAWL_SEED',
        },
      });

      existingEmails.add(email);
      created++;

      if (created % 10 === 0) {
        // eslint-disable-next-line no-console
        console.log(`  Đã tạo ${created}/${users.length} nhân viên...`);
      }
    } catch (error) {
      skipped++;
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.log(`  Bỏ qua ${fullName} (${email}): ${message}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log('\n=== Kết quả crawl ===');
  // eslint-disable-next-line no-console
  console.log(`  Tổng crawl: ${users.length}`);
  // eslint-disable-next-line no-console
  console.log(`  Đã tạo: ${created}`);
  // eslint-disable-next-line no-console
  console.log(`  Bỏ qua (trùng): ${skipped}`);
  // eslint-disable-next-line no-console
  console.log(`  Tổng nhân viên trong DB: ${existingCount + created}`);
}

main()
  .catch((e) => {
    console.error('Lỗi crawl:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
