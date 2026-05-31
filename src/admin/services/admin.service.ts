import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "../../users/schemas/user.schema";
import { OrdersService } from "../../orders/services/orders.service";
import { TasksService } from "../../tasks/services/tasks.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private ordersService: OrdersService,
    private tasksService: TasksService,
  ) {}

  // CUSTOMERS
  async listCustomers(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    const query: any = { role: "customer" };
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }
    const total = await this.userModel.countDocuments(query);
    const customers = await this.userModel
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { customers, total, page, limit };
  }

  async getCustomerDetail(customerId: string): Promise<any> {
    const customer = await this.userModel
      .findById(new Types.ObjectId(customerId))
      .lean();
    if (!customer || customer.role !== "customer") {
      throw new NotFoundException("Customer not found");
    }
    return customer;
  }

  async lockUnlockCustomer(customerId: string, lock: boolean): Promise<any> {
    const customer = await this.userModel.findById(
      new Types.ObjectId(customerId),
    );
    if (!customer || customer.role !== "customer") {
      throw new NotFoundException("Customer not found");
    }
    customer.isActive = !lock;
    return customer.save();
  }

  // CLEANERS
  async listCleaners(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    const query: any = { role: "cleaner" };
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }
    const total = await this.userModel.countDocuments(query);
    const cleaners = await this.userModel
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { cleaners, total, page, limit };
  }

  async getCleanerDetail(cleanerId: string): Promise<any> {
    const cleaner = await this.userModel
      .findById(new Types.ObjectId(cleanerId))
      .lean();
    if (!cleaner || cleaner.role !== "cleaner") {
      throw new NotFoundException("Cleaner not found");
    }
    return cleaner;
  }

  async createCleaner(data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<any> {
    const existingUser = await this.userModel.findOne({
      email: data.email.toLowerCase(),
    });
    if (existingUser) {
      throw new BadRequestException("Email already in use");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const cleaner = new this.userModel({
      email: data.email.toLowerCase(),
      passwordHash,
      role: "cleaner",
      fullName: data.fullName,
      phone: data.phone || null,
      isActive: true,
    });
    return cleaner.save();
  }

  async updateCleaner(
    cleanerId: string,
    data: { fullName?: string; phone?: string },
  ): Promise<any> {
    const cleaner = await this.userModel.findById(
      new Types.ObjectId(cleanerId),
    );
    if (!cleaner || cleaner.role !== "cleaner") {
      throw new NotFoundException("Cleaner not found");
    }
    if (data.fullName) cleaner.fullName = data.fullName;
    if (data.phone !== undefined) cleaner.phone = data.phone;
    return cleaner.save();
  }

  async lockUnlockCleaner(cleanerId: string, lock: boolean): Promise<any> {
    const cleaner = await this.userModel.findById(
      new Types.ObjectId(cleanerId),
    );
    if (!cleaner || cleaner.role !== "cleaner") {
      throw new NotFoundException("Cleaner not found");
    }
    cleaner.isActive = !lock;
    return cleaner.save();
  }

  // ORDERS
  async listOrders(
    filters?: any,
    page: number = 1,
    limit: number = 20,
  ): Promise<any> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.cleanerId)
      query.cleanerId = new Types.ObjectId(filters.cleanerId);
    if (filters?.customerId)
      query.customerId = new Types.ObjectId(filters.customerId);
    if (filters?.startDate || filters?.endDate) {
      query.scheduledDate = {};
      if (filters.startDate)
        query.scheduledDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.scheduledDate.$lte = new Date(filters.endDate);
    }

    const orders = await this.ordersService.getAllOrders(filters);
    return { orders, page, limit };
  }

  async assignCleanerToOrder(orderId: string, cleanerId: string): Promise<any> {
    // Verify cleaner exists and is active
    const cleaner = await this.userModel.findById(
      new Types.ObjectId(cleanerId),
    );
    if (!cleaner || cleaner.role !== "cleaner" || !cleaner.isActive) {
      throw new BadRequestException("Invalid or inactive cleaner");
    }
    return this.ordersService.assignCleaner(orderId, cleanerId);
  }

  async reassignCleanerToOrder(
    orderId: string,
    cleanerId: string,
  ): Promise<any> {
    const cleaner = await this.userModel.findById(
      new Types.ObjectId(cleanerId),
    );
    if (!cleaner || cleaner.role !== "cleaner" || !cleaner.isActive) {
      throw new BadRequestException("Invalid or inactive cleaner");
    }
    return this.ordersService.reassignCleaner(orderId, cleanerId);
  }

  async cancelOrder(orderId: string, reason?: string): Promise<any> {
    return this.ordersService.cancelOrder(orderId, "admin", reason);
  }

  // TASKS
  async listTasks(): Promise<any> {
    return this.tasksService.getAllTasks(false);
  }

  async createTask(data: {
    name: string;
    slug: string;
    sortOrder?: number;
  }): Promise<any> {
    return this.tasksService.createTask(data);
  }

  async updateTask(taskId: string, data: any): Promise<any> {
    return this.tasksService.updateTask(taskId, data);
  }

  async toggleTaskActive(taskId: string): Promise<any> {
    return this.tasksService.toggleTaskActive(taskId);
  }

  // DASHBOARD
  async getDashboardStats(): Promise<any> {
    const stats = await this.ordersService.getDashboardStats();
    const totalCustomers = await this.userModel.countDocuments({
      role: "customer",
    });
    const totalCleaners = await this.userModel.countDocuments({
      role: "cleaner",
    });

    return {
      ...stats,
      totalCustomers,
      totalCleaners,
    };
  }
}
