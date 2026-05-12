import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Department } from '../../common/enums/department.enum';

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true, collection: 'employees' })
export class Employee {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, enum: Department })
  department: Department;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

// Automatically exclude soft-deleted records from all queries
EmployeeSchema.pre(/^find/, function () {
  (this as any).where({ isDeleted: false });
});
