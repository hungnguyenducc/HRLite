import { NextResponse } from 'next/server';

// Standard API response structure
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Success response helper
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

// Error response helper
export function errorResponse(error: string, status = 400): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error }, { status });
}
