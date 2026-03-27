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

  // 2. Crawl từ API
  const users = await fetchRandomUsers(count);
  logger.info(`[Crawl] Đã fetch ${users.length} người dùng từ API`);

  // 3. Lấy email + emplNo hiện có để tránh trùng
  const [existingEmailRows, existingEmplNoRows] = await Promise.all([
    prisma.employee.findMany({ select: { email: true } }),
    prisma.employee.findMany({ select: { emplNo: true } }),
  ]);
  const existingEmails = new Set(existingEmailRows.map((e) => e.email));
  const existingEmplNos = new Set(existingEmplNoRows.map((e) => e.emplNo));

  // 4. Chuẩn bị dữ liệu batch insert
  const newEmployees = [];

  for (const user of users) {
    const email = toGmailAddress(user);

    if (existingEmails.has(email)) {
      continue;
    }

    const emplNo = generateEmplNo(existingEmplNos);
    const dept = departments[Math.floor(Math.random() * departments.length)];

    newEmployees.push({
      emplNo,
      emplNm: `${user.name.first} ${user.name.last}`,
      email,
      phoneNo: toVNPhoneNumber(),
      deptId: dept.id,
      posiNm: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
      joinDt: randomJoinDate(),
      emplSttsCd: 'WORKING',
      creatBy: 'CRAWL_AUTO',
    });

    existingEmails.add(email);
    existingEmplNos.add(emplNo);
  }

  // 5. Batch insert — skipDuplicates tránh lỗi unique constraint
  const result = await prisma.employee.createMany({
    data: newEmployees,
    skipDuplicates: true,
  });

  const created = result.count;
  const skipped = users.length - created;
  const totalInDb = existingEmplNos.size - newEmployees.length + newEmployees.length;

  logger.info(`[Crawl] Hoàn tất: crawl=${users.length}, tạo=${created}, bỏ qua=${skipped}`);

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

function generateEmplNo(existingEmplNos: Set<string>): string {
  const timestamp = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  const emplNo = `NV-${timestamp}${rand}`.toUpperCase().substring(0, 12);

  if (existingEmplNos.has(emplNo)) {
    return generateEmplNo(existingEmplNos);
  }
  return emplNo;
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
