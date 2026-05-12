import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { Admin, AdminDocument } from '../../admin/schemas/admin.schema';
import { Employee, EmployeeDocument } from '../../employee/schemas/employee.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const { sub, userType } = payload;

    if (userType === 'admin') {
      const admin = await this.adminModel
        .findOne({ _id: sub, isDeleted: false })
        .lean()
        .exec();
      if (!admin) throw new UnauthorizedException('Admin account not found or has been deleted.');
    } else {
      const employee = await this.employeeModel
        .findOne({ _id: sub, isDeleted: false })
        .lean()
        .exec();
      if (!employee)
        throw new UnauthorizedException('Employee account not found or has been deleted.');
    }

    return payload;
  }
}
