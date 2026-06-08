import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { CustomersService } from './services/customers.service';
import { CustomersController } from './controllers/customers.controller';

@Module({
  imports: [OrdersModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
