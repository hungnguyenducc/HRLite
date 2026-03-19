import { NextRequest } from 'next/server';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  searchParams?: Record<string, string>;
}

/** Tạo NextRequest mock cho testing API routes */
export function createRequest(path: string, options: RequestOptions = {}): NextRequest {
  const { method = 'GET', body, headers = {}, cookies = {}, searchParams = {} } = options;

  const url = new URL(`http://localhost:3000${path}`);
  for (const [k, v] of Object.entries(searchParams)) {
    url.searchParams.set(k, v);
  }

  const reqHeaders = new Headers(headers);

  if (Object.keys(cookies).length > 0) {
    const cookieStr = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    reqHeaders.set('Cookie', cookieStr);
  }

  if (!reqHeaders.has('x-forwarded-for')) {
    reqHeaders.set('x-forwarded-for', '127.0.0.1');
  }

  if (body != null && !reqHeaders.has('Content-Type')) {
    reqHeaders.set('Content-Type', 'application/json');
  }

  return new NextRequest(url, {
    method,
    headers: reqHeaders,
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

/** Tạo context params cho dynamic routes */
export function createContext(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}
