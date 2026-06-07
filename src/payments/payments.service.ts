import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { UpdatePaymentStatusDto, PaymentQueryDto } from './dtos/payment.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/dtos/audit-log.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getAllTransactions(query: PaymentQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter['paymentStatus'] = query.status;
    if (query.method) filter['paymentMethod'] = query.method;
    if (query.from || query.to) {
      filter['createdAt'] = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(query.to) } : {}),
      };
    }
    return this.orderModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getPaymentStats(from?: string, to?: string) {
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter['$gte'] = new Date(from);
    if (to) dateFilter['$lte'] = new Date(to);

    const matchFilter: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length) matchFilter['createdAt'] = dateFilter;

    const [revenueAgg, paidCount, unpaidCount, refundedCount] = await Promise.all([
      this.orderModel.aggregate([
        { $match: { ...matchFilter, paymentStatus: 'PAID' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.orderModel.countDocuments({ ...matchFilter, paymentStatus: 'PAID' }),
      this.orderModel.countDocuments({ ...matchFilter, paymentStatus: 'UNPAID' }),
      this.orderModel.countDocuments({ ...matchFilter, paymentStatus: 'REFUNDED' }),
    ]);

    return {
      totalRevenue: revenueAgg[0]?.total ?? 0,
      currency: 'VND',
      paidOrders: paidCount,
      unpaidOrders: unpaidCount,
      refundedOrders: refundedCount,
    };
  }

  async updatePaymentStatus(orderId: string, dto: UpdatePaymentStatusDto, adminId: string) {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException('Order not found');

    const oldStatus = (order as any).paymentStatus;
    (order as any).paymentStatus = dto.status;
    if (dto.transactionRef) (order as any).transactionRef = dto.transactionRef;
    if (dto.note) (order as any).paymentNote = dto.note;
    await order.save();

    await this.auditLogService.log({
      actorId: adminId,
      actorRole: 'admin',
      action: AuditAction.UPDATE_PAYMENT_STATUS,
      targetId: orderId,
      targetType: 'order',
      oldValue: { paymentStatus: oldStatus },
      newValue: { paymentStatus: dto.status },
    });

    return order;
  }
}
