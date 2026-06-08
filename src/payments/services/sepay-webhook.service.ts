import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Payment, PaymentDocument } from '../schemas/payment.schema';

export interface SepayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  content: string;
  transferType: 'in' | 'out';
  transferAmount: number;
  accumulated: number;
  referenceCode: string;
  description: string;
  checksum?: string;
}

@Injectable()
export class SepayWebhookService {
  private readonly logger = new Logger(SepayWebhookService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private config: ConfigService,
  ) {}

  verifyChecksum(payload: SepayWebhookPayload): boolean {
    const secret = this.config.get<string>('SEPAY_WEBHOOK_SECRET');
    if (!secret || !payload.checksum) return true;

    const raw = [
      payload.id,
      payload.gateway,
      payload.transactionDate,
      payload.accountNumber,
      payload.transferAmount,
      payload.transferType,
      payload.content,
      secret,
    ].join('');

    const expected = crypto.createHash('md5').update(raw).digest('hex');
    return expected === payload.checksum;
  }

  async handleWebhook(
    payload: SepayWebhookPayload,
    onDepositPaid: (orderId: string) => Promise<void>,
    onFinalPaid: (orderId: string) => Promise<void>,
  ): Promise<{ success: boolean; message: string }> {
    if (payload.transferType !== 'in') {
      return { success: true, message: 'Outgoing transaction ignored' };
    }

    // Idempotency — skip already processed reference codes
    if (payload.referenceCode) {
      const duplicate = await this.paymentModel.findOne({
        transactionRef: payload.referenceCode,
        status: 'PAID',
      });
      if (duplicate) return { success: true, message: 'Already processed' };
    }

    // Match payment by content (SePay may append extra text)
    const payments = await this.paymentModel.find({ status: 'PENDING' });
    const matched = payments.find((p) =>
      payload.content.toUpperCase().includes((p as any).content.toUpperCase()),
    );

    if (!matched) {
      this.logger.warn('SePay webhook: no matching payment', { content: payload.content });
      return { success: true, message: 'No matching payment found' };
    }

    const expectedAmount = (matched as any).amount;
    if (payload.transferAmount < expectedAmount - 1000) {
      this.logger.warn('SePay webhook: insufficient amount', {
        expected: expectedAmount,
        received: payload.transferAmount,
      });
      return { success: true, message: 'Amount insufficient' };
    }

    (matched as any).status = 'PAID';
    (matched as any).transactionRef = payload.referenceCode || String(payload.id);
    (matched as any).sePayTransactionId = payload.id;
    (matched as any).paidAt = new Date();
    await matched.save();

    const orderId = (matched as any).orderId.toString();
    const type = (matched as any).type;

    this.logger.log(`Payment confirmed: ${type} for order ${orderId}`, {
      amount: payload.transferAmount,
    });

    if (type === 'DEPOSIT') {
      await onDepositPaid(orderId);
    } else if (type === 'FINAL') {
      await onFinalPaid(orderId);
    }

    return { success: true, message: `${type} payment confirmed` };
  }
}
