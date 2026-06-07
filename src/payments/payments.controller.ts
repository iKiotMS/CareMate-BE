import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaymentsService } from './payments.service';
import { UpdatePaymentStatusDto, PaymentQueryDto } from './dtos/payment.dto';
import { DepositService } from './services/deposit.service';
import { FinalPaymentService } from './services/final-payment.service';
import { SepayWebhookService, SepayWebhookPayload } from './services/sepay-webhook.service';
import { OrdersService } from '../orders/services/orders.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly depositService: DepositService,
    private readonly finalPaymentService: FinalPaymentService,
    private readonly sepayWebhookService: SepayWebhookService,
    private readonly ordersService: OrdersService,
  ) {}

  // ─── Admin routes ──────────────────────────────────────────────────────────

  @Get('admin/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getAllTransactions(@Query() query: PaymentQueryDto) {
    return this.paymentsService.getAllTransactions(query);
  }

  @Get('admin/payments/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getPaymentStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.paymentsService.getPaymentStats(from, to);
  }

  @Patch('admin/payments/:orderId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updatePaymentStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdatePaymentStatusDto,
    @Req() req: any,
  ) {
    return this.paymentsService.updatePaymentStatus(orderId, dto, req.user.sub);
  }

  // ─── Payment info routes ───────────────────────────────────────────────────

  @Get('payments/orders/:orderId/deposit-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'admin')
  getDepositInfo(@Param('orderId') orderId: string) {
    return this.depositService.getDepositInfo(orderId);
  }

  @Get('payments/orders/:orderId/final-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'admin')
  getFinalPaymentInfo(@Param('orderId') orderId: string) {
    return this.finalPaymentService.getFinalPaymentInfo(orderId);
  }

  // ─── SePay webhook (public — verified via checksum) ───────────────────────

  @Post('payments/sepay-webhook')
  async handleSepayWebhook(@Body() body: SepayWebhookPayload) {
    if (!this.sepayWebhookService.verifyChecksum(body)) {
      throw new BadRequestException('Invalid webhook checksum');
    }

    return this.sepayWebhookService.handleWebhook(
      body,
      (orderId) => this.ordersService.confirmAfterDeposit(orderId),
      (orderId) => this.ordersService.completeAfterFinalPayment(orderId),
    );
  }
}
