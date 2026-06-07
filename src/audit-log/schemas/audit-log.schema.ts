import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({ required: true })
  actorId!: string;

  @Prop({ required: true })
  actorRole!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  targetId!: string;

  @Prop({ required: true })
  targetType!: string;

  @Prop({ type: Object, default: null })
  oldValue?: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  newValue?: Record<string, unknown> | null;

  @Prop()
  createdAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
