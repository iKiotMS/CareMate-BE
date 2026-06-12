import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserDocument = User & Document;

@Schema({ _id: true })
export class UserAddress {
  @Prop({ default: "" })
  label!: string;

  @Prop({ required: true })
  address!: string;

  @Prop({ default: false })
  isDefault!: boolean;
}

export const UserAddressSchema = SchemaFactory.createForClass(UserAddress);

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, sparse: true, lowercase: true })
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

  @Prop({ type: [UserAddressSchema], default: [] })
  addresses!: UserAddress[];

  @Prop({ default: true })
  isActive!: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
