import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [RevenueController],
  providers: [RevenueService],
})
export class RevenueModule {}
