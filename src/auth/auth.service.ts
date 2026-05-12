import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { Admin, AdminDocument } from '../admin/schemas/admin.schema';
import { Employee, EmployeeDocument } from '../employee/schemas/employee.schema';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UserRole } from '../common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async loginAdmin(dto: LoginDto): Promise<{ accessToken: string; user: Record<string, any> }> {
    const admin = await this.adminModel
      .findOne({ email: dto.email.toLowerCase(), isDeleted: false })
      .select('+password')
      .lean()
      .exec();

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload: JwtPayload = {
      sub: (admin._id as any).toString(),
      email: admin.email,
      role: admin.role as unknown as UserRole,
      userType: 'admin',
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  async loginEmployee(dto: LoginDto): Promise<{ accessToken: string; user: Record<string, any> }> {
    const employee = await this.employeeModel
      .findOne({ email: dto.email.toLowerCase(), isDeleted: false })
      .select('+password')
      .lean()
      .exec();

    if (!employee) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, employee.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload: JwtPayload = {
      sub: (employee._id as any).toString(),
      email: employee.email,
      role: UserRole.EMPLOYEE,
      userType: 'employee',
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
      },
    };
  }
}
