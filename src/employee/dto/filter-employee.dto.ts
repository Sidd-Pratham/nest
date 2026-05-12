import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Department } from '../../common/enums/department.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterEmployeeDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: Department,
    description: 'Filter employees by department',
  })
  @IsOptional()
  @IsEnum(Department, {
    message: `Department must be one of: ${Object.values(Department).join(', ')}`,
  })
  department?: Department;

  @ApiPropertyOptional({ description: 'Search by name or email (case-insensitive)' })
  @IsOptional()
  @IsString()
  search?: string;
}
