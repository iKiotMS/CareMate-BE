import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class ComplaintReply {
  @Prop({ required: true })
  authorId!: string;

  @Prop({ required: true })
  authorRole!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ required: true })
  createdAt!: Date;
}

const ComplaintReplySchema = SchemaFactory.createForClass(ComplaintReply);

export type ComplaintDocument = Complaint & Document;

@Schema({ timestamps: true })
export class Complaint {
  @Prop({ type: Types.ObjectId, required: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  orderId!: Types.ObjectId;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({
    type: String,
    enum: ['OPEN', 'PROCESSING', 'RESOLVED', 'REJECTED'],
    default: 'OPEN',
  })
  status!: string;

  @Prop({
    type: String,
    enum: ['SERVICE_QUALITY', 'CLEANER_BEHAVIOR', 'LATE_ARRIVAL', 'DAMAGE', 'OTHER', null],
    default: null,
  })
  category?: string | null;

  @Prop({ type: [String], default: [] })
  evidenceUrls?: string[];

  @Prop({ type: [ComplaintReplySchema], default: [] })
  replies?: ComplaintReply[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ComplaintSchema = SchemaFactory.createForClass(Complaint);
