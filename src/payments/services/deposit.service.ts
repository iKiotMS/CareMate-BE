import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentDocument } from '../schemas/payment.schema';

export const DEPOSIT_AMOUNT = 30_000;

export interface DepositInfo {
  paymentId: string;
  accountNumber: string;
  bankName: string;
  accountName: string;
  amount: number;
  content: string;
  qrDataUrl: string;
  expiresAt: Date;
}

@Injectable()
export class DepositService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private config: ConfigService,
  ) {}

  async createDepositPayment(
    orderId: string,
    customerId: string,
    expiresAt: Date,
  ): Promise<DepositInfo> {
    await this.paymentModel.updateMany(
      { orderId: new Types.ObjectId(orderId), type: 'DEPOSIT', status: 'PENDING' },
      { status: 'EXPIRED' },
    );

    const content = `CMDEP${orderId.slice(-8).toUpperCase()}`;

    const payment = await this.paymentModel.create({
      orderId: new Types.ObjectId(orderId),
      customerId: new Types.ObjectId(customerId),
      type: 'DEPOSIT',
      amount: DEPOSIT_AMOUNT,
      status: 'PENDING',
      content,
      expiresAt,
    });

    return this.buildInfo((payment as any)._id.toString(), DEPOSIT_AMOUNT, content, expiresAt);
  }

  async getDepositInfo(orderId: string): Promise<DepositInfo | null> {
    const payment = await this.paymentModel
      .findOne({ orderId: new Types.ObjectId(orderId), type: 'DEPOSIT', status: 'PENDING' })
      .sort({ createdAt: -1 });

    if (!payment) return null;
    if (new Date() > (payment as any).expiresAt) return null;

    return this.buildInfo(
      (payment as any)._id.toString(),
      DEPOSIT_AMOUNT,
      (payment as any).content,
      (payment as any).expiresAt,
    );
  }

  async handleCancellationRefund(orderId: string, cancelledBy: string): Promise<void> {
    const paidDeposit = await this.paymentModel.findOne({
      orderId: new Types.ObjectId(orderId),
      type: 'DEPOSIT',
      status: 'PAID',
    });

    if (!paidDeposit) return;

    (paidDeposit as any).status = 'FAILED';
    (paidDeposit as any).transactionRef =
      `REFUND_NEEDED:${cancelledBy}:${new Date().toISOString()}`;
    await paidDeposit.save();
  }

  private buildInfo(
    paymentId: string,
    amount: number,
    content: string,
    expiresAt: Date,
  ): DepositInfo {
    const accountNumber = this.config.get('SEPAY_ACCOUNT_NUMBER') ?? '';
    const bankName = this.config.get('SEPAY_BANK_NAME') ?? '';
    const accountName = this.config.get('SEPAY_ACCOUNT_NAME') ?? '';

    const qrDataUrl =
      `https://img.vietqr.io/image/${bankName}-${accountNumber}-compact2.png` +
      `?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(accountName)}`;

    return { paymentId, accountNumber, bankName, accountName, amount, content, qrDataUrl, expiresAt };
  }
}
