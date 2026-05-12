import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Response } from 'express';
import * as fastCsv from 'fast-csv';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { ReportFilterDto } from './dto/report-filter.dto';
import { Employee, EmployeeDocument } from '../employee/schemas/employee.schema';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { PaginatedResult } from '../common/dto/pagination.dto';

const ALLOWED_REPORT_FIELDS = [
  'employeeId',
  'employeeName',
  'employeeEmail',
  'department',
  'date',
  'punchIn',
  'punchOut',
  'duration',
];

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  async punchIn(requester: JwtPayload): Promise<Attendance> {
    if (requester.userType !== 'employee') {
      throw new ForbiddenException('Only employees can record attendance.');
    }

    const employeeObjectId = new Types.ObjectId(requester.sub);

    // Verify the employee exists
    const employee = await this.employeeModel.findById(employeeObjectId).lean().exec();
    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    // Check for an already-open punch-in (punchOut is null)
    const openRecord = await this.attendanceModel
      .findOne({ employeeId: employeeObjectId, punchOut: null })
      .lean()
      .exec();

    if (openRecord) {
      throw new BadRequestException(
        'You already have an active punch-in. Please punch out before punching in again.',
      );
    }

    const attendance = (await this.attendanceModel.create({
      employeeId: employeeObjectId,
      punchIn: new Date(),
      punchOut: null,
    })) as AttendanceDocument;

    return attendance.toObject();
  }

  async punchOut(requester: JwtPayload): Promise<Attendance> {
    if (requester.userType !== 'employee') {
      throw new ForbiddenException('Only employees can record attendance.');
    }

    const employeeObjectId = new Types.ObjectId(requester.sub);

    const openRecord = await this.attendanceModel
      .findOne({ employeeId: employeeObjectId, punchOut: null })
      .exec();

    if (!openRecord) {
      throw new NotFoundException(
        'No active punch-in found. Please punch in before punching out.',
      );
    }

    openRecord.punchOut = new Date();
    await openRecord.save();

    return openRecord.toObject();
  }

  async findAll(filter: AttendanceFilterDto): Promise<PaginatedResult<Attendance>> {
    const { page = 1, limit = 10, employeeId, startDate, endDate } = filter;

    const query: Record<string, any> = {};

    if (employeeId) {
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException('Invalid employeeId format.');
      }
      query.employeeId = new Types.ObjectId(employeeId);
    }

    if (startDate || endDate) {
      query.punchIn = {};
      if (startDate) query.punchIn.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.punchIn.$lte = end;
      }
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.attendanceModel
        .find(query)
        .populate('employeeId', 'name email department')
        .sort({ punchIn: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.attendanceModel.countDocuments(query),
    ]);

    return {
      data: data as any[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async generateCsvReport(filter: ReportFilterDto, res: Response): Promise<void> {
    const { employeeId, startDate, endDate, fields } = filter;

    const query: Record<string, any> = {};

    if (employeeId) {
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException('Invalid employeeId format.');
      }
      query.employeeId = new Types.ObjectId(employeeId);
    }

    if (startDate || endDate) {
      query.punchIn = {};
      if (startDate) query.punchIn.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.punchIn.$lte = end;
      }
    }

    const records = await this.attendanceModel
      .find(query)
      .populate<{ employeeId: EmployeeDocument }>('employeeId', 'name email department')
      .sort({ punchIn: -1 })
      .lean()
      .exec();

    if (!records || records.length === 0) {
      throw new NotFoundException(
        'No attendance data found for the specified filters. Cannot generate report.',
      );
    }

    // Determine which fields to include
    let selectedFields = ALLOWED_REPORT_FIELDS;
    if (fields) {
      const requested = fields.split(',').map((f) => f.trim().toLowerCase());
      selectedFields = ALLOWED_REPORT_FIELDS.filter((f) => requested.includes(f));
      if (selectedFields.length === 0) {
        throw new BadRequestException(
          `No valid fields selected. Allowed fields: ${ALLOWED_REPORT_FIELDS.join(', ')}`,
        );
      }
    }

    // Build report rows
    const rows = records.map((record) => {
      const emp = record.employeeId as any;
      const punchInTime = record.punchIn ? new Date(record.punchIn) : null;
      const punchOutTime = record.punchOut ? new Date(record.punchOut) : null;

      let duration = 'N/A';
      if (punchInTime && punchOutTime) {
        const diffMs = punchOutTime.getTime() - punchInTime.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${hours}h ${minutes}m`;
      }

      const fullRow: Record<string, any> = {
        employeeId: emp?._id?.toString() ?? 'N/A',
        employeeName: emp?.name ?? 'N/A',
        employeeEmail: emp?.email ?? 'N/A',
        department: emp?.department ?? 'N/A',
        date: punchInTime ? punchInTime.toISOString().split('T')[0] : 'N/A',
        punchIn: punchInTime ? punchInTime.toISOString() : 'N/A',
        punchOut: punchOutTime ? punchOutTime.toISOString() : 'Not punched out',
        duration,
      };

      // Return only selected fields
      return selectedFields.reduce(
        (row, field) => {
          row[field] = fullRow[field];
          return row;
        },
        {} as Record<string, any>,
      );
    });

    // Stream CSV directly to response
    const filename = `attendance_report_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const csvStream = fastCsv.format({ headers: true });
    csvStream.pipe(res);
    rows.forEach((row) => csvStream.write(row));
    csvStream.end();
  }
}
