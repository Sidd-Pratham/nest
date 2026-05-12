import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from './schemas/admin.schema';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { CacheService } from '../cache/cache.service';
import { PaginatedResult, PaginationDto } from '../common/dto/pagination.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UserRole } from '../common/enums/role.enum';

const CACHE_PREFIX = 'admin';
const CACHE_LIST_KEY = `${CACHE_PREFIX}:list`;

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
    private readonly cacheService: CacheService,
  ) {}

  async create(dto: CreateAdminDto): Promise<Admin> {
    const existing = await this.adminModel.findOne({ email: dto.email.toLowerCase() }).lean();
    if (existing) {
      throw new ConflictException('An admin with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const admin = await this.adminModel.create({
      ...dto,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
    });

    await this.cacheService.delPattern(`${CACHE_LIST_KEY}*`);
    return this.sanitize(admin.toObject());
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<Admin>> {
    const { page = 1, limit = 10 } = pagination;
    const cacheKey = `${CACHE_LIST_KEY}:page=${page}:limit=${limit}`;

    const cached = await this.cacheService.get<PaginatedResult<Admin>>(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.adminModel.find().skip(skip).limit(limit).lean().exec(),
      this.adminModel.countDocuments(),
    ]);

    const result: PaginatedResult<Admin> = {
      data: data.map(this.sanitize),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.cacheService.set(cacheKey, result);
    return result;
  }

  async findById(id: string, requester: JwtPayload): Promise<Admin> {
    // Self or Super Admin only
    if (requester.userType === 'employee') {
      throw new ForbiddenException('Employees cannot access admin records.');
    }
    if (requester.role !== UserRole.SUPER_ADMIN && requester.sub !== id) {
      throw new ForbiddenException('You can only view your own profile.');
    }

    const cacheKey = `${CACHE_PREFIX}:${id}`;
    const cached = await this.cacheService.get<Admin>(cacheKey);
    if (cached) return cached;

    const admin = await this.adminModel.findById(id).lean().exec();
    if (!admin) throw new NotFoundException(`Admin with ID "${id}" not found.`);

    const sanitized = this.sanitize(admin);
    await this.cacheService.set(cacheKey, sanitized);
    return sanitized;
  }

  async update(id: string, dto: UpdateAdminDto, requester: JwtPayload): Promise<Admin> {
    if (requester.userType === 'employee') {
      throw new ForbiddenException('Employees cannot modify admin records.');
    }
    if (requester.role !== UserRole.SUPER_ADMIN && requester.sub !== id) {
      throw new ForbiddenException('You can only update your own profile.');
    }

    // Non-super-admins cannot change their own role
    if (dto.role && requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can change admin roles.');
    }

    const admin = await this.adminModel.findById(id).lean().exec();
    if (!admin) throw new NotFoundException(`Admin with ID "${id}" not found.`);

    if (dto.email && dto.email.toLowerCase() !== admin.email) {
      const conflict = await this.adminModel
        .findOne({ email: dto.email.toLowerCase() })
        .lean()
        .exec();
      if (conflict) throw new ConflictException('An admin with this email already exists.');
    }

    const updatePayload: Partial<Admin> & Record<string, any> = { ...dto };
    if (dto.email) updatePayload.email = dto.email.toLowerCase();
    if (dto.password) updatePayload.password = await bcrypt.hash(dto.password, 12);

    const updated = await this.adminModel
      .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
      .lean()
      .exec();

    await this.cacheService.del(`${CACHE_PREFIX}:${id}`);
    await this.cacheService.delPattern(`${CACHE_LIST_KEY}*`);

    return this.sanitize(updated!);
  }

  async remove(id: string, requester: JwtPayload): Promise<void> {
    if (requester.sub === id) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    const admin = await this.adminModel.findById(id).lean().exec();
    if (!admin) throw new NotFoundException(`Admin with ID "${id}" not found.`);

    await this.adminModel.findByIdAndUpdate(id, {
      $set: { isDeleted: true, deletedAt: new Date() },
    });

    await this.cacheService.del(`${CACHE_PREFIX}:${id}`);
    await this.cacheService.delPattern(`${CACHE_LIST_KEY}*`);
  }

  private sanitize(admin: Record<string, any>): any {
    const { password, ...rest } = admin;
    return rest;
  }
}
