import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  IsNumber,
} from "class-validator";

export class CreateCleanerDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class UpdateCleanerDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class AssignCleanerDto {
  @IsString()
  cleanerId!: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
