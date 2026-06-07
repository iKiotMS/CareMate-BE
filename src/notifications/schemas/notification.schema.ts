import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType } from '../dtos/notification.dto';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, index: true })
  recipientId!: string;

  @Prop({ required: true, enum: Object.values(NotificationType) })
  type!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: String, default: null })
  referenceId?: string | null;

  @Prop({ type: String, default: null })
  referenceType?: string | null;

  @Prop({ default: false, index: true })
  isRead!: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
