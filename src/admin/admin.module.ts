import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Complaint, ComplaintSchema } from '../complaints/schemas/complaint.schema';
import { OrdersModule } from '../orders/orders.module';
import { TasksModule } from '../tasks/tasks.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { AdminService } from './services/admin.service';
import { AdminController } from './controllers/admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Complaint.name, schema: ComplaintSchema },
    ]),
    OrdersModule,
    TasksModule,
    ComplaintsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
