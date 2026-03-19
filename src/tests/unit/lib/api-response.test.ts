import { successResponse, errorResponse } from '@/lib/api-response';

describe('ApiResponse', () => {
  describe('successResponse', () => {
    it('nen tra ve success: true voi data truyen vao', async () => {
      const data = { id: 1, name: 'test' };
      const response = successResponse(data);
      const body = await response.json();

      expect(body).toEqual({ success: true, data: { id: 1, name: 'test' } });
    });

    it('nen tra ve status 200 mac dinh', () => {
      const response = successResponse({ ok: true });

      expect(response.status).toBe(200);
    });

    it('nen tra ve status tuy chinh khi truyen tham so status', () => {
      const response = successResponse({ id: 1 }, 201);

      expect(response.status).toBe(201);
    });

    it('nen tra ve dung khi data la null', async () => {
      const response = successResponse(null);
      const body = await response.json();

      expect(body).toEqual({ success: true, data: null });
    });

    it('nen tra ve dung khi data la mang rong', async () => {
      const response = successResponse([]);
      const body = await response.json();

      expect(body).toEqual({ success: true, data: [] });
    });

    it('nen tra ve dung khi data la chuoi', async () => {
      const response = successResponse('hello');
      const body = await response.json();

      expect(body).toEqual({ success: true, data: 'hello' });
    });

    it('nen tra ve dung khi data la so', async () => {
      const response = successResponse(42);
      const body = await response.json();

      expect(body).toEqual({ success: true, data: 42 });
    });
  });

  describe('errorResponse', () => {
    it('nen tra ve success: false voi thong bao loi', async () => {
      const response = errorResponse('Something went wrong');
      const body = await response.json();

      expect(body).toEqual({ success: false, error: 'Something went wrong' });
    });

    it('nen tra ve status 400 mac dinh', () => {
      const response = errorResponse('Bad request');

      expect(response.status).toBe(400);
    });

    it('nen tra ve status tuy chinh khi truyen tham so status', () => {
      const response = errorResponse('Not found', 404);

      expect(response.status).toBe(404);
    });

    it('nen tra ve status 500 khi truyen status 500', () => {
      const response = errorResponse('Internal error', 500);

      expect(response.status).toBe(500);
    });

    it('nen tra ve dung khi thong bao loi la chuoi rong', async () => {
      const response = errorResponse('');
      const body = await response.json();

      expect(body).toEqual({ success: false, error: '' });
    });
  });
});
