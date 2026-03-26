import { prisma } from '@/lib/db';
import logger from '@/lib/logger';

/** Cấu hình mặc định */
const DEFAULT_CONFIG = {
  batchSize: 50,
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

interface RandomUser {
  name: { first: string; last: string };
  email: string;
  dob: { date: string; age: number };
  phone: string;
  nat: string;
}

interface CrawlResult {
  totalCrawled: number;
  created: number;
  skipped: number;
  totalInDb: number;
}

/**
 * Crawl dữ liệu người dùng từ randomuser.me và lưu vào DB
 */
export async function crawlRandomUsers(count: number): Promise<CrawlResult> {
  logger.info(`[Crawl] Bắt đầu crawl ${count} người dùng từ randomuser.me`);

  // 1. Lấy danh sách phòng ban
  const departments = await prisma.department.findMany({
    where: { delYn: 'N', useYn: 'Y', deptCd: { not: 'COMPANY' } },
    select: { id: true, deptNm: true },
  });

  if (departments.length === 0) {
    throw new Error('Chưa có phòng ban nào trong DB');
  }

  // 2. Đếm nhân viên hiện có
  const existingCount = await prisma.employee.count();

  // 3. Crawl từ API
  const users = await fetchRandomUsers(count);
  logger.info(`[Crawl] Đã fetch ${users.length} người dùng từ API`);

  // 4. Lấy email hiện có để tránh trùng
  const existingEmails = new Set(
    (await prisma.employee.findMany({ select: { email: true } })).map((e) => e.email),
  );

  // 5. Tạo nhân viên
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const email = toGmailAddress(user);

    if (existingEmails.has(email)) {
      skipped++;
      continue;
    }

    const emplNo = generateEmplNo(created, existingCount);
    const dept = departments[Math.floor(Math.random() * departments.length)];

    try {
      await prisma.employee.create({
        data: {
          emplNo,
          emplNm: `${user.name.first} ${user.name.last}`,
          email,
          phoneNo: toVNPhoneNumber(),
          deptId: dept.id,
          posiNm: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
          joinDt: randomJoinDate(),
          emplSttsCd: 'WORKING',
          creatBy: 'CRAWL_AUTO',
        },
      });

      existingEmails.add(email);
      created++;
    } catch {
      skipped++;
    }
  }

  const totalInDb = existingCount + created;
  logger.info(`[Crawl] Hoàn tất: crawl=${users.length}, tạo=${created}, bỏ qua=${skipped}, tổng DB=${totalInDb}`);

  return { totalCrawled: users.length, created, skipped, totalInDb };
}

/** Fetch dữ liệu từ randomuser.me API */
async function fetchRandomUsers(count: number): Promise<RandomUser[]> {
  const allUsers: RandomUser[] = [];
  let remaining = count;

  while (remaining > 0) {
    const batch = Math.min(remaining, DEFAULT_CONFIG.batchSize);
    const url = `${DEFAULT_CONFIG.apiUrl}?results=${batch}&nat=us,gb,fr,de,au`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    allUsers.push(...data.results);
    remaining -= batch;

    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return allUsers;
}

function generateEmplNo(index: number, existingCount: number): string {
  const num = existingCount + index + 1;
  return `NV-${num.toString().padStart(4, '0')}`;
}

function toGmailAddress(user: RandomUser): string {
  const first = user.name.first.toLowerCase().replace(/[^a-z]/g, '');
  const last = user.name.last.toLowerCase().replace(/[^a-z]/g, '');
  const rand = Math.floor(Math.random() * 999);
  return `${first}.${last}${rand}@gmail.com`;
}

function toVNPhoneNumber(): string {
  const prefixes = ['090', '091', '093', '094', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039', '070', '076', '077', '078', '079', '081', '082', '083', '084', '085', '086', '088', '089'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${suffix}`;
}

function randomJoinDate(): Date {
  const now = Date.now();
  const fiveYearsAgo = now - 5 * 365 * 24 * 60 * 60 * 1000;
  return new Date(fiveYearsAgo + Math.random() * (now - fiveYearsAgo));
}
