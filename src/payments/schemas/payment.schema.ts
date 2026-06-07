import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Order', index: true })
  orderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: String, enum: ['DEPOSIT', 'FINAL'], required: true })
  type!: string;

  @Prop({ type: Number, required: true })
  amount!: number;

  @Prop({
    type: String,
    enum: ['PENDING', 'PAID', 'EXPIRED', 'FAILED'],
    default: 'PENDING',
    index: true,
  })
  status!: string;

  @Prop({ required: true, unique: true, index: true })
  content!: string;

  @Prop({ type: String, default: null })
  transactionRef?: string | null;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  paidAt?: Date | null;

  @Prop({ type: Number, default: null })
  sePayTransactionId?: number | null;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
