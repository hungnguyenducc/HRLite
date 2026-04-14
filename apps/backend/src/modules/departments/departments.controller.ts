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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { SortDepartmentsDto } from './dto/sort-departments.dto';
import { ListDepartmentsQueryDto } from './dto/list-departments-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifiedPayload } from '../auth/interfaces/verified-payload.interface';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  // GET /api/departments — List with pagination
  @Get()
  findAll(@Query() query: ListDepartmentsQueryDto) {
    return this.departmentsService.findAll(query);
  }

  // GET /api/departments/tree — Full org tree
  @Get('tree')
  getTree() {
    return this.departmentsService.getTree();
  }

  // GET /api/departments/:id — Detail
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  // POST /api/departments — Create (ADMIN)
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.departmentsService.create(dto, user.email);
  }

  // PATCH /api/departments/sort — Batch sort (ADMIN)
  @Patch('sort')
  @Roles('ADMIN')
  sort(
    @Body() dto: SortDepartmentsDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.departmentsService.sort(dto, user.email);
  }

  // PATCH /api/departments/:id — Update (ADMIN)
  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.departmentsService.update(id, dto, user.email);
  }

  // DELETE /api/departments/:id — Soft delete (ADMIN)
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: VerifiedPayload,
  ) {
    return this.departmentsService.remove(id, user.email);
  }
}
