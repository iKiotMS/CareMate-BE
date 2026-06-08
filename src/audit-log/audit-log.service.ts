import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { CreateAuditLogPayload, AuditLogQueryDto } from './dtos/audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(payload: CreateAuditLogPayload): Promise<void> {
    await this.auditLogModel.create({
      ...payload,
      oldValue: payload.oldValue ?? null,
      newValue: payload.newValue ?? null,
    });
  }

  async getAuditLogs(query: AuditLogQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.action) filter['action'] = query.action;
    if (query.actorId) filter['actorId'] = query.actorId;
    if (query.from || query.to) {
      filter['createdAt'] = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(query.to) } : {}),
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auditLogModel.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }
}
