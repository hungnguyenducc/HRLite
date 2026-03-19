import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
} from '@/lib/auth/jwt';

describe('JWT', () => {
  const samplePayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'employee',
  };

  describe('generateAccessToken', () => {
    it('nen tao token hop le khi payload dung', async () => {
      const token = await generateAccessToken(samplePayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('generateRefreshToken', () => {
    it('nen tao token hop le khi payload dung', async () => {
      const token = await generateRefreshToken(samplePayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('nen xac minh thanh cong khi token access hop le', async () => {
      const token = await generateAccessToken(samplePayload);
      const payload = await verifyAccessToken(token);

      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe('user-123');
      expect(payload!.email).toBe('test@example.com');
      expect(payload!.role).toBe('employee');
      expect(payload!.type).toBe('access');
      expect(payload!.iat).toBeDefined();
      expect(payload!.exp).toBeDefined();
    });

    it('nen tra ve null khi token la refresh token', async () => {
      const token = await generateRefreshToken(samplePayload);
      const payload = await verifyAccessToken(token);

      expect(payload).toBeNull();
    });

    it('nen tra ve null khi token da bi thay doi', async () => {
      const token = await generateAccessToken(samplePayload);
      const tamperedToken = token.slice(0, -5) + 'XXXXX';
      const payload = await verifyAccessToken(tamperedToken);

      expect(payload).toBeNull();
    });

    it('nen tra ve null khi token da het han', async () => {
      // Temporarily set expiry to 0 seconds
      const originalExpiry = process.env.JWT_ACCESS_EXPIRES;
      process.env.JWT_ACCESS_EXPIRES = '0s';

      const token = await generateAccessToken(samplePayload);

      // Restore original expiry
      process.env.JWT_ACCESS_EXPIRES = originalExpiry;

      // Wait a moment so the token is definitely expired
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const payload = await verifyAccessToken(token);
      expect(payload).toBeNull();
    });

    it('nen tra ve null khi token rong', async () => {
      const payload = await verifyAccessToken('');
      expect(payload).toBeNull();
    });

    it('nen tra ve null khi token sai format', async () => {
      const payload = await verifyAccessToken('not-a-valid-jwt');
      expect(payload).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('nen xac minh thanh cong khi token refresh hop le', async () => {
      const token = await generateRefreshToken(samplePayload);
      const payload = await verifyRefreshToken(token);

      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe('user-123');
      expect(payload!.email).toBe('test@example.com');
      expect(payload!.role).toBe('employee');
      expect(payload!.type).toBe('refresh');
    });

    it('nen tra ve null khi token la access token', async () => {
      const token = await generateAccessToken(samplePayload);
      const payload = await verifyRefreshToken(token);

      expect(payload).toBeNull();
    });
  });

  describe('hashToken', () => {
    it('nen tra ve chuoi hex 64 ky tu khi hash token', async () => {
      const hash = await hashToken('some-token-value');
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('nen tra ve ket qua giong nhau khi hash cung gia tri', async () => {
      const hash1 = await hashToken('deterministic-test');
      const hash2 = await hashToken('deterministic-test');
      expect(hash1).toBe(hash2);
    });

    it('nen tra ve ket qua khac nhau khi hash khac gia tri', async () => {
      const hash1 = await hashToken('value-a');
      const hash2 = await hashToken('value-b');
      expect(hash1).not.toBe(hash2);
    });
  });
});
