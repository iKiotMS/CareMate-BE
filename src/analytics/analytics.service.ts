import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getMyRatingAnalytics(cleanerId: string) {
    const orders = await this.orderModel
      .find({
        cleanerId: new Types.ObjectId(cleanerId),
        status: 'COMPLETED',
        rating: { $ne: null },
      })
      .lean();

    if (!orders.length) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    for (const o of orders) {
      if (o.rating) {
        totalRating += o.rating;
        distribution[o.rating] = (distribution[o.rating] ?? 0) + 1;
      }
    }

    return {
      averageRating: parseFloat((totalRating / orders.length).toFixed(2)),
      totalReviews: orders.length,
      distribution,
    };
  }

  async getMyReceivedReviews(cleanerId: string, page: number, limit: number) {
    const filter = {
      cleanerId: new Types.ObjectId(cleanerId),
      status: 'COMPLETED',
      rating: { $ne: null },
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('rating review createdAt scheduledDate customerId')
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async getRatingAnalytics() {
    const result = await this.orderModel.aggregate([
      { $match: { status: 'COMPLETED', rating: { $ne: null } } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);
    const stats = result[0] ?? { averageRating: 0, totalReviews: 0 };
    return {
      averageRating: parseFloat(((stats.averageRating as number) ?? 0).toFixed(2)),
      totalReviews: (stats.totalReviews as number) ?? 0,
      distribution: {
        1: (stats.rating1 as number) ?? 0,
        2: (stats.rating2 as number) ?? 0,
        3: (stats.rating3 as number) ?? 0,
        4: (stats.rating4 as number) ?? 0,
        5: (stats.rating5 as number) ?? 0,
      },
    };
  }

  async getAllCleanerPerformance(
    sortBy: 'rating' | 'completionRate' | 'totalOrders',
    page: number,
    limit: number,
  ) {
    const sortField =
      sortBy === 'rating'
        ? 'averageRating'
        : sortBy === 'completionRate'
          ? 'completionRate'
          : 'totalOrders';
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: { cleanerId: { $ne: null } } },
      {
        $group: {
          _id: '$cleanerId',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
          },
          averageRating: {
            $avg: { $cond: [{ $ne: ['$rating', null] }, '$rating', null] },
          },
        },
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              { $divide: ['$completedOrders', '$totalOrders'] },
              0,
            ],
          },
          averageRating: { $ifNull: ['$averageRating', 0] },
        },
      },
      { $sort: { [sortField]: -1 as -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const result = await (this.orderModel as any).aggregate(pipeline);
    return {
      data: result[0]?.data ?? [],
      total: result[0]?.total[0]?.count ?? 0,
      page,
      limit,
    };
  }
}
