import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "../schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    return this.userModel.create(userData);
  }

  async update(
    id: string,
    updateData: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async findAll(filter?: any, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const data = await this.userModel
      .find(filter || {})
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.userModel.countDocuments(filter || {});
    return { data, total, page, limit };
  }

  async addAddress(
    userId: string,
    label: string,
    address: string,
    setAsDefault: boolean,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    const addresses: any[] = (user as any).addresses ?? [];

    if (setAsDefault || addresses.length === 0) {
      addresses.forEach((a: any) => (a.isDefault = false));
    }

    addresses.push({
      _id: new Types.ObjectId(),
      label,
      address,
      isDefault: setAsDefault || addresses.length === 0,
    });

    (user as any).addresses = addresses;
    return user.save();
  }

  async deleteAddress(userId: string, addressId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    const addresses: any[] = (user as any).addresses ?? [];
    const idx = addresses.findIndex((a: any) => a._id.toString() === addressId);
    if (idx === -1) throw new NotFoundException("Address not found");

    const wasDefault = addresses[idx].isDefault;
    addresses.splice(idx, 1);

    if (wasDefault && addresses.length > 0) {
      addresses[0].isDefault = true;
    }

    (user as any).addresses = addresses;
    return user.save();
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    const addresses: any[] = (user as any).addresses ?? [];
    const target = addresses.find((a: any) => a._id.toString() === addressId);
    if (!target) throw new NotFoundException("Address not found");

    addresses.forEach((a: any) => (a.isDefault = a._id.toString() === addressId));
    (user as any).addresses = addresses;
    return user.save();
  }
}
