import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Password', () => {
  // ───────────────────────────────────────
  // hashPassword
  // ───────────────────────────────────────
  describe('hashPassword', () => {
    it('nen tra ve chuoi hash khac voi password goc', async () => {
      const password = 'MyPassword1';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
    });

    it('nen tra ve hash bat dau voi $2a$ (dinh dang bcrypt)', async () => {
      const hash = await hashPassword('TestPass1');

      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('nen tra ve hash co do dai 60 ky tu (chuan bcrypt)', async () => {
      const hash = await hashPassword('TestPass1');

      expect(hash).toHaveLength(60);
    });

    it('nen tao hash khac nhau cho cung mot password (do salt)', async () => {
      const password = 'SamePassword1';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('nen tao hash cho password rong', async () => {
      const hash = await hashPassword('');

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(60);
    });

    it('nen tao hash cho password dai', async () => {
      const longPassword = 'A'.repeat(100) + '1a';
      const hash = await hashPassword(longPassword);

      expect(hash).toHaveLength(60);
    });
  });

  // ───────────────────────────────────────
  // verifyPassword
  // ───────────────────────────────────────
  describe('verifyPassword', () => {
    it('nen tra ve true khi password khop voi hash', async () => {
      const password = 'CorrectPassword1';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('nen tra ve false khi password khong khop voi hash', async () => {
      const hash = await hashPassword('OriginalPass1');
      const isValid = await verifyPassword('WrongPass1', hash);

      expect(isValid).toBe(false);
    });

    it('nen tra ve false khi password rong va hash cua password khac', async () => {
      const hash = await hashPassword('SomePassword1');
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });

    it('nen tra ve true khi xac minh password rong voi hash cua no', async () => {
      const hash = await hashPassword('');
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(true);
    });

    it('nen phan biet password chi khac chu hoa chu thuong', async () => {
      const hash = await hashPassword('Password1');
      const isValid = await verifyPassword('password1', hash);

      expect(isValid).toBe(false);
    });

    it('nen phan biet password chi khac 1 ky tu', async () => {
      const hash = await hashPassword('Password1');
      const isValid = await verifyPassword('Password2', hash);

      expect(isValid).toBe(false);
    });

    it('nen xac minh dung khi password co ky tu dac biet', async () => {
      const password = 'P@$$w0rd!#%^&*';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('nen xac minh dung khi password co ky tu Unicode', async () => {
      const password = 'Mật_khẩu_1';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });
  });
});
