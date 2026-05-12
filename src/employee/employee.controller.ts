import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { FilterEmployeeDto } from './dto/filter-employee.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Employees')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN | ADMIN] Create a new employee' })
  @ApiResponse({ status: 201, description: 'Employee created successfully.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async create(@Body() dto: CreateEmployeeDto) {
    const data = await this.employeeService.create(dto);
    return { message: 'Employee created successfully', data };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: '[SUPER_ADMIN | ADMIN] Retrieve all employees with pagination & filtering',
  })
  async findAll(@Query() filter: FilterEmployeeDto) {
    const data = await this.employeeService.findAll(filter);
    return { message: 'Employees retrieved successfully', data };
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EMPLOYEE)
  @ApiOperation({ summary: '[ADMIN | self] Get employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee MongoDB ObjectId' })
  async findOne(@Param('id') id: string, @CurrentUser() requester: JwtPayload) {
    const data = await this.employeeService.findById(id, requester);
    return { message: 'Employee retrieved successfully', data };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EMPLOYEE)
  @ApiOperation({ summary: '[ADMIN | self] Update employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee MongoDB ObjectId' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() requester: JwtPayload,
  ) {
    const data = await this.employeeService.update(id, dto, requester);
    return { message: 'Employee updated successfully', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN | ADMIN] Soft-delete employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee MongoDB ObjectId' })
  async remove(@Param('id') id: string, @CurrentUser() requester: JwtPayload) {
    await this.employeeService.remove(id, requester);
    return { message: 'Employee deleted successfully', data: null };
  }
}
