import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Department } from '../../common/enums/department.enum';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Alice Smith', description: 'Full name of the employee' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'alice@ems.com', description: 'Unique email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Alice@12345',
    description: 'Password (min 8 chars, must include uppercase, lowercase, digit, special char)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({
    enum: Department,
    example: Department.ENGINEERING,
    description: 'Employee department (strict enum)',
  })
  @IsEnum(Department, {
    message: `Department must be one of: ${Object.values(Department).join(', ')}`,
  })
  department: Department;
}
