// Polyfill crypto.subtle cho Node < 20
import { webcrypto } from 'crypto';
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

// Load .env.test
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Biến môi trường cho integration tests — DATABASE_URL từ .env.test
(process.env as Record<string, string>).NODE_ENV = 'test';
