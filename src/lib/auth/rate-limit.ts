import { NextRequest } from 'next/server';
import { RateLimitError } from '@/lib/errors';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory sliding window store (keyed by identifier)
const store = new Map<string, RateLimitEntry>();

// Periodically clean expired entries (every 60 s)
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

// Predefined limits per endpoint type
export const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,
  signup: { maxRequests: 3, windowMs: 60_000 } as RateLimitConfig,
  refresh: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
} as const;

// Extract client IP from request
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Check rate limit. Throws RateLimitError if exceeded.
 * @param req   The incoming request (used for IP extraction)
 * @param key   A namespace to separate different limit buckets (e.g. 'login')
 * @param config  The rate limit configuration
 */
export function checkRateLimit(
  req: NextRequest,
  key: string,
  config: RateLimitConfig,
): void {
  cleanup();

  const identifier = `${key}:${getClientIp(req)}`;
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt <= now) {
    // First request or window expired — start new window
    store.set(identifier, { count: 1, resetAt: now + config.windowMs });
    return;
  }

  if (entry.count >= config.maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    const err = new RateLimitError(
      `Quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfterSec} giây.`,
    );
    // Attach retryAfter so callers can set the header
    (err as RateLimitError & { retryAfter: number }).retryAfter = retryAfterSec;
    throw err;
  }

  entry.count += 1;
}

/**
 * Build a NextResponse 429 with Retry-After header from a RateLimitError.
 */
/** Reset store — chỉ dùng trong test */
export function __resetStoreForTesting(): void {
  store.clear();
  lastCleanup = Date.now();
}

/**
 * Build a NextResponse 429 with Retry-After header from a RateLimitError.
 */
export function rateLimitResponse(err: RateLimitError): Response {
  const retryAfter = (err as RateLimitError & { retryAfter?: number }).retryAfter ?? 60;
  return new Response(
    JSON.stringify({ success: false, error: err.message }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    },
  );
}
