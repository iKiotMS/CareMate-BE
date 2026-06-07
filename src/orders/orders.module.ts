import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrdersService } from './services/orders.service';
import { OrdersController } from './controllers/orders.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { TaskCatalog, TaskCatalogSchema } from '../tasks/schemas/task-catalog.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: TaskCatalog.name, schema: TaskCatalogSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
