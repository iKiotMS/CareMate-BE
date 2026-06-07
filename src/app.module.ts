import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { CleanersModule } from './cleaners/cleaners.module';
import { OrdersModule } from './orders/orders.module';
import { TasksModule } from './tasks/tasks.module';
import { UploadsModule } from './uploads/uploads.module';
import { AdminModule } from './admin/admin.module';
import { CommonModule } from './common/common.module';
import { SeederModule } from './data/seeder.module';
// ── NEW MODULES ──────────────────────────────────────────────────────────────
import { NotificationsModule } from './notifications/notifications.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { PaymentsModule } from './payments/payments.module';
import { IncomeModule } from './income/income.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AvailabilityModule } from './availability/availability.module';
import { RevenueModule } from './revenue/revenue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/cleaning-service',
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
    NotificationsModule,
    ComplaintsModule,
    PaymentsModule,
    IncomeModule,
    AnalyticsModule,
    AuditLogModule,
    AvailabilityModule,
    RevenueModule,
  ],
})
export class AppModule {}
