import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import logger from '../../common/logger';

const POSITIONS = [
  'Nhân viên', 'Chuyên viên', 'Senior Developer', 'Junior Developer',
  'Trưởng nhóm', 'Kế toán', 'Nhân viên kinh doanh', 'QA Engineer',
  'Designer', 'DevOps Engineer', 'Business Analyst', 'Project Manager',
];

interface RandomUser {
  name: { first: string; last: string };
  email: string;
  phone: string;
}

@Injectable()
export class CrawlService {
  constructor(private prisma: PrismaService) {}

  async crawlRandomUsers(count: number) {
    logger.info(`[Crawl] Bắt đầu crawl ${count} người dùng từ randomuser.me`);

    const departments = await this.prisma.department.findMany({
      where: { delYn: 'N', useYn: 'Y', deptCd: { not: 'COMPANY' } },
      select: { id: true },
    });

    if (departments.length === 0) {
      throw new Error('Chưa có phòng ban nào trong DB');
    }

    // Fetch from API
    const users = await this.fetchRandomUsers(count);
    logger.info(`[Crawl] Đã fetch ${users.length} người dùng từ API`);

    // Get existing to avoid duplicates
    const [existingEmailRows, existingEmplNoRows] = await Promise.all([
      this.prisma.employee.findMany({ select: { email: true } }),
      this.prisma.employee.findMany({ select: { emplNo: true } }),
    ]);
    const existingEmails = new Set(existingEmailRows.map((e) => e.email));
    const existingEmplNos = new Set(existingEmplNoRows.map((e) => e.emplNo));

    const newEmployees = [];
    for (const user of users) {
      const email = this.toGmailAddress(user);
      if (existingEmails.has(email)) continue;

      const emplNo = this.generateEmplNo(existingEmplNos);
      const dept = departments[Math.floor(Math.random() * departments.length)];

      newEmployees.push({
        emplNo,
        emplNm: `${user.name.first} ${user.name.last}`,
        email,
        phoneNo: this.toVNPhoneNumber(),
        deptId: dept.id,
        posiNm: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
        joinDt: this.randomJoinDate(),
        emplSttsCd: 'WORKING',
        creatBy: 'CRAWL_AUTO',
      });

      existingEmails.add(email);
      existingEmplNos.add(emplNo);
    }

    const result = await this.prisma.employee.createMany({
      data: newEmployees,
      skipDuplicates: true,
    });

    const created = result.count;
    const skipped = users.length - created;

    logger.info(
      `[Crawl] Hoàn tất: crawl=${users.length}, tạo=${created}, bỏ qua=${skipped}`,
    );

    return {
      totalCrawled: users.length,
      created,
      skipped,
      totalInDb: existingEmplNos.size,
    };
  }

  private async fetchRandomUsers(count: number): Promise<RandomUser[]> {
    const allUsers: RandomUser[] = [];
    let remaining = count;
    const batchSize = 50;

    while (remaining > 0) {
      const batch = Math.min(remaining, batchSize);
      const url = `https://randomuser.me/api/?results=${batch}&nat=us,gb,fr,de,au`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
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

  private generateEmplNo(existingEmplNos: Set<string>): string {
    const timestamp = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 6);
    const emplNo = `NV-${timestamp}${rand}`.toUpperCase().substring(0, 12);

    if (existingEmplNos.has(emplNo)) {
      return this.generateEmplNo(existingEmplNos);
    }
    return emplNo;
  }

  private toGmailAddress(user: RandomUser): string {
    const first = user.name.first.toLowerCase().replace(/[^a-z]/g, '');
    const last = user.name.last.toLowerCase().replace(/[^a-z]/g, '');
    const rand = Math.floor(Math.random() * 999);
    return `${first}.${last}${rand}@gmail.com`;
  }

  private toVNPhoneNumber(): string {
    const prefixes = [
      '090', '091', '093', '094', '096', '097', '098',
      '032', '033', '034', '035', '036', '037', '038', '039',
      '070', '076', '077', '078', '079',
      '081', '082', '083', '084', '085', '086', '088', '089',
    ];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0');
    return `${prefix}${suffix}`;
  }

  private randomJoinDate(): Date {
    const now = Date.now();
    const fiveYearsAgo = now - 5 * 365 * 24 * 60 * 60 * 1000;
    return new Date(fiveYearsAgo + Math.random() * (now - fiveYearsAgo));
  }
}
