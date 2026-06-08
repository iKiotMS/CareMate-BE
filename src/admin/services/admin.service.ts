import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Order, OrderDocument } from '../../orders/schemas/order.schema';
import { Complaint, ComplaintDocument } from '../../complaints/schemas/complaint.schema';
import { OrdersService } from '../../orders/services/orders.service';
import { TasksService } from '../../tasks/services/tasks.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Complaint.name) private complaintModel: Model<ComplaintDocument>,
    private ordersService: OrdersService,
    private tasksService: TasksService,
  ) {}

  // CUSTOMERS
  async listCustomers(search?: string, page: number = 1, limit: number = 10): Promise<any> {
    const query: any = { role: 'customer' };
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
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
    if (!customer || customer.role !== 'customer') {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async lockUnlockCustomer(customerId: string, lock: boolean): Promise<any> {
    const customer = await this.userModel.findById(new Types.ObjectId(customerId));
    if (!customer || customer.role !== 'customer') {
      throw new NotFoundException('Customer not found');
    }
    customer.isActive = !lock;
    return customer.save();
  }

  // CLEANERS
  async listCleaners(search?: string, page: number = 1, limit: number = 10): Promise<any> {
    const query: any = { role: 'cleaner' };
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
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
    if (!cleaner || cleaner.role !== 'cleaner') {
      throw new NotFoundException('Cleaner not found');
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
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const cleaner = new this.userModel({
      email: data.email.toLowerCase(),
      passwordHash,
      role: 'cleaner',
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
    const cleaner = await this.userModel.findById(new Types.ObjectId(cleanerId));
    if (!cleaner || cleaner.role !== 'cleaner') {
      throw new NotFoundException('Cleaner not found');
    }
    if (data.fullName) cleaner.fullName = data.fullName;
    if (data.phone !== undefined) cleaner.phone = data.phone;
    return cleaner.save();
  }

  async lockUnlockCleaner(cleanerId: string, lock: boolean): Promise<any> {
    const cleaner = await this.userModel.findById(new Types.ObjectId(cleanerId));
    if (!cleaner || cleaner.role !== 'cleaner') {
      throw new NotFoundException('Cleaner not found');
    }
    cleaner.isActive = !lock;
    return cleaner.save();
  }

  // ORDERS
  async listOrders(filters?: any, page: number = 1, limit: number = 20): Promise<any> {
    const orders = await this.ordersService.getAllOrders(filters);
    return { orders, page, limit };
  }

  async assignCleanerToOrder(orderId: string, cleanerId: string): Promise<any> {
    const cleaner = await this.userModel.findById(new Types.ObjectId(cleanerId));
    if (!cleaner || cleaner.role !== 'cleaner' || !cleaner.isActive) {
      throw new BadRequestException('Invalid or inactive cleaner');
    }
    return this.ordersService.assignCleaner(orderId, cleanerId);
  }

  async reassignCleanerToOrder(orderId: string, cleanerId: string): Promise<any> {
    const cleaner = await this.userModel.findById(new Types.ObjectId(cleanerId));
    if (!cleaner || cleaner.role !== 'cleaner' || !cleaner.isActive) {
      throw new BadRequestException('Invalid or inactive cleaner');
    }
    return this.ordersService.reassignCleaner(orderId, cleanerId);
  }

  async cancelOrder(orderId: string, reason?: string): Promise<any> {
    return this.ordersService.cancelOrder(orderId, 'admin', reason);
  }

  // TASKS
  async listTasks(): Promise<any> {
    return this.tasksService.getAllTasks(false);
  }

  async createTask(data: {
    name: string;
    slug: string;
    price: number;
    sortOrder?: number;
  }): Promise<any> {
    return this.tasksService.createTask(data as any);
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

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      totalOrders,
      totalCompleted,
      totalCustomers,
      totalCleaners,
      todayRevAgg,
      weekRevAgg,
      monthRevAgg,
      yearRevAgg,
      activeComplaints,
      lowRatingAlerts,
      topCleanersRaw,
    ] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: 'COMPLETED' }),
      this.userModel.countDocuments({ role: 'customer' }),
      this.userModel.countDocuments({ role: 'cleaner' }),
      this.orderModel.aggregate([
        { $match: { status: 'COMPLETED', createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { status: 'COMPLETED', createdAt: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { status: 'COMPLETED', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { status: 'COMPLETED', createdAt: { $gte: yearStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.complaintModel.countDocuments({ status: 'OPEN' }),
      this.orderModel.countDocuments({
        status: 'COMPLETED',
        rating: { $lte: 2, $ne: null },
      }),
      this.orderModel.aggregate([
        { $match: { cleanerId: { $ne: null }, status: 'COMPLETED', rating: { $ne: null } } },
        {
          $group: {
            _id: '$cleanerId',
            averageRating: { $avg: '$rating' },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { averageRating: -1 } },
        { $limit: 3 },
      ]),
    ]);

    const completionRate =
      totalOrders > 0
        ? parseFloat(((totalCompleted / totalOrders) * 100).toFixed(2))
        : 0;

    const ordersByStatus = [
      'PENDING',
      'ON_HOLD_PAYMENT',
      'CONFIRMED',
      'ACCEPTED',
      'IN_PROGRESS',
      'REVIEW_PENDING',
      'COMPLETED',
      'CANCELLED',
    ].map((s) => ({ status: s, count: stats[s] ?? 0 }));

    return {
      revenue: {
        today: todayRevAgg[0]?.total ?? 0,
        thisWeek: weekRevAgg[0]?.total ?? 0,
        thisMonth: monthRevAgg[0]?.total ?? 0,
        thisYear: yearRevAgg[0]?.total ?? 0,
        currency: 'VND',
      },
      totalCustomers,
      totalCleaners,
      totalOrders,
      totalCompleted,
      completionRate,
      ordersByStatus,
      topCleaners: topCleanersRaw,
      activeComplaints,
      lowRatingAlerts,
    };
  }

  // REVIEWS
  async listReviews(
    minRating?: number,
    maxRating?: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<any> {
    const query: any = { rating: { $ne: null } };
    if (minRating !== undefined) query.rating.$gte = minRating;
    if (maxRating !== undefined) query.rating.$lte = maxRating;

    const skip = (page - 1) * limit;
    const [total, orders] = await Promise.all([
      this.orderModel.countDocuments(query),
      this.orderModel
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'fullName')
        .populate('cleanerId', 'fullName')
        .lean(),
    ]);

    const data = orders.map((o: any) => ({
      _id: o._id.toString(),
      orderId: o._id.toString(),
      customerName: o.customerId?.fullName ?? 'Khách hàng',
      cleanerName: o.cleanerId?.fullName ?? 'Nhân viên',
      rating: o.rating,
      comment: o.review ?? null,
      createdAt: o.updatedAt,
    }));

    return { data, total, page, limit };
  }
}
