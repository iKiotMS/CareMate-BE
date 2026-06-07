import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class WorkingHours {
  @Prop({ required: true })
  start!: string;

  @Prop({ required: true })
  end!: string;
}

const WorkingHoursSchema = SchemaFactory.createForClass(WorkingHours);

export type AvailabilityDocument = Availability & Document;

@Schema({ timestamps: true })
export class Availability {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  cleanerId!: Types.ObjectId;

  @Prop({ type: [Number], default: [1, 2, 3, 4, 5] })
  workingDays!: number[];

  @Prop({ type: WorkingHoursSchema, default: () => ({ start: '08:00', end: '18:00' }) })
  workingHours!: WorkingHours;

  @Prop({ type: [String], default: [] })
  daysOff!: string[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);
