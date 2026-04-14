import { Controller, Post, Body, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifiedPayload } from './interfaces/verified-payload.interface';

const SESSION_COOKIE_NAME = '__session';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      (req.headers['x-real-ip'] as string) ??
      undefined;
    const dvcInfo = req.headers['user-agent'] ?? undefined;

    const result = await this.authService.signup(dto, ipAddr, dvcInfo);

    res.cookie(SESSION_COOKIE_NAME, result.sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.sessionMaxAge * 1000,
      path: '/',
    });

    res.status(HttpStatus.CREATED);
    return { user: result.user };
  }

  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('session')
  async createSession(
    @Body() dto: CreateSessionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      (req.headers['x-real-ip'] as string) ??
      undefined;
    const dvcInfo = req.headers['user-agent'] ?? undefined;

    const result = await this.authService.createSession(dto, ipAddr, dvcInfo);

    if (result.sessionCookie) {
      res.cookie(SESSION_COOKIE_NAME, result.sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: result.sessionMaxAge * 1000,
        path: '/',
      });
    }

    // Exclude internal fields from response
    const { sessionCookie: _sc, sessionMaxAge: _sma, ...responseData } = result;
    return responseData;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: VerifiedPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(user.firebaseUid);

    res.cookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return result;
  }
}
