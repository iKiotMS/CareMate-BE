import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { CleanersService } from "./services/cleaners.service";
import { CleanersController } from "./controllers/cleaners.controller";

@Module({
  imports: [OrdersModule],
  controllers: [CleanersController],
  providers: [CleanersService],
  exports: [CleanersService],
})
export class CleanersModule {}
