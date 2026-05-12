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
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Admins')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN] Create a new admin' })
  @ApiResponse({ status: 201, description: 'Admin created successfully.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async create(@Body() dto: CreateAdminDto) {
    const data = await this.adminService.create(dto);
    return { message: 'Admin created successfully', data };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN] Retrieve all admins (paginated)' })
  async findAll(@Query() pagination: PaginationDto) {
    const data = await this.adminService.findAll(pagination);
    return { message: 'Admins retrieved successfully', data };
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN | self] Get admin by ID' })
  @ApiParam({ name: 'id', description: 'Admin MongoDB ObjectId' })
  async findOne(@Param('id') id: string, @CurrentUser() requester: JwtPayload) {
    const data = await this.adminService.findById(id, requester);
    return { message: 'Admin retrieved successfully', data };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN | self] Update admin by ID' })
  @ApiParam({ name: 'id', description: 'Admin MongoDB ObjectId' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentUser() requester: JwtPayload,
  ) {
    const data = await this.adminService.update(id, dto, requester);
    return { message: 'Admin updated successfully', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN] Soft-delete admin by ID' })
  @ApiParam({ name: 'id', description: 'Admin MongoDB ObjectId' })
  async remove(@Param('id') id: string, @CurrentUser() requester: JwtPayload) {
    await this.adminService.remove(id, requester);
    return { message: 'Admin deleted successfully', data: null };
  }
}
