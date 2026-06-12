import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type TaskCatalogDocument = TaskCatalog & Document;

@Schema({ timestamps: true })
export class TaskCatalog {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({ type: String, default: null })
  description?: string | null;

  @Prop({ required: true, default: 0 })
  price!: number;

  @Prop({ required: true, default: 10000 })
  pricePerM2!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  sortOrder?: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TaskCatalogSchema = SchemaFactory.createForClass(TaskCatalog);
