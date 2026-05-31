import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import { LoggerModule } from "nestjs-pino";
import { UsersModule } from "./users/users.module";
import { CustomersModule } from "./customers/customers.module";
import { CleanersModule } from "./cleaners/cleaners.module";
import { OrdersModule } from "./orders/orders.module";
import { TasksModule } from "./tasks/tasks.module";
import { UploadsModule } from "./uploads/uploads.module";
import { AdminModule } from "./admin/admin.module";
import { CommonModule } from "./common/common.module";
import { SeederModule } from "./data/seeder.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017/cleaning-service",
    ),
    LoggerModule.forRoot(),
    AuthModule,
    UsersModule,
    CustomersModule,
    CleanersModule,
    OrdersModule,
    TasksModule,
    UploadsModule,
    AdminModule,
    CommonModule,
    SeederModule,
  ],
})
export class AppModule {}
