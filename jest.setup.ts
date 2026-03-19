// Polyfill crypto.subtle cho Node < 20
import { webcrypto } from 'crypto';
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

// Biến môi trường mặc định cho unit tests
process.env.JWT_SECRET = 'test-secret-key-must-be-at-least-32-chars-long!!';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
(process.env as Record<string, string>).NODE_ENV = 'test';
