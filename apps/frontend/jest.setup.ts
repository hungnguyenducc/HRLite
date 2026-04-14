// Polyfill crypto.subtle cho Node < 20
import { webcrypto } from 'crypto';
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

// Biến môi trường mặc định cho unit tests
(process.env as Record<string, string>).NODE_ENV = 'test';
