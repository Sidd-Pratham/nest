import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { FilterEmployeeDto } from './dto/filter-employee.dto';
import { CacheService } from '../cache/cache.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UserRole } from '../common/enums/role.enum';

const CACHE_PREFIX = 'employee';
const CACHE_LIST_KEY = `${CACHE_PREFIX}:list`;

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    private readonly cacheService: CacheService,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const existing = await this.employeeModel
      .findOne({ email: dto.email.toLowerCase() })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException('An employee with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const employee = await this.employeeModel.create({
      ...dto,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
    });

    await this.cacheService.delPattern(`${CACHE_LIST_KEY}*`);
    return this.sanitize(employee.toObject());
  }

  async findAll(filter: FilterEmployeeDto): Promise<PaginatedResult<Employee>> {
    const { page = 1, limit = 10, department, search } = filter;
    const cacheKey = `${CACHE_LIST_KEY}:${JSON.stringify(filter)}`;

    const cached = await this.cacheService.get<PaginatedResult<Employee>>(cacheKey);
    if (cached) return cached;

    const query: Record<string, any> = {};
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.employeeModel.find(query).skip(skip).limit(limit).lean().exec(),
      this.employeeModel.countDocuments(query),
    ]);

    const result: PaginatedResult<Employee> = {
      data: data.map(this.sanitize),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.cacheService.set(cacheKey, result);
    return result;
  }

  async findById(id: string, requester: JwtPayload): Promise<Employee> {
    // Employees can only view their own profile
    if (requester.userType === 'employee' && requester.sub !== id) {
      throw new ForbiddenException('You can only view your own profile.');
    }

    const cacheKey = `${CACHE_PREFIX}:${id}`;
    const cached = await this.cacheService.get<Employee>(cacheKey);
    if (cached) return cached;

    const employee = await this.employeeModel.findById(id).lean().exec();
    if (!employee) throw new NotFoundException(`Employee with ID "${id}" not found.`);

    const sanitized = this.sanitize(employee);
    await this.cacheService.set(cacheKey, sanitized);
    return sanitized;
  }

  async update(id: string, dto: UpdateEmployeeDto, requester: JwtPayload): Promise<Employee> {
    // Employees can only update their own profile
    if (requester.userType === 'employee') {
      if (requester.sub !== id) {
        throw new ForbiddenException('You can only update your own profile.');
      }
      if (dto.email) {
        throw new ForbiddenException('Employees are not allowed to change their email address.');
      }
      if (dto.department) {
        throw new ForbiddenException('Employees are not allowed to change their department.');
      }
    }

    const employee = await this.employeeModel.findById(id).lean().exec();
    if (!employee) throw new NotFoundException(`Employee with ID "${id}" not found.`);

    if (dto.email && dto.email.toLowerCase() !== employee.email) {
      const conflict = await this.employeeModel
        .findOne({ email: dto.email.toLowerCase() })
        .lean()
        .exec();
      if (conflict) throw new ConflictException('An employee with this email already exists.');
    }

    const updatePayload: Record<string, any> = { ...dto };
    if (dto.email) updatePayload.email = dto.email.toLowerCase();
    if (dto.password) updatePayload.password = await bcrypt.hash(dto.password, 12);

    const updated = await this.employeeModel
      .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
      .lean()
      .exec();

    await this.cacheService.del(`${CACHE_PREFIX}:${id}`);
    await this.cacheService.delPattern(`${CACHE_LIST_KEY}*`);

    return this.sanitize(updated!);
  }

  async remove(id: string, requester: JwtPayload): Promise<void> {
    if (requester.userType === 'employee') {
      throw new ForbiddenException('Employees cannot delete accounts.');
    }

    const employee = await this.employeeModel.findById(id).lean().exec();
    if (!employee) throw new NotFoundException(`Employee with ID "${id}" not found.`);

    await this.employeeModel.findByIdAndUpdate(id, {
      $set: { isDeleted: true, deletedAt: new Date() },
    });

    await this.cacheService.del(`${CACHE_PREFIX}:${id}`);
    await this.cacheService.delPattern(`${CACHE_LIST_KEY}*`);
  }

  private sanitize(employee: Record<string, any>): any {
    const { password, ...rest } = employee;
    return rest;
  }
}
