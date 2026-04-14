import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import logger from '../logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Lỗi hệ thống. Vui lòng thử lại sau.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(resp.message)) {
          message = resp.message.join(', ');
        } else if (typeof resp.message === 'string') {
          message = resp.message;
        }
      }

      // Log 4xx nghiệp vụ để hỗ trợ debug
      if (status >= 400 && status < 500) {
        logger.warn(`HTTP ${status} ${request.method} ${request.url}`, { message });
      }
    } else if (exception instanceof Error) {
      logger.error('Unhandled exception', {
        error: exception.message,
        stack: exception.stack,
        path: request.url,
        method: request.method,
      });

      if (process.env.NODE_ENV === 'development') {
        message = exception.message;
      }
    }

    response.status(status).json({
      success: false,
      error: message,
    });
  }
}
