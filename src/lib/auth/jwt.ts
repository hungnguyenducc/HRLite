import { SignJWT, jwtVerify } from 'jose';

// Token payload structure
export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

// Resolved payload after verification
export interface VerifiedPayload extends TokenPayload {
  iat: number;
  exp: number;
}

// Get the JWT secret as Uint8Array for jose
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

// Get access token expiry from env or default to 30 min
function getAccessExpiry(): string {
  return process.env.JWT_ACCESS_EXPIRES || '30m';
}

// Get refresh token expiry from env or default to 7 days
function getRefreshExpiry(): string {
  return process.env.JWT_REFRESH_EXPIRES || '7d';
}

// Generate an access token (30 min default, HS256)
export async function generateAccessToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  const secret = getSecret();
  return new SignJWT({ ...payload, type: 'access' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(getAccessExpiry())
    .sign(secret);
}

// Generate a refresh token (7 day default, HS256)
export async function generateRefreshToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  const secret = getSecret();
  return new SignJWT({ ...payload, type: 'refresh' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(getRefreshExpiry())
    .sign(secret);
}

// Verify an access token, returns decoded payload or null
export async function verifyAccessToken(token: string): Promise<VerifiedPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    const decoded = payload as unknown as VerifiedPayload;
    if (decoded.type !== 'access') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// Verify a refresh token, returns decoded payload or null
export async function verifyRefreshToken(token: string): Promise<VerifiedPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    const decoded = payload as unknown as VerifiedPayload;
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// Hash a token using SHA-256 (for storing refresh tokens securely)
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
