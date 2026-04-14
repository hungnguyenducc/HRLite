import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';
import { ListLeaveQueryDto } from './dto/list-leave-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifiedPayload } from '../auth/interfaces/verified-payload.interface';

@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // GET /api/leave — List with pagination
  @Get()
  findAll(
    @Query() query: ListLeaveQueryDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.leaveService.findAll(query, user.role, user.sub);
  }

  // POST /api/leave — Create leave request
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.leaveService.create(dto, user.role, user.sub, user.email);
  }

  // GET /api/leave/balance — Get leave balance
  @Get('balance')
  getBalance(
    @Query('emplId') emplId: string | undefined,
    @Query('year') yearStr: string | undefined,
    @CurrentUser() user: VerifiedPayload,
  ) {
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
    return this.leaveService.getBalance(emplId, user.sub, user.role, year);
  }

  // GET /api/leave/stats — Leave statistics
  @Get('stats')
  getStats() {
    return this.leaveService.getStats();
  }

  // PATCH /api/leave/:id/approve — Approve (ADMIN)
  @Patch(':id/approve')
  @Roles('ADMIN')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.leaveService.approve(id, user.sub, user.email);
  }

  // PATCH /api/leave/:id/reject — Reject (ADMIN)
  @Patch(':id/reject')
  @Roles('ADMIN')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectLeaveDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.leaveService.reject(id, dto.reason, user.sub, user.email);
  }

  // PATCH /api/leave/:id/cancel — Cancel
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.leaveService.cancel(id, user.role, user.sub, user.email);
  }
}
