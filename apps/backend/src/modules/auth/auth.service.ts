import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { SignupDto } from './dto/signup.dto';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class AuthService {
  private readonly sessionMaxAge: number;

  constructor(
    private prisma: PrismaService,
    private firebaseAdmin: FirebaseAdminService,
    private configService: ConfigService,
  ) {
    this.sessionMaxAge =
      Number(this.configService.get('SESSION_COOKIE_MAX_AGE')) || 432000;
  }

  async signup(dto: SignupDto, ipAddr?: string, dvcInfo?: string) {
    const decoded = await this.firebaseAdmin.getAuth().verifyIdToken(dto.idToken);
    const { uid: firebaseUid, email } = decoded;

    if (!email) {
      throw new BadRequestException('Email không tồn tại trong token.');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng.');
    }

    // Verify agreed terms exist and are active
    const terms = await this.prisma.terms.findMany({
      where: { id: { in: dto.agreedTermsIds }, actvYn: 'Y' },
    });
    if (terms.length !== dto.agreedTermsIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều điều khoản không hợp lệ hoặc không còn hiệu lực.',
      );
    }

    // Check all required terms are agreed
    const requiredTerms = await this.prisma.terms.findMany({
      where: { actvYn: 'Y', reqYn: 'Y' },
    });
    const requiredIds = requiredTerms.map((t) => t.id);
    const missingRequired = requiredIds.filter(
      (id) => !dto.agreedTermsIds.includes(id),
    );
    if (missingRequired.length > 0) {
      throw new BadRequestException(
        'Vui lòng đồng ý tất cả các điều khoản bắt buộc.',
      );
    }

    // Create user + agreements in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firebaseUid,
          email,
          displayName: dto.displayName || null,
          creatBy: 'SYSTEM',
        },
      });

      await tx.userAgreement.createMany({
        data: dto.agreedTermsIds.map((trmsId) => ({
          userId: newUser.id,
          trmsId,
          agreYn: 'Y',
          agreDt: new Date(),
          ipAddr,
          dvcInfo,
        })),
      });

      return newUser;
    });

    // Create session cookie
    const sessionCookie = await this.firebaseAdmin
      .getAuth()
      .createSessionCookie(dto.idToken, {
        expiresIn: this.sessionMaxAge * 1000,
      });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.roleCd,
      },
      sessionCookie,
      sessionMaxAge: this.sessionMaxAge,
    };
  }

  async createSession(
    dto: CreateSessionDto,
    ipAddr?: string,
    dvcInfo?: string,
  ) {
    const decoded = await this.firebaseAdmin
      .getAuth()
      .verifyIdToken(dto.idToken);

    // Find existing user
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: {
        id: true,
        email: true,
        displayName: true,
        roleCd: true,
        sttsCd: true,
        delYn: true,
      },
    });

    // --- EXISTING USER PATH ---
    if (user) {
      if (user.delYn === 'Y' || user.sttsCd === 'WITHDRAWN') {
        throw new ForbiddenException('Tài khoản đã bị xóa.');
      }
      if (user.sttsCd === 'SUSPENDED') {
        throw new ForbiddenException('Tài khoản đã bị đình chỉ.');
      }
      if (user.sttsCd !== 'ACTIVE') {
        throw new ForbiddenException('Tài khoản không hoạt động.');
      }

      // Check pending required terms
      const requiredTerms = await this.prisma.terms.findMany({
        where: { actvYn: 'Y', reqYn: 'Y' },
        select: { id: true, title: true, typeCd: true },
      });
      const agreedTermIds = (
        await this.prisma.userAgreement.findMany({
          where: { userId: user.id, agreYn: 'Y' },
          select: { trmsId: true },
        })
      ).map((a) => a.trmsId);
      const pendingTerms = requiredTerms.filter(
        (t) => !agreedTermIds.includes(t.id),
      );

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginDt: new Date(), updtBy: user.id },
      });

      const sessionCookie = await this.firebaseAdmin
        .getAuth()
        .createSessionCookie(dto.idToken, {
          expiresIn: this.sessionMaxAge * 1000,
        });

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.roleCd,
          status: user.sttsCd,
        },
        pendingTerms: pendingTerms.length > 0 ? pendingTerms : null,
        sessionCookie,
        sessionMaxAge: this.sessionMaxAge,
      };
    }

    // --- NEW USER PATH (Google auto-register) ---
    if (!decoded.email) {
      throw new UnauthorizedException(
        'Tài khoản chưa được đăng ký trong hệ thống.',
      );
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: decoded.email },
    });
    if (existingByEmail) {
      throw new ConflictException(
        'Email đã được sử dụng bằng phương thức đăng nhập khác.',
      );
    }

    // Load required terms
    const requiredTerms = await this.prisma.terms.findMany({
      where: { actvYn: 'Y', reqYn: 'Y' },
      select: { id: true, title: true, typeCd: true },
    });

    // If required terms exist but user hasn't agreed
    if (
      requiredTerms.length > 0 &&
      (!Array.isArray(dto.agreedTermsIds) || dto.agreedTermsIds.length === 0)
    ) {
      return {
        requiresRegistration: true,
        pendingTerms: requiredTerms,
        sessionCookie: null,
        sessionMaxAge: this.sessionMaxAge,
      };
    }

    // Validate agreed terms
    if (requiredTerms.length > 0 && dto.agreedTermsIds) {
      const validTerms = await this.prisma.terms.findMany({
        where: { id: { in: dto.agreedTermsIds }, actvYn: 'Y' },
      });
      if (validTerms.length !== dto.agreedTermsIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều điều khoản không hợp lệ hoặc không còn hiệu lực.',
        );
      }
      const requiredIds = requiredTerms.map((t) => t.id);
      const missing = requiredIds.filter(
        (id) => !dto.agreedTermsIds!.includes(id),
      );
      if (missing.length > 0) {
        throw new BadRequestException(
          'Vui lòng đồng ý tất cả các điều khoản bắt buộc.',
        );
      }
    }

    const displayName = decoded.name ?? null;
    const photoUrl = decoded.picture ?? null;

    // Create user in transaction
    const newUser = await this.prisma.$transaction(async (tx) => {
      const emailConflict = await tx.user.findUnique({
        where: { email: decoded.email as string },
      });
      if (emailConflict) {
        throw new ConflictException(
          'Email đã được sử dụng bằng phương thức đăng nhập khác.',
        );
      }

      const created = await tx.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email as string,
          displayName,
          photoUrl,
          creatBy: 'GOOGLE',
        },
      });

      if (Array.isArray(dto.agreedTermsIds) && dto.agreedTermsIds.length > 0) {
        await tx.userAgreement.createMany({
          data: dto.agreedTermsIds.map((trmsId) => ({
            userId: created.id,
            trmsId,
            agreYn: 'Y',
            agreDt: new Date(),
            ipAddr,
            dvcInfo,
          })),
        });
      }

      return created;
    });

    const sessionCookie = await this.firebaseAdmin
      .getAuth()
      .createSessionCookie(dto.idToken, {
        expiresIn: this.sessionMaxAge * 1000,
      });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.roleCd,
        status: newUser.sttsCd,
      },
      sessionCookie,
      sessionMaxAge: this.sessionMaxAge,
    };
  }

  async logout(firebaseUid: string) {
    await this.firebaseAdmin.getAuth().revokeRefreshTokens(firebaseUid);
    return { message: 'Đăng xuất thành công.' };
  }
}
