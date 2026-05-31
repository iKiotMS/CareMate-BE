import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class OrderTask {
  @Prop({ type: Types.ObjectId, required: true })
  taskCatalogId!: Types.ObjectId;

  @Prop({ required: true })
  taskName!: string;

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

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, required: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  cleanerId?: Types.ObjectId | null;

  @Prop({
    enum: [
      "PENDING",
      "ASSIGNED",
      "ACCEPTED",
      "IN_PROGRESS",
      "COMPLETED",
      "REVIEW_PENDING",
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

  @Prop({ default: [] })
  photosBeforeBooking?: string[];

  @Prop({ default: [] })
  photosCheckin?: string[];

  @Prop({ default: [] })
  photosAfter?: string[];

  @Prop({ type: Number, default: null })
  rating?: number | null;

  @Prop({ type: String, default: null })
  review?: string | null;

  @Prop({ type: String, enum: ["customer", "admin"], default: null })
  cancelledBy?: string | null;

  @Prop({ type: String, default: null })
  cancelledReason?: string | null;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
