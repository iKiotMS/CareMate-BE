import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
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
}
