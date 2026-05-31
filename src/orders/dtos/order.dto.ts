import {
  IsString,
  IsDateString,
  IsArray,
  ArrayMinSize,
  IsMongoId,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { Types } from "mongoose";

export class CreateOrderDto {
  @IsDateString()
  scheduledDate!: string;

  @IsString()
  scheduledTime!: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  taskIds!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photosBeforeBooking?: string[];
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
  @IsString()
  reason?: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  status!: string;
}
