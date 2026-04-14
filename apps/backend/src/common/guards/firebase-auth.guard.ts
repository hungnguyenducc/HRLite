import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { FirebaseAdminService } from '../../modules/firebase/firebase-admin.service';
import { PrismaService } from '../../prisma/prisma.service';

const SESSION_COOKIE_NAME = '__session';

export interface VerifiedPayload {
  sub: string;
  email: string;
  role: string;
  firebaseUid: string;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private firebaseAdmin: FirebaseAdminService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip auth for @Public() routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const sessionCookie = request.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionCookie) {
      throw new UnauthorizedException('Chưa xác thực. Vui lòng đăng nhập.');
    }

    try {
      const decoded = await this.firebaseAdmin
        .getAuth()
        .verifySessionCookie(sessionCookie, true);

      const user = await this.prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: { id: true, email: true, roleCd: true, sttsCd: true, delYn: true },
      });

      if (!user || user.delYn === 'Y' || user.sttsCd !== 'ACTIVE') {
        throw new UnauthorizedException(
          'Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa.',
        );
      }

      request.user = {
        sub: user.id,
        email: user.email,
        role: user.roleCd,
        firebaseUid: decoded.uid,
      } as VerifiedPayload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      );
    }
  }
}
