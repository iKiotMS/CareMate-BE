import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class RevenueService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  private async sumRevenue(filter: Record<string, unknown>): Promise<number> {
    const result = await this.orderModel.aggregate([
      { $match: { status: 'COMPLETED', ...filter } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async getRevenueDashboard() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [today, thisWeek, thisMonth, thisYear] = await Promise.all([
      this.sumRevenue({ createdAt: { $gte: todayStart } }),
      this.sumRevenue({ createdAt: { $gte: weekStart } }),
      this.sumRevenue({ createdAt: { $gte: monthStart } }),
      this.sumRevenue({ createdAt: { $gte: yearStart } }),
    ]);

    return { revenue: { today, thisWeek, thisMonth, thisYear, currency: 'VND' } };
  }

  async getRevenueByPeriod(from?: string, to?: string) {
    const filter: Record<string, unknown> = {};
    if (from || to) {
      filter['createdAt'] = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    const result = await this.orderModel.aggregate([
      { $match: { status: 'COMPLETED', ...filter } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
    return { data: result, currency: 'VND' };
  }

  async getOrderStats(from?: string, to?: string) {
    const filter: Record<string, unknown> = {};
    if (from || to) {
      filter['createdAt'] = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    const result = await this.orderModel.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return result.reduce(
      (acc: Record<string, number>, r: any) => ({ ...acc, [r._id]: r.count }),
      {},
    );
  }
}
