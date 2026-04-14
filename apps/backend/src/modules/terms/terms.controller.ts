import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { TermsService } from './terms.service';
import { CreateTermsDto } from './dto/create-terms.dto';
import { UpdateTermsDto } from './dto/update-terms.dto';
import { AgreeTermsDto } from './dto/agree-terms.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifiedPayload } from '../auth/interfaces/verified-payload.interface';

@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  // GET /api/terms — List all terms (ADMIN only)
  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.termsService.findAll();
  }

  // POST /api/terms — Create new term (ADMIN only)
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTermsDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.termsService.create(dto, user.sub);
  }

  // GET /api/terms/active — Public: get active terms
  @Public()
  @Get('active')
  findActive() {
    return this.termsService.findActive();
  }

  // GET /api/terms/pending — Get terms not yet agreed by current user
  @Get('pending')
  findPending(@CurrentUser() user: VerifiedPayload) {
    return this.termsService.findPending(user.sub);
  }

  // POST /api/terms/agree — Agree to terms
  @Post('agree')
  @HttpCode(HttpStatus.OK)
  agree(
    @Body() dto: AgreeTermsDto,
    @CurrentUser() user: VerifiedPayload,
    @Req() req: Request,
  ) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      (req.headers['x-real-ip'] as string) ??
      undefined;
    const dvcInfo = req.headers['user-agent'] ?? undefined;

    return this.termsService.agree(dto, user.sub, ipAddr, dvcInfo);
  }

  // PATCH /api/terms/:id — Update term (ADMIN only)
  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTermsDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.termsService.update(id, dto, user.sub);
  }

  // DELETE /api/terms/:id — Soft delete term (ADMIN only)
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.termsService.remove(id, user.sub);
  }
}
