import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SeederService } from "./seeder.service";
import {
  TaskCatalog,
  TaskCatalogSchema,
} from "../tasks/schemas/task-catalog.schema";
import { User, UserSchema } from "../users/schemas/user.schema";
import { Order, OrderSchema } from "../orders/schemas/order.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaskCatalog.name, schema: TaskCatalogSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
