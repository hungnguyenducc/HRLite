import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { ListAttendanceQueryDto } from './dto/list-attendance-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifiedPayload } from '../auth/interfaces/verified-payload.interface';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // GET /api/attendance — List with pagination
  @Get()
  findAll(
    @Query() query: ListAttendanceQueryDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.attendanceService.findAll(query, user.role, user.sub);
  }

  // POST /api/attendance — Admin manual entry
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateAttendanceDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.attendanceService.create(dto, user.email);
  }

  // GET /api/attendance/today — Today's attendance for current user
  @Get('today')
  getToday(@CurrentUser() user: VerifiedPayload) {
    return this.attendanceService.getToday(user.sub);
  }

  // GET /api/attendance/stats — Today's statistics
  @Get('stats')
  getStats() {
    return this.attendanceService.getStats();
  }

  // GET /api/attendance/summary — Monthly summary (ADMIN)
  @Get('summary')
  @Roles('ADMIN')
  getSummary(
    @Query('month') month?: string,
    @Query('deptId') deptId?: string,
  ) {
    return this.attendanceService.getSummary(month, deptId);
  }

  // POST /api/attendance/check-in — Employee self check-in
  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  checkIn(@CurrentUser() user: VerifiedPayload) {
    return this.attendanceService.checkIn(user.sub, user.email);
  }

  // POST /api/attendance/check-out — Employee self check-out
  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  checkOut(@CurrentUser() user: VerifiedPayload) {
    return this.attendanceService.checkOut(user.sub, user.email);
  }

  // PATCH /api/attendance/:id — Admin update
  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.attendanceService.update(id, dto, user.email);
  }

  // DELETE /api/attendance/:id — Hard delete (ADMIN)
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
