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
import { LeaveTypesService } from './leave-types.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/create-leave-type.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('leave-types')
export class LeaveTypesController {
  constructor(private readonly leaveTypesService: LeaveTypesService) {}

  // GET /api/leave-types
  @Get()
  findAll(@Query('useYn') useYn?: string) {
    return this.leaveTypesService.findAll(useYn);
  }

  // POST /api/leave-types (ADMIN)
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLeaveTypeDto) {
    return this.leaveTypesService.create(dto);
  }

  // PATCH /api/leave-types/:cd (ADMIN)
  @Patch(':cd')
  @Roles('ADMIN')
  update(@Param('cd') cd: string, @Body() dto: UpdateLeaveTypeDto) {
    return this.leaveTypesService.update(cd, dto);
  }

  // DELETE /api/leave-types/:cd (ADMIN)
  @Delete(':cd')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  remove(@Param('cd') cd: string) {
    return this.leaveTypesService.remove(cd);
  }
}
