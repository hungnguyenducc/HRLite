import { NextRequest } from 'next/server';
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitResponse,
  __resetStoreForTesting,
} from '@/lib/auth/rate-limit';
import { RateLimitError } from '@/lib/errors';

function createRequest(ip: string): NextRequest {
  return new NextRequest('http://localhost/test', {
    headers: new Headers({ 'x-forwarded-for': ip }),
  });
}

describe('RateLimit', () => {
  beforeEach(() => {
    __resetStoreForTesting();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('nen cho phep yeu cau dau tien khi chua co yeu cau nao', () => {
      const req = createRequest('1.2.3.4');
      expect(() => checkRateLimit(req, 'login', RATE_LIMITS.login)).not.toThrow();
    });

    it('nen cho phep yeu cau trong gioi han khi chua vuot qua', () => {
      const req = createRequest('1.2.3.4');
      const config = RATE_LIMITS.login; // maxRequests: 5

      for (let i = 0; i < config.maxRequests; i++) {
        expect(() => checkRateLimit(req, 'login', config)).not.toThrow();
      }
    });

    it('nen nem RateLimitError khi vuot qua gioi han', () => {
      const req = createRequest('1.2.3.4');
      const config = RATE_LIMITS.login; // maxRequests: 5

      // Use up all allowed requests
      for (let i = 0; i < config.maxRequests; i++) {
        checkRateLimit(req, 'login', config);
      }

      // Next request should throw
      expect(() => checkRateLimit(req, 'login', config)).toThrow(RateLimitError);
    });

    it('nen tach rieng bucket theo IP khi cac IP khac nhau', () => {
      const reqA = createRequest('10.0.0.1');
      const reqB = createRequest('10.0.0.2');
      const config = RATE_LIMITS.login;

      // Exhaust limit for IP A
      for (let i = 0; i < config.maxRequests; i++) {
        checkRateLimit(reqA, 'login', config);
      }
      expect(() => checkRateLimit(reqA, 'login', config)).toThrow(RateLimitError);

      // IP B should still be fine
      expect(() => checkRateLimit(reqB, 'login', config)).not.toThrow();
    });

    it('nen tinh retryAfter dung khi bi rate limit', () => {
      const req = createRequest('1.2.3.4');
      const config = RATE_LIMITS.login; // windowMs: 60_000

      for (let i = 0; i < config.maxRequests; i++) {
        checkRateLimit(req, 'login', config);
      }

      // Advance 30 seconds into the window
      jest.advanceTimersByTime(30_000);

      try {
        checkRateLimit(req, 'login', config);
        fail('Expected RateLimitError');
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError);
        const rateLimitErr = err as RateLimitError & { retryAfter: number };
        // ~30 seconds remaining in the 60s window
        expect(rateLimitErr.retryAfter).toBeGreaterThanOrEqual(29);
        expect(rateLimitErr.retryAfter).toBeLessThanOrEqual(31);
      }
    });

    it('nen reset window khi het thoi gian window', () => {
      const req = createRequest('1.2.3.4');
      const config = RATE_LIMITS.login;

      // Exhaust limit
      for (let i = 0; i < config.maxRequests; i++) {
        checkRateLimit(req, 'login', config);
      }
      expect(() => checkRateLimit(req, 'login', config)).toThrow(RateLimitError);

      // Advance past the window
      jest.advanceTimersByTime(config.windowMs + 1);

      // Should be allowed again
      expect(() => checkRateLimit(req, 'login', config)).not.toThrow();
    });

    it('nen tach rieng bucket theo key khi cac key khac nhau', () => {
      const req = createRequest('1.2.3.4');

      // Exhaust login limit
      for (let i = 0; i < RATE_LIMITS.login.maxRequests; i++) {
        checkRateLimit(req, 'login', RATE_LIMITS.login);
      }
      expect(() => checkRateLimit(req, 'login', RATE_LIMITS.login)).toThrow(RateLimitError);

      // Refresh endpoint should still work (different key)
      expect(() => checkRateLimit(req, 'refresh', RATE_LIMITS.refresh)).not.toThrow();
    });
  });

  describe('rateLimitResponse', () => {
    it('nen tra ve response 429 voi Retry-After header khi co loi rate limit', () => {
      const err = new RateLimitError('Qua nhieu yeu cau');
      (err as RateLimitError & { retryAfter: number }).retryAfter = 45;

      const response = rateLimitResponse(err);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('45');
    });

    it('nen dung gia tri mac dinh 60 khi khong co retryAfter', () => {
      const err = new RateLimitError('Qua nhieu yeu cau');

      const response = rateLimitResponse(err);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });

  describe('RATE_LIMITS', () => {
    it('nen co cau hinh cho login, signup va refresh', () => {
      expect(RATE_LIMITS.login).toBeDefined();
      expect(RATE_LIMITS.signup).toBeDefined();
      expect(RATE_LIMITS.refresh).toBeDefined();

      expect(RATE_LIMITS.login.maxRequests).toBe(5);
      expect(RATE_LIMITS.signup.maxRequests).toBe(3);
      expect(RATE_LIMITS.refresh.maxRequests).toBe(10);
    });
  });
});
