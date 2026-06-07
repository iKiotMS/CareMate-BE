import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Complaint, ComplaintDocument } from './schemas/complaint.schema';
import {
  CreateComplaintDto,
  UpdateComplaintStatusDto,
  ReplyComplaintDto,
  ComplaintStatus,
} from './dtos/complaint.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dtos/notification.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/dtos/audit-log.dto';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectModel(Complaint.name)
    private readonly complaintModel: Model<ComplaintDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createComplaint(customerId: string, dto: CreateComplaintDto) {
    const complaint = await this.complaintModel.create({
      customerId: new Types.ObjectId(customerId),
      orderId: new Types.ObjectId(dto.orderId),
      subject: dto.subject,
      description: dto.description,
      evidenceUrls: dto.evidenceUrls ?? [],
      status: ComplaintStatus.OPEN,
      replies: [],
    });

    return complaint;
  }

  async getMyComplaints(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.complaintModel
        .find({ customerId: new Types.ObjectId(customerId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.complaintModel.countDocuments({ customerId: new Types.ObjectId(customerId) }),
    ]);
    return { data, total, page, limit };
  }

  async getMyComplaintById(customerId: string, complaintId: string) {
    const complaint = await this.complaintModel.findById(complaintId).lean();
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.customerId.toString() !== customerId)
      throw new ForbiddenException('Access denied');
    return complaint;
  }

  async getAllComplaints(page = 1, limit = 20, status?: string, category?: string) {
    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = status;
    if (category) filter['category'] = category;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.complaintModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.complaintModel.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async getComplaintById(complaintId: string) {
    const complaint = await this.complaintModel.findById(complaintId).lean();
    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  async countByStatus(status: string): Promise<number> {
    return this.complaintModel.countDocuments({ status });
  }

  async updateComplaintStatus(
    complaintId: string,
    dto: UpdateComplaintStatusDto,
    adminId: string,
  ) {
    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) throw new NotFoundException('Complaint not found');

    const oldStatus = complaint.status;
    complaint.status = dto.status as any;
    if (dto.category) complaint.category = dto.category as any;
    await complaint.save();

    await this.auditLogService.log({
      actorId: adminId,
      actorRole: 'admin',
      action: AuditAction.PROCESS_COMPLAINT,
      targetId: complaintId,
      targetType: 'complaint',
      oldValue: { status: oldStatus },
      newValue: { status: dto.status, category: dto.category },
    });

    return complaint;
  }

  async replyToComplaint(adminId: string, complaintId: string, dto: ReplyComplaintDto) {
    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) throw new NotFoundException('Complaint not found');

    complaint.replies = [
      ...(complaint.replies ?? []),
      {
        authorId: adminId,
        authorRole: 'admin',
        message: dto.message,
        createdAt: new Date(),
      },
    ] as any;
    await complaint.save();

    await this.notificationsService.create({
      recipientId: complaint.customerId.toString(),
      type: NotificationType.COMPLAINT_REPLIED,
      title: 'Complaint Update',
      body: 'An admin has replied to your complaint.',
      referenceId: complaintId,
      referenceType: 'complaint',
    });

    return complaint;
  }
}
