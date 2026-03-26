import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { crawlRandomUsers } from '@/lib/crawl-service';
import logger from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;
const DEFAULT_COUNT = 100;

/**
 * Xác thực request bằng CRON_SECRET
 * - Vercel Cron: header "authorization: Bearer <CRON_SECRET>"
 * - Script local: header "authorization: Bearer <CRON_SECRET>"
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  return Boolean(CRON_SECRET && token === CRON_SECRET);
}

/**
 * GET /api/crawl/random-users
 * Vercel Cron Job gọi endpoint này mỗi giờ
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      logger.warn('[Crawl API] Unauthorized access attempt (GET)');
      return errorResponse('Unauthorized', 401);
    }

    const result = await crawlRandomUsers(DEFAULT_COUNT);
    return successResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Crawl API] Error: ${message}`);
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/crawl/random-users
 * Gọi thủ công với số lượng tùy chỉnh
 *
 * Body (optional): { "count": 100 }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      logger.warn('[Crawl API] Unauthorized access attempt (POST)');
      return errorResponse('Unauthorized', 401);
    }

    let count = DEFAULT_COUNT;
    try {
      const body = await request.json();
      if (body.count && typeof body.count === 'number' && body.count > 0) {
        count = Math.min(body.count, 500);
      }
    } catch {
      // Không có body → dùng mặc định
    }

    const result = await crawlRandomUsers(count);
    return successResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Crawl API] Error: ${message}`);
    return errorResponse(message, 500);
  }
}
