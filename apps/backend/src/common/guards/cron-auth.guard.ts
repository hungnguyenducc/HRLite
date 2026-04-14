import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CronAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;
    const token = authHeader?.replace('Bearer ', '');
    const secret = this.configService.get<string>('CRON_SECRET');

    if (!secret || !token || token !== secret) {
      throw new UnauthorizedException('Unauthorized');
    }

    return true;
  }
}
