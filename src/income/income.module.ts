import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { IncomeService } from './income.service';
import { IncomeController } from './income.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [IncomeController],
  providers: [IncomeService],
})
export class IncomeModule {}
