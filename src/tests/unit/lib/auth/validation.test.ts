import {
  signupSchema,
  loginSchema,
  refreshSchema,
  updateProfileSchema,
  agreeTermsSchema,
} from '@/lib/auth/validation';

// Helper: tao UUID hop le
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const INVALID_UUID = 'not-a-uuid';

describe('Validation', () => {
  // ─────────────────────────────────────────────
  // signupSchema
  // ─────────────────────────────────────────────
  describe('signupSchema', () => {
    const validInput = {
      email: 'user@example.com',
      password: 'Password1',
      agreedTermsIds: [VALID_UUID],
    };

    it('nen chap nhan du lieu hop le voi day du truong', () => {
      const result = signupSchema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('nen chap nhan du lieu hop le voi displayName', () => {
      const result = signupSchema.safeParse({
        ...validInput,
        displayName: 'Nguyen Van A',
      });

      expect(result.success).toBe(true);
    });

    it('nen chap nhan khi displayName khong co (optional)', () => {
      const result = signupSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBeUndefined();
      }
    });

    // ── email ──
    describe('email', () => {
      it('nen tu choi khi email rong', () => {
        const result = signupSchema.safeParse({ ...validInput, email: '' });

        expect(result.success).toBe(false);
      });

      it('nen tu choi khi email khong hop le - thieu @', () => {
        const result = signupSchema.safeParse({ ...validInput, email: 'userexample.com' });

        expect(result.success).toBe(false);
      });

      it('nen tu choi khi email khong hop le - thieu domain', () => {
        const result = signupSchema.safeParse({ ...validInput, email: 'user@' });

        expect(result.success).toBe(false);
      });

      it('nen tu choi khi email khong hop le - thieu username', () => {
        const result = signupSchema.safeParse({ ...validInput, email: '@example.com' });

        expect(result.success).toBe(false);
      });

      it('nen tu choi khi email la so', () => {
        const result = signupSchema.safeParse({ ...validInput, email: 12345 });

        expect(result.success).toBe(false);
      });

      it('nen chap nhan email hop le voi subdomain', () => {
        const result = signupSchema.safeParse({ ...validInput, email: 'user@mail.example.com' });

        expect(result.success).toBe(true);
      });

      it('nen chap nhan email hop le voi dau +', () => {
        const result = signupSchema.safeParse({ ...validInput, email: 'user+tag@example.com' });

        expect(result.success).toBe(true);
      });
    });

    // ── password ──
    describe('password', () => {
      it('nen tu choi khi password ngan hon 8 ky tu', () => {
        const result = signupSchema.safeParse({ ...validInput, password: 'Abcde1' });

        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((i) => i.message);
          expect(messages).toContain('Mật khẩu phải có ít nhất 8 ký tự');
        }
      });

      it('nen tu choi khi password dung 7 ky tu', () => {
        const result = signupSchema.safeParse({ ...validInput, password: 'Abcde1x' });

        expect(result.success).toBe(false);
      });

      it('nen chap nhan khi password dung 8 ky tu (boundary)', () => {
        const result = signupSchema.safeParse({ ...validInput, password: 'Abcdef1x' });

        expect(result.success).toBe(true);
      });

      it('nen tu choi khi password khong co chu hoa', () => {
        const result = signupSchema.safeParse({ ...validInput, password: 'abcdefg1' });

        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((i) => i.message);
          expect(messages).toContain('Mật khẩu phải chứa ít nhất 1 chữ hoa');
        }
      });

      it('nen tu choi khi password khong co chu thuong', () => {
        const result = signupSchema.safeParse({ ...validInput, password: 'ABCDEFG1' });

        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((i) => i.message);
          expect(messages).toContain('Mật khẩu phải chứa ít nhất 1 chữ thường');
        }
      });

      it('nen tu choi khi password khong co chu so', () => {
        const result = signupSchema.safeParse({ ...validInput, password: 'Abcdefgh' });

        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((i) => i.message);
          expect(messages).toContain('Mật khẩu phải chứa ít nhất 1 chữ số');
        }
      });

      it('nen tu choi khi password chi co so', () => {
        const result = signupSchema.safeParse({ ...validInput, password: '12345678' });

        expect(result.success).toBe(false);
      });

      it('nen tu choi khi password chi co chu thuong', () => {
        const result = signupSchema.safeParse({ ...validInput, password: 'abcdefghi' });

        expect(result.success).toBe(false);
      });

      it('nen tu choi khi password rong', () => {
        const result = signupSchema.safeParse({ ...validInput, password: '' });

        expect(result.success).toBe(false);
      });

      it('nen chap nhan password dai voi ky tu dac biet', () => {
        const result = signupSchema.safeParse({
          ...validInput,
          password: 'MyP@ssw0rd!Very$ecure',
        });

        expect(result.success).toBe(true);
      });

      it('nen tra ve nhieu loi khi password vi pham nhieu quy tac', () => {
        const result = signupSchema.safeParse({ ...validInput, password: '' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(1);
        }
      });
    });

    // ── displayName ──
    describe('displayName', () => {
      it('nen tu choi khi displayName la chuoi rong', () => {
        const result = signupSchema.safeParse({ ...validInput, displayName: '' });

        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((i) => i.message);
          expect(messages).toContain('Tên hiển thị không được để trống');
        }
      });

      it('nen chap nhan displayName co 1 ky tu (boundary)', () => {
        const result = signupSchema.safeParse({ ...validInput, displayName: 'A' });

        expect(result.success).toBe(true);
      });

      it('nen chap nhan displayName dai', () => {
        const result = signupSchema.safeParse({ ...validInput, displayName: 'A'.repeat(200) });

        expect(result.success).toBe(true);
      });
    });

    // ── agreedTermsIds ──
    describe('agreedTermsIds', () => {
      it('nen chap nhan khi agreedTermsIds la mang rong', () => {
        const result = signupSchema.safeParse({ ...validInput, agreedTermsIds: [] });

        expect(result.success).toBe(true);
      });

      it('nen tu choi khi agreedTermsIds chua UUID khong hop le', () => {
        const result = signupSchema.safeParse({
          ...validInput,
          agreedTermsIds: [INVALID_UUID],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((i) => i.message);
          expect(messages).toContain('ID điều khoản không hợp lệ');
        }
      });

      it('nen chap nhan nhieu UUID hop le', () => {
        const result = signupSchema.safeParse({
          ...validInput,
          agreedTermsIds: [VALID_UUID, VALID_UUID_2],
        });

        expect(result.success).toBe(true);
      });

      it('nen tu choi khi agreedTermsIds khong phai mang', () => {
        const result = signupSchema.safeParse({
          ...validInput,
          agreedTermsIds: VALID_UUID,
        });

        expect(result.success).toBe(false);
      });

      it('nen tu choi khi agreedTermsIds chua phan tu khong phai string', () => {
        const result = signupSchema.safeParse({
          ...validInput,
          agreedTermsIds: [123],
        });

        expect(result.success).toBe(false);
      });
    });

    // ── missing fields ──
    it('nen tu choi khi thieu email', () => {
      const { email: _email, ...rest } = validInput;
      const result = signupSchema.safeParse(rest);

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi thieu password', () => {
      const { password: _password, ...rest } = validInput;
      const result = signupSchema.safeParse(rest);

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi thieu agreedTermsIds', () => {
      const { agreedTermsIds: _agreedTermsIds, ...rest } = validInput;
      const result = signupSchema.safeParse(rest);

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi input la null', () => {
      const result = signupSchema.safeParse(null);

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi input la undefined', () => {
      const result = signupSchema.safeParse(undefined);

      expect(result.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // loginSchema
  // ─────────────────────────────────────────────
  describe('loginSchema', () => {
    const validInput = {
      email: 'user@example.com',
      password: 'anypassword',
    };

    it('nen chap nhan du lieu hop le', () => {
      const result = loginSchema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('nen tu choi khi email khong hop le', () => {
      const result = loginSchema.safeParse({ ...validInput, email: 'invalid' });

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi email rong', () => {
      const result = loginSchema.safeParse({ ...validInput, email: '' });

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi password rong', () => {
      const result = loginSchema.safeParse({ ...validInput, password: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Mật khẩu không được để trống');
      }
    });

    it('nen chap nhan password bat ky (khong kiem tra do manh)', () => {
      const result = loginSchema.safeParse({ ...validInput, password: 'a' });

      expect(result.success).toBe(true);
    });

    it('nen tu choi khi thieu email', () => {
      const result = loginSchema.safeParse({ password: 'test' });

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi thieu password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com' });

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi input rong', () => {
      const result = loginSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // refreshSchema
  // ─────────────────────────────────────────────
  describe('refreshSchema', () => {
    it('nen chap nhan refreshToken hop le', () => {
      const result = refreshSchema.safeParse({ refreshToken: 'some-token-value' });

      expect(result.success).toBe(true);
    });

    it('nen tu choi khi refreshToken rong', () => {
      const result = refreshSchema.safeParse({ refreshToken: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Refresh token không được để trống');
      }
    });

    it('nen tu choi khi thieu refreshToken', () => {
      const result = refreshSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi refreshToken la so', () => {
      const result = refreshSchema.safeParse({ refreshToken: 12345 });

      expect(result.success).toBe(false);
    });

    it('nen chap nhan refreshToken dai', () => {
      const result = refreshSchema.safeParse({ refreshToken: 'x'.repeat(1000) });

      expect(result.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────
  // updateProfileSchema
  // ─────────────────────────────────────────────
  describe('updateProfileSchema', () => {
    it('nen chap nhan object rong (tat ca truong optional)', () => {
      const result = updateProfileSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('nen chap nhan chi co displayName', () => {
      const result = updateProfileSchema.safeParse({ displayName: 'Tran Van B' });

      expect(result.success).toBe(true);
    });

    it('nen chap nhan chi co phone', () => {
      const result = updateProfileSchema.safeParse({ phone: '0901234567' });

      expect(result.success).toBe(true);
    });

    it('nen chap nhan chi co photoUrl hop le', () => {
      const result = updateProfileSchema.safeParse({ photoUrl: 'https://example.com/photo.jpg' });

      expect(result.success).toBe(true);
    });

    it('nen chap nhan tat ca truong hop le', () => {
      const result = updateProfileSchema.safeParse({
        displayName: 'Le Thi C',
        phone: '0901234567',
        photoUrl: 'https://example.com/photo.png',
      });

      expect(result.success).toBe(true);
    });

    // ── displayName ──
    describe('displayName', () => {
      it('nen tu choi khi displayName la chuoi rong', () => {
        const result = updateProfileSchema.safeParse({ displayName: '' });

        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((i) => i.message);
          expect(messages).toContain('Tên hiển thị không được để trống');
        }
      });

      it('nen chap nhan displayName co 1 ky tu', () => {
        const result = updateProfileSchema.safeParse({ displayName: 'X' });

        expect(result.success).toBe(true);
      });
    });

    // ── photoUrl ──
    describe('photoUrl', () => {
      it('nen tu choi khi photoUrl khong phai URL hop le', () => {
        const result = updateProfileSchema.safeParse({ photoUrl: 'not-a-url' });

        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((i) => i.message);
          expect(messages).toContain('URL ảnh không hợp lệ');
        }
      });

      it('nen tu choi khi photoUrl la chuoi rong', () => {
        const result = updateProfileSchema.safeParse({ photoUrl: '' });

        expect(result.success).toBe(false);
      });

      it('nen chap nhan photoUrl voi http', () => {
        const result = updateProfileSchema.safeParse({ photoUrl: 'http://example.com/img.png' });

        expect(result.success).toBe(true);
      });

      it('nen chap nhan photoUrl voi https', () => {
        const result = updateProfileSchema.safeParse({ photoUrl: 'https://cdn.example.com/a.jpg' });

        expect(result.success).toBe(true);
      });
    });

    // ── phone ──
    describe('phone', () => {
      it('nen chap nhan phone la chuoi bat ky (khong co regex validation)', () => {
        const result = updateProfileSchema.safeParse({ phone: 'abc' });

        expect(result.success).toBe(true);
      });

      it('nen chap nhan phone rong', () => {
        // phone la string().optional(), chuoi rong van hop le vi khong co min()
        const result = updateProfileSchema.safeParse({ phone: '' });

        expect(result.success).toBe(true);
      });
    });
  });

  // ─────────────────────────────────────────────
  // agreeTermsSchema
  // ─────────────────────────────────────────────
  describe('agreeTermsSchema', () => {
    it('nen chap nhan mang co 1 UUID hop le', () => {
      const result = agreeTermsSchema.safeParse({ termsIds: [VALID_UUID] });

      expect(result.success).toBe(true);
    });

    it('nen chap nhan mang co nhieu UUID hop le', () => {
      const result = agreeTermsSchema.safeParse({
        termsIds: [VALID_UUID, VALID_UUID_2],
      });

      expect(result.success).toBe(true);
    });

    it('nen tu choi khi termsIds la mang rong', () => {
      const result = agreeTermsSchema.safeParse({ termsIds: [] });

      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Phải chọn ít nhất một điều khoản');
      }
    });

    it('nen tu choi khi termsIds chua UUID khong hop le', () => {
      const result = agreeTermsSchema.safeParse({ termsIds: [INVALID_UUID] });

      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('ID điều khoản không hợp lệ');
      }
    });

    it('nen tu choi khi thieu termsIds', () => {
      const result = agreeTermsSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi termsIds khong phai mang', () => {
      const result = agreeTermsSchema.safeParse({ termsIds: VALID_UUID });

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi termsIds chua ca UUID hop le va khong hop le', () => {
      const result = agreeTermsSchema.safeParse({
        termsIds: [VALID_UUID, INVALID_UUID],
      });

      expect(result.success).toBe(false);
    });

    it('nen tu choi khi termsIds chua so', () => {
      const result = agreeTermsSchema.safeParse({ termsIds: [123] });

      expect(result.success).toBe(false);
    });
  });
});
