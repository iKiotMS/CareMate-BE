import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "../users/schemas/user.schema";
import { OrdersModule } from "../orders/orders.module";
import { TasksModule } from "../tasks/tasks.module";
import { AdminService } from "./services/admin.service";
import { AdminController } from "./controllers/admin.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    OrdersModule,
    TasksModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
