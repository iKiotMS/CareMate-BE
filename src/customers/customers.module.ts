import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { TasksModule } from "../tasks/tasks.module";
import { CustomersService } from "./services/customers.service";
import { CustomersController } from "./controllers/customers.controller";

@Module({
  imports: [OrdersModule, TasksModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
