import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from './users.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateProfileDto, AdminUpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifiedPayload } from '../auth/interfaces/verified-payload.interface';

const SESSION_COOKIE_NAME = '__session';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/users — List users (ADMIN only)
  @Get()
  @Roles('ADMIN')
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  // GET /api/users/me — Current user profile
  @Get('me')
  getMe(@CurrentUser() user: VerifiedPayload) {
    return this.usersService.getMe(user.sub);
  }

  // PATCH /api/users/me — Update own profile
  @Patch('me')
  updateMe(
    @CurrentUser() user: VerifiedPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMe(user.sub, dto);
  }

  // DELETE /api/users/me — Delete own account
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteMe(
    @CurrentUser() user: VerifiedPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.usersService.deleteMe(
      user.sub,
      user.firebaseUid,
    );

    res.cookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return result;
  }

  // PATCH /api/users/:id — Admin update user role/status
  @Patch(':id')
  @Roles('ADMIN')
  adminUpdate(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.usersService.adminUpdateUser(id, dto, user.sub);
  }
}
