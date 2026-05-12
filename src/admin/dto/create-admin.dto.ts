import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { AdminRole } from '../../common/enums/role.enum';

export class CreateAdminDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the admin' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'admin@ems.com', description: 'Unique email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Admin@12345',
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

  @ApiProperty({ enum: AdminRole, example: AdminRole.ADMIN, description: 'Admin role' })
  @IsEnum(AdminRole, { message: `Role must be one of: ${Object.values(AdminRole).join(', ')}` })
  role: AdminRole;
}
