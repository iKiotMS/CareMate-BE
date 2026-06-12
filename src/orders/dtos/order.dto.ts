import {
  IsString,
  IsDateString,
  IsArray,
  ArrayMinSize,
  IsMongoId,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsEnum,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  E_WALLET = 'E_WALLET',
}

export class CreateOrderDto {
  @IsDateString()
  scheduledDate!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2} - \d{2}:\d{2}$/, {
    message: 'scheduledTime must be in format HH:MM - HH:MM',
  })
  scheduledTime!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  taskIds!: string[];

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  areaM2!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photosBeforeBooking?: string[];

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignCleanerDto {
  @IsMongoId()
  cleanerId!: string;
}

export class MarkTaskDoneDto {
  @IsMongoId()
  taskCatalogId!: string;
}

export class SubmitReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  status!: string;
}
