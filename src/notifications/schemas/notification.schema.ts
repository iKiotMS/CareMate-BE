import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  recipientId!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: String, default: null })
  referenceId?: string | null;

  @Prop({ type: String, default: null })
  referenceType?: string | null;

  @Prop({ default: false })
  isRead!: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
