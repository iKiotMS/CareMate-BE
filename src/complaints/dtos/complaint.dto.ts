import {
  IsMongoId,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUrl,
  MaxLength,
  IsEnum,
} from 'class-validator';

export enum ComplaintStatus {
  OPEN = 'OPEN',
  PROCESSING = 'PROCESSING',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum ComplaintCategory {
  SERVICE_QUALITY = 'SERVICE_QUALITY',
  CLEANER_BEHAVIOR = 'CLEANER_BEHAVIOR',
  LATE_ARRIVAL = 'LATE_ARRIVAL',
  DAMAGE = 'DAMAGE',
  OTHER = 'OTHER',
}

export class CreateComplaintDto {
  @IsMongoId()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidenceUrls?: string[];
}

export class UpdateComplaintStatusDto {
  @IsEnum(ComplaintStatus)
  status!: ComplaintStatus;

  @IsOptional()
  @IsEnum(ComplaintCategory)
  category?: ComplaintCategory;
}

export class ReplyComplaintDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}
