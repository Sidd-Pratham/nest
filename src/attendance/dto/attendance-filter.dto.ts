import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AttendanceFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by employee ID (MongoDB ObjectId)' })
  @IsOptional()
  @IsMongoId({ message: 'employeeId must be a valid MongoDB ObjectId' })
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO 8601 format: YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO 8601 format: YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
