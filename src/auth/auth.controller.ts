import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as Admin (SUPER_ADMIN or ADMIN)' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT access token.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async loginAdmin(@Body() dto: LoginDto) {
    const result = await this.authService.loginAdmin(dto);
    return { message: 'Admin login successful', data: result };
  }

  @Post('employee/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as Employee' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT access token.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async loginEmployee(@Body() dto: LoginDto) {
    const result = await this.authService.loginEmployee(dto);
    return { message: 'Employee login successful', data: result };
  }
}
