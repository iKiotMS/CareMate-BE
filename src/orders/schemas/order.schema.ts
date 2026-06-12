import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class OrderTask {
  @Prop({ type: Types.ObjectId, required: true })
  taskCatalogId!: Types.ObjectId;

  @Prop({ required: true })
  taskName!: string;

  @Prop({ type: Number, default: 0 })
  taskPrice!: number;

  @Prop({ default: false })
  isDone!: boolean;

  @Prop({ type: Date, default: null })
  completedAt?: Date | null;

  @Prop({ type: String, default: null })
  photoBefore?: string | null;

  @Prop({ type: String, default: null })
  photoAfter?: string | null;
}

export const OrderTaskSchema = SchemaFactory.createForClass(OrderTask);

@Schema({ _id: false })
export class OrderApplicant {
  @Prop({ type: Types.ObjectId, required: true })
  cleanerId!: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  appliedAt!: Date;

  @Prop({ type: String, enum: ['PENDING', 'SELECTED', 'REJECTED'], default: 'PENDING' })
  status!: string;
}

export const OrderApplicantSchema = SchemaFactory.createForClass(OrderApplicant);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, required: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  cleanerId?: Types.ObjectId | null;

  // Cleaner selected by customer but deposit not yet paid
  @Prop({ type: Types.ObjectId, default: null })
  pendingCleanerId?: Types.ObjectId | null;

  @Prop({
    enum: [
      "PENDING",
      "ON_HOLD_PAYMENT",
      "CONFIRMED",
      "ACCEPTED",
      "IN_PROGRESS",
      "COMPLETED",
      "REVIEW_PENDING",
      "PAYMENT_PENDING",
      "CANCELLED",
    ],
    default: "PENDING",
  })
  status!: string;

  @Prop({ required: true })
  scheduledDate!: Date;

  @Prop({ required: true })
  scheduledTime!: string;

  @Prop({ required: true })
  address!: string;

  @Prop({ type: String, default: null })
  note?: string | null;

  @Prop({ type: [OrderTaskSchema], default: [] })
  tasks!: OrderTask[];

  @Prop({ type: Number, required: true, default: 0 })
  areaM2!: number;

  @Prop({ default: [] })
  photosBeforeBooking?: string[];

  @Prop({ default: [] })
  photosCheckin?: string[];

  @Prop({ default: [] })
  photosAfter?: string[];

  @Prop({ type: [OrderApplicantSchema], default: [] })
  applicants?: OrderApplicant[];

  @Prop({ type: Date, default: null })
  depositDeadline?: Date | null;

  @Prop({ type: Number, default: 0 })
  totalAmount!: number;

  @Prop({
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'E_WALLET'],
    default: 'CASH',
  })
  paymentMethod!: string;

  @Prop({
    type: String,
    enum: ['UNPAID', 'PAID', 'REFUNDED'],
    default: 'UNPAID',
  })
  paymentStatus!: string;

  @Prop({ type: String, default: null })
  transactionRef?: string | null;

  @Prop({ type: String, default: null })
  paymentNote?: string | null;

  @Prop({ type: Number, default: null })
  rating?: number | null;

  @Prop({ type: String, default: null })
  review?: string | null;

  @Prop({ type: String, enum: ["customer", "admin", "system"], default: null })
  cancelledBy?: string | null;

  @Prop({ type: String, default: null })
  cancelledReason?: string | null;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
