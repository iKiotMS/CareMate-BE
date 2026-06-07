import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { DEPOSIT_AMOUNT } from './deposit.service';

export interface FinalPaymentInfo {
  paymentId: string;
  accountNumber: string;
  bankName: string;
  accountName: string;
  amount: number;
  content: string;
  qrDataUrl: string;
  depositPaid: number;
  originalTotal: number;
  expiresAt: Date;
}

@Injectable()
export class FinalPaymentService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private config: ConfigService,
  ) {}

  async createFinalPayment(
    orderId: string,
    customerId: string,
    totalAmount: number,
  ): Promise<FinalPaymentInfo> {
    const finalAmount = Math.max(0, totalAmount - DEPOSIT_AMOUNT);

    await this.paymentModel.updateMany(
      { orderId: new Types.ObjectId(orderId), type: 'FINAL', status: 'PENDING' },
      { status: 'EXPIRED' },
    );

    const expiredCount = await this.paymentModel.countDocuments({
      orderId: new Types.ObjectId(orderId),
      type: 'FINAL',
      status: 'EXPIRED',
    });

    const suffix = expiredCount > 0 ? `R${expiredCount}` : '';
    const content = `CMFIN${orderId.slice(-8).toUpperCase()}${suffix}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const payment = await this.paymentModel.create({
      orderId: new Types.ObjectId(orderId),
      customerId: new Types.ObjectId(customerId),
      type: 'FINAL',
      amount: finalAmount,
      status: 'PENDING',
      content,
      expiresAt,
    });

    return this.buildInfo(
      (payment as any)._id.toString(),
      finalAmount,
      totalAmount,
      content,
      expiresAt,
    );
  }

  async getFinalPaymentInfo(orderId: string): Promise<FinalPaymentInfo | null> {
    const payment = await this.paymentModel
      .findOne({ orderId: new Types.ObjectId(orderId), type: 'FINAL', status: 'PENDING' })
      .sort({ createdAt: -1 });

    if (!payment) return null;

    const finalAmount = (payment as any).amount;
    const totalAmount = finalAmount + DEPOSIT_AMOUNT;

    return this.buildInfo(
      (payment as any)._id.toString(),
      finalAmount,
      totalAmount,
      (payment as any).content,
      (payment as any).expiresAt,
    );
  }

  private buildInfo(
    paymentId: string,
    finalAmount: number,
    totalAmount: number,
    content: string,
    expiresAt: Date,
  ): FinalPaymentInfo {
    const accountNumber = this.config.get('SEPAY_ACCOUNT_NUMBER') ?? '';
    const bankName = this.config.get('SEPAY_BANK_NAME') ?? '';
    const accountName = this.config.get('SEPAY_ACCOUNT_NAME') ?? '';

    const qrDataUrl =
      `https://img.vietqr.io/image/${bankName}-${accountNumber}-compact2.png` +
      `?amount=${finalAmount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(accountName)}`;

    return {
      paymentId,
      accountNumber,
      bankName,
      accountName,
      amount: finalAmount,
      content,
      qrDataUrl,
      depositPaid: DEPOSIT_AMOUNT,
      originalTotal: totalAmount,
      expiresAt,
    };
  }
}
