import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional, IsArray, IsString } from 'class-validator';

export class ReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter report by employee ID' })
  @IsOptional()
  @IsMongoId({ message: 'employeeId must be a valid MongoDB ObjectId' })
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Report start date (ISO 8601: YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Report end date (ISO 8601: YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of fields to include in the CSV report',
    example: 'employeeName,punchIn,punchOut,duration',
  })
  @IsOptional()
  @IsString()
  fields?: string;
}
