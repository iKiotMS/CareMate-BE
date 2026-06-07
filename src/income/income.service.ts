import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

const CLEANER_SHARE = 0.7;

@Injectable()
export class IncomeService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  private buildDateFilter(period: string): Record<string, unknown> {
    const now = new Date();
    if (period === 'daily') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { createdAt: { $gte: start } };
    }
    if (period === 'weekly') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return { createdAt: { $gte: start } };
    }
    if (period === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { createdAt: { $gte: start } };
    }
    return {};
  }

  async getMyIncomeSummary(cleanerId: string, period: string) {
    const dateFilter = this.buildDateFilter(period);
    const orders = await this.orderModel
      .find({
        cleanerId: new Types.ObjectId(cleanerId),
        status: 'COMPLETED',
        ...dateFilter,
      })
      .lean();

    const totalOrders = orders.length;
    const grossEarnings = orders.reduce((sum, o) => sum + ((o as any).totalAmount ?? 0), 0);
    const netEarnings = Math.round(grossEarnings * CLEANER_SHARE);

    return { totalOrders, grossEarnings, netEarnings, currency: 'VND', period };
  }

  async getMyIncomeByOrder(
    cleanerId: string,
    opts: { from?: string; to?: string; page: number; limit: number },
  ) {
    const filter: Record<string, unknown> = {
      cleanerId: new Types.ObjectId(cleanerId),
      status: 'COMPLETED',
    };
    if (opts.from || opts.to) {
      filter['createdAt'] = {
        ...(opts.from ? { $gte: new Date(opts.from) } : {}),
        ...(opts.to ? { $lte: new Date(opts.to) } : {}),
      };
    }
    const skip = (opts.page - 1) * opts.limit;
    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(opts.limit)
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);

    const data = orders.map((o: any) => ({
      orderId: o._id,
      scheduledDate: o.scheduledDate,
      totalAmount: o.totalAmount ?? 0,
      cleanerEarning: Math.round((o.totalAmount ?? 0) * CLEANER_SHARE),
    }));

    return { data, total, page: opts.page, limit: opts.limit };
  }

  async getAllCleanersSalaryStats(period: 'weekly' | 'monthly') {
    const dateFilter = this.buildDateFilter(period);
    const result = await this.orderModel.aggregate([
      { $match: { status: 'COMPLETED', ...dateFilter } },
      {
        $group: {
          _id: '$cleanerId',
          totalOrders: { $sum: 1 },
          grossEarnings: { $sum: '$totalAmount' },
        },
      },
      { $sort: { grossEarnings: -1 } },
    ]);

    return result.map((r) => ({
      cleanerId: r._id,
      totalOrders: r.totalOrders,
      grossEarnings: r.grossEarnings ?? 0,
      netEarnings: Math.round((r.grossEarnings ?? 0) * CLEANER_SHARE),
    }));
  }

  async getSystemCommissionTotal(from?: string, to?: string) {
    const filter: Record<string, unknown> = { status: 'COMPLETED' };
    if (from || to) {
      filter['createdAt'] = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    const result = await this.orderModel.aggregate([
      { $match: filter },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = result[0]?.totalRevenue ?? 0;
    return {
      totalRevenue,
      systemCommission: Math.round(totalRevenue * (1 - CLEANER_SHARE)),
      currency: 'VND',
    };
  }
}
