import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DepositService } from './services/deposit.service';
import { FinalPaymentService } from './services/final-payment.service';
import { SepayWebhookService } from './services/sepay-webhook.service';
import { PaymentExpiryTask } from './tasks/payment-expiry.task';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    AuditLogModule,
    NotificationsModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    DepositService,
    FinalPaymentService,
    SepayWebhookService,
    PaymentExpiryTask,
  ],
  exports: [DepositService, FinalPaymentService, SepayWebhookService],
})
export class PaymentsModule {}
