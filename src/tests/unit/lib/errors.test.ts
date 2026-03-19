import {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  handleApiError,
} from '@/lib/errors';

describe('Errors', () => {
  // ───────────────────────────────────────
  // AppError
  // ───────────────────────────────────────
  describe('AppError', () => {
    it('nen tao loi voi message va statusCode', () => {
      const error = new AppError('test error', 418);

      expect(error.message).toBe('test error');
      expect(error.statusCode).toBe(418);
      expect(error.name).toBe('AppError');
    });

    it('nen ke thua tu Error', () => {
      const error = new AppError('test', 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  // ───────────────────────────────────────
  // ValidationError
  // ───────────────────────────────────────
  describe('ValidationError', () => {
    it('nen tao loi voi message mac dinh va status 400', () => {
      const error = new ValidationError();

      expect(error.message).toBe('Dữ liệu không hợp lệ.');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('nen tao loi voi message tuy chinh', () => {
      const error = new ValidationError('Email sai');

      expect(error.message).toBe('Email sai');
      expect(error.statusCode).toBe(400);
    });

    it('nen ke thua tu AppError', () => {
      expect(new ValidationError()).toBeInstanceOf(AppError);
    });
  });

  // ───────────────────────────────────────
  // AuthError
  // ───────────────────────────────────────
  describe('AuthError', () => {
    it('nen tao loi voi message mac dinh va status 401', () => {
      const error = new AuthError();

      expect(error.message).toBe('Chưa xác thực. Vui lòng đăng nhập.');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthError');
    });

    it('nen tao loi voi message tuy chinh', () => {
      const error = new AuthError('Token het han');

      expect(error.message).toBe('Token het han');
    });

    it('nen ke thua tu AppError', () => {
      expect(new AuthError()).toBeInstanceOf(AppError);
    });
  });

  // ───────────────────────────────────────
  // ForbiddenError
  // ───────────────────────────────────────
  describe('ForbiddenError', () => {
    it('nen tao loi voi message mac dinh va status 403', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Bạn không có quyền truy cập tài nguyên này.');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('ForbiddenError');
    });

    it('nen tao loi voi message tuy chinh', () => {
      const error = new ForbiddenError('Admin only');

      expect(error.message).toBe('Admin only');
    });

    it('nen ke thua tu AppError', () => {
      expect(new ForbiddenError()).toBeInstanceOf(AppError);
    });
  });

  // ───────────────────────────────────────
  // NotFoundError
  // ───────────────────────────────────────
  describe('NotFoundError', () => {
    it('nen tao loi voi message mac dinh va status 404', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Không tìm thấy tài nguyên.');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('nen tao loi voi message tuy chinh', () => {
      const error = new NotFoundError('User not found');

      expect(error.message).toBe('User not found');
    });

    it('nen ke thua tu AppError', () => {
      expect(new NotFoundError()).toBeInstanceOf(AppError);
    });
  });

  // ───────────────────────────────────────
  // ConflictError
  // ───────────────────────────────────────
  describe('ConflictError', () => {
    it('nen tao loi voi message mac dinh va status 409', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Dữ liệu bị trùng lặp.');
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe('ConflictError');
    });

    it('nen tao loi voi message tuy chinh', () => {
      const error = new ConflictError('Email da ton tai');

      expect(error.message).toBe('Email da ton tai');
    });

    it('nen ke thua tu AppError', () => {
      expect(new ConflictError()).toBeInstanceOf(AppError);
    });
  });

  // ───────────────────────────────────────
  // RateLimitError
  // ───────────────────────────────────────
  describe('RateLimitError', () => {
    it('nen tao loi voi message mac dinh va status 429', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Quá nhiều yêu cầu. Vui lòng thử lại sau.');
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('RateLimitError');
    });

    it('nen tao loi voi message tuy chinh', () => {
      const error = new RateLimitError('Rate limit exceeded');

      expect(error.message).toBe('Rate limit exceeded');
    });

    it('nen ke thua tu AppError', () => {
      expect(new RateLimitError()).toBeInstanceOf(AppError);
    });
  });

  // ───────────────────────────────────────
  // handleApiError
  // ───────────────────────────────────────
  describe('handleApiError', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    });

    it('nen tra ve response voi statusCode cua AppError khi nhan AppError', async () => {
      const error = new AppError('custom error', 418);
      const response = handleApiError(error);
      const body = await response.json();

      expect(response.status).toBe(418);
      expect(body).toEqual({ success: false, error: 'custom error' });
    });

    it('nen tra ve response voi status 400 khi nhan ValidationError', async () => {
      const error = new ValidationError();
      const response = handleApiError(error);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ success: false, error: 'Dữ liệu không hợp lệ.' });
    });

    it('nen tra ve response voi status 401 khi nhan AuthError', async () => {
      const response = handleApiError(new AuthError());

      expect(response.status).toBe(401);
    });

    it('nen tra ve response voi status 403 khi nhan ForbiddenError', async () => {
      const response = handleApiError(new ForbiddenError());

      expect(response.status).toBe(403);
    });

    it('nen tra ve response voi status 404 khi nhan NotFoundError', async () => {
      const response = handleApiError(new NotFoundError());

      expect(response.status).toBe(404);
    });

    it('nen tra ve response voi status 409 khi nhan ConflictError', async () => {
      const response = handleApiError(new ConflictError());

      expect(response.status).toBe(409);
    });

    it('nen tra ve response voi status 429 khi nhan RateLimitError', async () => {
      const response = handleApiError(new RateLimitError());

      expect(response.status).toBe(429);
    });

    it('nen tra ve status 500 va an chi tiet khi loi khong phai AppError o production', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      const error = new Error('DB connection failed');
      const response = handleApiError(error);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
      });
    });

    it('nen tra ve status 500 va hien chi tiet loi khi NODE_ENV la development', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development';
      const error = new Error('DB connection failed');
      const response = handleApiError(error);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'DB connection failed',
      });
    });

    it('nen tra ve thong bao chung khi loi khong phai Error instance o development', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development';
      const response = handleApiError('string error');
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
      });
    });

    it('nen tra ve thong bao chung khi loi la null', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      const response = handleApiError(null);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
      });
    });

    it('nen tra ve thong bao chung khi loi la undefined', async () => {
      const response = handleApiError(undefined);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
      });
    });

    it('nen tra ve thong bao chung khi loi la so', async () => {
      const response = handleApiError(42);
      const body = await response.json();

      expect(response.status).toBe(500);
    });
  });
});
