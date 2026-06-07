import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Payment, PaymentDocument } from "../schemas/payment.schema";
import { Order, OrderDocument } from "../../orders/schemas/order.schema";
import { NotificationsService } from "../../notifications/notifications.service";
import { NotificationType } from "../../notifications/dtos/notification.dto";

@Injectable()
export class PaymentExpiryTask {
  private readonly logger = new Logger(PaymentExpiryTask.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredPayments(): Promise<void> {
    const now = new Date();
    const expired = await this.paymentModel.find({
      status: "PENDING",
      expiresAt: { $lt: now },
    });

    if (expired.length === 0) return;
    this.logger.log(`Processing ${expired.length} expired payments`);

    for (const payment of expired) {
      try {
        await this.processExpired(payment);
      } catch (err) {
        this.logger.error(
          `Failed to process expired payment ${payment._id}`,
          err,
        );
      }
    }
  }

  private async processExpired(payment: PaymentDocument): Promise<void> {
    const type = (payment as any).type as string;
    const orderId = (payment as any).orderId;

    (payment as any).status = "EXPIRED";
    await payment.save();

    const order = await this.orderModel.findById(orderId);
    if (!order) return;

    if (type === "DEPOSIT") {
      if (order.status !== "ON_HOLD_PAYMENT") return;

      const pendingCleanerId = (order as any).pendingCleanerId;
      order.status = "CANCELLED";
      (order as any).cancelledBy = "system";
      (order as any).cancelledReason = "Deposit payment expired";
      (order as any).pendingCleanerId = null;
      await order.save();

      this.logger.log(`Order ${orderId} auto-cancelled — deposit expired`);

      await this.notificationsService.create({
        recipientId: order.customerId.toString(),
        type: NotificationType.PAYMENT_EXPIRED,
        title: "Đơn hàng đã bị huỷ",
        body: "Thời gian đặt cọc đã hết. Bạn có thể đặt lại đơn bất kỳ lúc nào.",
        referenceId: orderId.toString(),
        referenceType: "order",
      });

      if (pendingCleanerId) {
        await this.notificationsService.create({
          recipientId: pendingCleanerId.toString(),
          type: NotificationType.ORDER_CANCELLED,
          title: "Đơn đã bị huỷ",
          body: "Khách hàng chưa hoàn tất đặt cọc trong thời gian quy định.",
          referenceId: orderId.toString(),
          referenceType: "order",
        });
      }
    } else if (type === "FINAL") {
      if (order.status !== "PAYMENT_PENDING") return;

      const expiredCount = await this.paymentModel.countDocuments({
        orderId,
        type: "FINAL",
        status: "EXPIRED",
      });

      if (expiredCount <= 3) {
        const suffix = `R${expiredCount}`;
        const newContent = `CMFIN${orderId.toString().slice(-8).toUpperCase()}${suffix}`;
        const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await this.paymentModel.create({
          orderId,
          customerId: order.customerId,
          type: "FINAL",
          amount: (payment as any).amount,
          status: "PENDING",
          content: newContent,
          expiresAt: newExpiresAt,
        });

        await this.notificationsService.create({
          recipientId: order.customerId.toString(),
          type: NotificationType.FINAL_PAYMENT_REQUIRED,
          title: "Nhắc nhở: Thanh toán phần còn lại",
          body: `Vui lòng hoàn tất thanh toán ${(payment as any).amount} ₫ trong vòng 24 giờ.`,
          referenceId: orderId.toString(),
          referenceType: "order",
        });
      } else {
        this.logger.warn(
          `Order ${orderId} has ${expiredCount} expired final payments — needs admin review`,
        );
      }
    }
  }
}
