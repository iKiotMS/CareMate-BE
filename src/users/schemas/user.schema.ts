import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ sparse: true, unique: true, lowercase: true })
  email?: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ enum: ["customer", "cleaner", "admin"], required: true })
  role!: string;

  @Prop({ required: true })
  fullName!: string;

  @Prop({ required: true, unique: true })
  phone!: string;

  @Prop({ type: String, default: null })
  avatarUrl?: string | null;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
