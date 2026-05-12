import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AttendanceService } from './attendance.service';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { ReportFilterDto } from './dto/report-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Attendance')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('punch-in')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.EMPLOYEE)
  @ApiOperation({ summary: '[EMPLOYEE] Record punch-in for the authenticated employee' })
  @ApiResponse({ status: 201, description: 'Punch-in recorded successfully.' })
  @ApiResponse({ status: 400, description: 'Already punched in.' })
  async punchIn(@CurrentUser() requester: JwtPayload) {
    const data = await this.attendanceService.punchIn(requester);
    return { message: 'Punch-in recorded successfully', data };
  }

  @Post('punch-out')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.EMPLOYEE)
  @ApiOperation({ summary: '[EMPLOYEE] Record punch-out for the authenticated employee' })
  @ApiResponse({ status: 200, description: 'Punch-out recorded successfully.' })
  @ApiResponse({ status: 404, description: 'No active punch-in found.' })
  async punchOut(@CurrentUser() requester: JwtPayload) {
    const data = await this.attendanceService.punchOut(requester);
    return { message: 'Punch-out recorded successfully', data };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: '[SUPER_ADMIN | ADMIN] Retrieve all attendance records with optional filters',
  })
  async findAll(@Query() filter: AttendanceFilterDto) {
    const data = await this.attendanceService.findAll(filter);
    return { message: 'Attendance records retrieved successfully', data };
  }

  @Get('report')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: '[SUPER_ADMIN | ADMIN] Download punch-in/punch-out report as CSV',
    description:
      'Generates and downloads a CSV file. Supports filtering by employeeId, date range, and custom field selection.',
  })
  @ApiResponse({ status: 200, description: 'CSV file streamed as download.' })
  @ApiResponse({ status: 404, description: 'No data found for the given filters.' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2025-12-31' })
  @ApiQuery({
    name: 'fields',
    required: false,
    example: 'employeeName,punchIn,punchOut,duration',
    description: 'Comma-separated field names to include in report',
  })
  async downloadReport(@Query() filter: ReportFilterDto, @Res() res: Response) {
    await this.attendanceService.generateCsvReport(filter, res);
  }
}
