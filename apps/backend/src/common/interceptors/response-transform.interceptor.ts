import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface WrappedResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, WrappedResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<WrappedResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Nếu controller đã wrap response rồi (có field success), trả về nguyên
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
