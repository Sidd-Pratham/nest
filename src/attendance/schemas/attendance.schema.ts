import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Employee } from '../../employee/schemas/employee.schema';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true, collection: 'attendances' })
export class Attendance {
  @Prop({
    type: Types.ObjectId,
    ref: Employee.name,
    required: true,
    index: true,
  })
  employeeId: Types.ObjectId;

  @Prop({ required: true, type: Date })
  punchIn: Date;

  @Prop({ type: Date, default: null })
  punchOut: Date | null;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Compound index for efficient queries by employee and date
AttendanceSchema.index({ employeeId: 1, punchIn: -1 });
