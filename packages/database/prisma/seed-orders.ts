import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

/** Sản phẩm mẫu */
const PRODUCTS = [
  { name: 'Laptop Dell XPS 15', price: 35000000 },
  { name: 'iPhone 16 Pro Max', price: 34990000 },
  { name: 'Samsung Galaxy S25', price: 25990000 },
  { name: 'iPad Air M2', price: 18990000 },
  { name: 'AirPods Pro 3', price: 6990000 },
  { name: 'Bàn phím Logitech MX Keys', price: 2890000 },
  { name: 'Chuột Logitech MX Master 3S', price: 2490000 },
  { name: 'Màn hình LG 27" 4K', price: 8990000 },
  { name: 'Tai nghe Sony WH-1000XM5', price: 7490000 },
  { name: 'Apple Watch Series 10', price: 12990000 },
  { name: 'Bàn nâng hạ FlexiSpot', price: 6990000 },
  { name: 'Ghế công thái học Ergohuman', price: 15990000 },
  { name: 'Webcam Logitech Brio 4K', price: 3990000 },
  { name: 'Ổ cứng SSD Samsung 1TB', price: 2690000 },
  { name: 'Sạc dự phòng Anker 20000mAh', price: 890000 },
];

/** Phương thức thanh toán */
const PAY_METHODS = ['CARD', 'BANK_TRANSFER', 'COD', 'MOMO', 'ZALOPAY'];

/** Trạng thái đơn hàng */
const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

function randomDate(daysBack: number): Date {
  const now = Date.now();
  const past = now - daysBack * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('=== Tạo đơn hàng cho khách hàng ===\n');

  // 1. Lấy tất cả khách hàng
  const customers = await prisma.customer.findMany({
    select: { id: true, custNo: true },
  });

  // eslint-disable-next-line no-console
  console.log(`Khách hàng: ${customers.length}`);

  // 2. Đếm đơn hàng hiện có
  const existingCount = await prisma.customerOrder.count();

  // 3. Mỗi KH tạo 1~5 đơn hàng ngẫu nhiên
  let created = 0;

  for (const customer of customers) {
    const orderCount = 1 + Math.floor(Math.random() * 5); // 1~5 đơn

    for (let i = 0; i < orderCount; i++) {
      const product = randomItem(PRODUCTS);
      const qty = 1 + Math.floor(Math.random() * 3); // 1~3 sản phẩm
      const totalAmt = product.price * qty;
      const ordNo = `ORD-${(existingCount + created + 1).toString().padStart(6, '0')}`;

      await prisma.customerOrder.create({
        data: {
          ordNo,
          custId: customer.id,
          ordDt: randomDate(90), // 90 ngày gần đây
          ordSttsCd: randomItem(ORDER_STATUSES),
          totAmt: totalAmt,
          prdctNm: product.name,
          qty,
          unitPrc: product.price,
          payMthdCd: randomItem(PAY_METHODS),
          creatBy: 'CRAWL_SEED',
        },
      });

      created++;

      if (created % 500 === 0) {
        // eslint-disable-next-line no-console
        console.log(`  Đã tạo ${created} đơn hàng...`);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`\n=== Kết quả ===`);
  // eslint-disable-next-line no-console
  console.log(`  Đơn hàng đã tạo: ${created}`);
  // eslint-disable-next-line no-console
  console.log(`  Trung bình: ${(created / customers.length).toFixed(1)} đơn/KH`);
}

main()
  .catch((e) => {
    console.error('Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
