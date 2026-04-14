import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const CRAWL_CONFIG = {
  totalUsers: 1000,
  batchSize: 100,
  apiUrl: 'https://randomuser.me/api/',
};

interface RandomUser {
  gender: string;
  name: { first: string; last: string };
  email: string;
  phone: string;
  dob: { date: string; age: number };
  location: {
    street: { number: number; name: string };
    city: string;
    state: string;
    country: string;
  };
  picture: { large: string; medium: string; thumbnail: string };
  nat: string;
}

/**
 * Crawl dữ liệu từ randomuser.me
 */
async function fetchUsers(count: number): Promise<RandomUser[]> {
  const allUsers: RandomUser[] = [];
  let remaining = count;
  let batch = 0;

  while (remaining > 0) {
    const size = Math.min(remaining, CRAWL_CONFIG.batchSize);
    batch++;
    const url = `${CRAWL_CONFIG.apiUrl}?results=${size}&nat=us,gb,fr,de,au,br`;

    // eslint-disable-next-line no-console
    console.log(`  Batch ${batch}: crawling ${size} users...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    const data = await response.json();
    allUsers.push(...data.results);
    remaining -= size;

    // Rate limiting
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return allUsers;
}

/**
 * Tạo mã khách hàng: KH-000001
 */
function generateCustNo(index: number, existingCount: number): string {
  const num = existingCount + index + 1;
  return `KH-${num.toString().padStart(6, '0')}`;
}

/**
 * Tạo email gmail từ tên
 */
function toGmail(user: RandomUser): string {
  const first = user.name.first.toLowerCase().replace(/[^a-z]/g, '');
  const last = user.name.last.toLowerCase().replace(/[^a-z]/g, '');
  const rand = Math.floor(Math.random() * 9999);
  return `${first}.${last}${rand}@gmail.com`;
}

/**
 * Tạo SĐT Việt Nam
 */
function toVNPhone(): string {
  const prefixes = ['090', '091', '093', '094', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039', '070', '076', '077', '078', '079', '081', '082', '083', '084', '085', '086', '088', '089'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${suffix}`;
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('=== Crawl 1000 khách hàng từ randomuser.me ===\n');

  // 1. Đếm khách hàng hiện có
  const existingCount = await prisma.customer.count();
  // eslint-disable-next-line no-console
  console.log(`Khách hàng hiện có: ${existingCount}\n`);

  // 2. Crawl
  const users = await fetchUsers(CRAWL_CONFIG.totalUsers);
  // eslint-disable-next-line no-console
  console.log(`\nĐã crawl ${users.length} người dùng\n`);

  // 3. Lấy email đã tồn tại
  const existingEmails = new Set(
    (await prisma.customer.findMany({ select: { email: true } })).map((c) => c.email),
  );

  // 4. Insert vào DB
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const email = toGmail(user);

    if (existingEmails.has(email)) {
      skipped++;
      continue;
    }

    try {
      await prisma.customer.create({
        data: {
          custNo: generateCustNo(created, existingCount),
          custNm: `${user.name.first} ${user.name.last}`,
          email,
          phoneNo: toVNPhone(),
          birthDt: new Date(user.dob.date),
          gendrCd: user.gender === 'male' ? 'M' : 'F',
          addr: `${user.location.street.number} ${user.location.street.name}`,
          city: user.location.city,
          countryCd: user.nat,
          photoUrl: user.picture.thumbnail,
          custSttsCd: 'ACTIVE',
          creatBy: 'CRAWL_SEED',
        },
      });

      existingEmails.add(email);
      created++;

      if (created % 100 === 0) {
        // eslint-disable-next-line no-console
        console.log(`  Đã tạo ${created}/${users.length} khách hàng...`);
      }
    } catch {
      skipped++;
    }
  }

  // eslint-disable-next-line no-console
  console.log('\n=== Kết quả ===');
  // eslint-disable-next-line no-console
  console.log(`  Tổng crawl: ${users.length}`);
  // eslint-disable-next-line no-console
  console.log(`  Đã tạo: ${created}`);
  // eslint-disable-next-line no-console
  console.log(`  Bỏ qua (trùng): ${skipped}`);
  // eslint-disable-next-line no-console
  console.log(`  Tổng khách hàng trong DB: ${existingCount + created}`);
}

main()
  .catch((e) => {
    console.error('Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
