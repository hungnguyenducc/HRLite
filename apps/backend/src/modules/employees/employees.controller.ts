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
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { LinkUserDto } from './dto/link-user.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifiedPayload } from '../auth/interfaces/verified-payload.interface';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // GET /api/employees — List with pagination
  @Get()
  findAll(@Query() query: ListEmployeesQueryDto) {
    return this.employeesService.findAll(query);
  }

  // GET /api/employees/stats — Statistics
  @Get('stats')
  getStats() {
    return this.employeesService.getStats();
  }

  // GET /api/employees/:id — Detail
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  // POST /api/employees — Create (ADMIN)
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.employeesService.create(dto, user.email);
  }

  // PATCH /api/employees/:id/link-user — Link/unlink user (ADMIN)
  @Patch(':id/link-user')
  @Roles('ADMIN')
  linkUser(
    @Param('id') id: string,
    @Body() dto: LinkUserDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.employeesService.linkUser(id, dto, user.email);
  }

  // PATCH /api/employees/:id — Update (ADMIN)
  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.employeesService.update(id, dto, user.email);
  }

  // DELETE /api/employees/:id — Soft delete (ADMIN)
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.employeesService.remove(id, user.email);
  }
}
