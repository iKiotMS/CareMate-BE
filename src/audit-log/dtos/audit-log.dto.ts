import { IsEnum, IsOptional, IsMongoId, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum AuditAction {
  ASSIGN_CLEANER = 'ASSIGN_CLEANER',
  REASSIGN_CLEANER = 'REASSIGN_CLEANER',
  CANCEL_ORDER = 'CANCEL_ORDER',
  LOCK_ACCOUNT = 'LOCK_ACCOUNT',
  UNLOCK_ACCOUNT = 'UNLOCK_ACCOUNT',
  CHANGE_TASK_PRICE = 'CHANGE_TASK_PRICE',
  PROCESS_COMPLAINT = 'PROCESS_COMPLAINT',
  UPDATE_PAYMENT_STATUS = 'UPDATE_PAYMENT_STATUS',
}

export class CreateAuditLogPayload {
  actorId!: string;
  actorRole!: 'admin';
  action!: AuditAction;
  targetId!: string;
  targetType!: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

export class AuditLogQueryDto {
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsMongoId()
  actorId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
