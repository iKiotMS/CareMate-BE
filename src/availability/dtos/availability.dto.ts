import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class WorkingHoursDto {
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Use HH:MM format' })
  start!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Use HH:MM format' })
  end!: string;
}

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  daysOff?: string[];
}
