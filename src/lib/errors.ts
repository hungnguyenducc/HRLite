import { NextResponse } from 'next/server';

// Base application error
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// 400 Bad Request
export class ValidationError extends AppError {
  constructor(message = 'Dữ liệu không hợp lệ.') {
    super(message, 400);
  }
}

// 401 Unauthorized
export class AuthError extends AppError {
  constructor(message = 'Chưa xác thực. Vui lòng đăng nhập.') {
    super(message, 401);
  }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền truy cập tài nguyên này.') {
    super(message, 403);
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên.') {
    super(message, 404);
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(message = 'Dữ liệu bị trùng lặp.') {
    super(message, 409);
  }
}

// 429 Too Many Requests
export class RateLimitError extends AppError {
  constructor(message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau.') {
    super(message, 429);
  }
}

// Central error handler: convert any error to a standard NextResponse
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode },
    );
  }

  // Unknown/system errors — hide internal details
  const message =
    process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message
      : 'Lỗi hệ thống. Vui lòng thử lại sau.';

  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
