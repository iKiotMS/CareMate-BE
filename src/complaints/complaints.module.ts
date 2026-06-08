import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Complaint, ComplaintSchema } from './schemas/complaint.schema';
import { ComplaintsService } from './complaints.service';
import { ComplaintsController } from './complaints.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Complaint.name, schema: ComplaintSchema },
    ]),
    NotificationsModule,
    AuditLogModule,
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
