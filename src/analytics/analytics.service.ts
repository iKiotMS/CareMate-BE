import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

/** Chuyển distribution object {1:n,...} thành array [{stars, count, percentage}] */
function buildDistributionArray(
  counts: Record<number, number>,
  total: number,
): { stars: number; count: number; percentage: number }[] {
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = counts[stars] ?? 0;
    return {
      stars,
      count,
      percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
    };
  });
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  // ─── Cleaner: rating analytics ───────────────────────────────────────────────
  async getMyRatingAnalytics(cleanerId: string) {
    const orders = await this.orderModel
      .find({
        cleanerId: new Types.ObjectId(cleanerId),
        rating: { $ne: null },
      })
      .lean();

    if (!orders.length) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: buildDistributionArray({}, 0),
      };
    }

    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    for (const o of orders) {
      if (o.rating) {
        totalRating += o.rating;
        counts[o.rating] = (counts[o.rating] ?? 0) + 1;
      }
    }

    return {
      averageRating: parseFloat((totalRating / orders.length).toFixed(2)),
      totalReviews: orders.length,
      distribution: buildDistributionArray(counts, orders.length),
    };
  }

  // ─── Cleaner: received reviews ───────────────────────────────────────────────
  async getMyReceivedReviews(cleanerId: string, page: number, limit: number) {
    const filter = {
      cleanerId: new Types.ObjectId(cleanerId),
      rating: { $ne: null },
    };
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);

    // Lookup customer names in one query
    const customerIds = orders.map((o) => o.customerId).filter(Boolean);
    const customers = await this.userModel
      .find({ _id: { $in: customerIds } })
      .select('_id fullName')
      .lean();
    const customerMap = new Map(customers.map((c) => [c._id.toString(), c.fullName]));

    const data = orders.map((o) => ({
      _id: o._id.toString(),
      orderId: o._id.toString(),
      customerName: customerMap.get(o.customerId?.toString() ?? '') ?? 'Khách hàng',
      rating: o.rating,
      comment: o.review ?? null,
      createdAt: o.updatedAt ?? o.createdAt,
    }));

    return { data, total, page, limit };
  }

  // ─── Admin: rating analytics ─────────────────────────────────────────────────
  async getRatingAnalytics() {
    const [agg, lowRatingOrders] = await Promise.all([
      this.orderModel.aggregate([
        { $match: { rating: { $ne: null } } },
        {
          $group: {
            _id: null,
            overallAverage: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          },
        },
      ]),
      // Cleaners whose average rating on last 10 orders ≤ 2
      this.orderModel.aggregate([
        { $match: { cleanerId: { $ne: null }, rating: { $ne: null } } },
        { $sort: { updatedAt: -1 } },
        { $group: { _id: '$cleanerId', recentRating: { $avg: '$rating' }, lastOrderId: { $first: '$_id' } } },
        { $match: { recentRating: { $lte: 2 } } },
      ]),
    ]);

    const stats = agg[0] ?? { overallAverage: 0, totalReviews: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 };
    const totalReviews: number = stats.totalReviews ?? 0;
    const counts = { 1: stats.r1, 2: stats.r2, 3: stats.r3, 4: stats.r4, 5: stats.r5 };

    // Lookup cleaner names for alerts
    const alertCleanerIds = lowRatingOrders.map((a: any) => a._id);
    const alertCleaners = await this.userModel
      .find({ _id: { $in: alertCleanerIds } })
      .select('_id fullName')
      .lean();
    const nameMap = new Map(alertCleaners.map((c) => [c._id.toString(), c.fullName]));

    const lowRatingAlerts = lowRatingOrders.map((a: any) => ({
      cleanerId: a._id.toString(),
      cleanerName: nameMap.get(a._id.toString()) ?? 'Nhân viên',
      recentRating: parseFloat((a.recentRating as number).toFixed(1)),
      orderId: a.lastOrderId?.toString(),
    }));

    return {
      overallAverage: parseFloat(((stats.overallAverage as number) ?? 0).toFixed(2)),
      totalReviews,
      distribution: buildDistributionArray(counts, totalReviews),
      lowRatingAlerts,
    };
  }

  // ─── Admin: all cleaner performance ──────────────────────────────────────────
  async getAllCleanerPerformance(
    sortBy: 'rating' | 'completionRate' | 'totalOrders',
    page: number,
    limit: number,
  ) {
    const sortField =
      sortBy === 'rating' ? 'averageRating' : sortBy === 'completionRate' ? 'completionRate' : 'totalOrders';
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $match: { cleanerId: { $ne: null } } },
      {
        $group: {
          _id: '$cleanerId',
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
          totalReviews: { $sum: { $cond: [{ $ne: ['$rating', null] }, 1, 0] } },
          averageRating: { $avg: { $cond: [{ $ne: ['$rating', null] }, '$rating', null] } },
        },
      },
      {
        $addFields: {
          // completionRate as 0-100 percentage
          completionRate: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              { $multiply: [{ $divide: ['$completedOrders', '$totalOrders'] }, 100] },
              0,
            ],
          },
          cancellationRate: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              { $multiply: [{ $divide: ['$cancelledOrders', '$totalOrders'] }, 100] },
              0,
            ],
          },
          averageRating: { $ifNull: ['$averageRating', 0] },
        },
      },
      { $sort: { [sortField]: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const result = await this.orderModel.aggregate(pipeline);
    const rows: any[] = result[0]?.data ?? [];

    // Lookup cleaner names
    const cleanerIds = rows.map((r) => r._id);
    const cleaners = await this.userModel
      .find({ _id: { $in: cleanerIds } })
      .select('_id fullName avatarUrl')
      .lean();
    const cleanerMap = new Map(cleaners.map((c) => [c._id.toString(), c]));

    const data = rows.map((r) => {
      const cleaner = cleanerMap.get(r._id.toString());
      return {
        cleanerId: r._id.toString(),
        cleanerName: cleaner?.fullName ?? 'Nhân viên',
        avatarUrl: cleaner?.avatarUrl ?? null,
        totalOrders: r.totalOrders,
        completedOrders: r.completedOrders,
        cancelledOrders: r.cancelledOrders,
        completionRate: parseFloat((r.completionRate as number).toFixed(1)),
        cancellationRate: parseFloat((r.cancellationRate as number).toFixed(1)),
        averageRating: parseFloat((r.averageRating as number).toFixed(2)),
        totalReviews: r.totalReviews,
      };
    });

    return {
      data,
      total: result[0]?.total[0]?.count ?? 0,
      page,
      limit,
    };
  }
}
