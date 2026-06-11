import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  IsOptional,
  IsString,
  MaxLength,
  IsNotEmpty,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsersService } from "../services/users.service";

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) fullName?: string;
  @IsOptional() @IsString() @MaxLength(20)  phone?: string;
  @IsOptional() @IsString()                 avatarUrl?: string | null;
}

class AddAddressDto {
  @IsOptional() @IsString() @MaxLength(50) label?: string;
  @IsString() @IsNotEmpty() @MaxLength(300) address!: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) setAsDefault?: boolean;
}

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get("me")
  getProfile(@Req() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @Patch("me")
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.update(req.user.sub, dto);
  }

  @Post("me/addresses")
  addAddress(@Req() req: any, @Body() dto: AddAddressDto) {
    return this.usersService.addAddress(
      req.user.sub,
      dto.label ?? "",
      dto.address,
      dto.setAsDefault ?? false,
    );
  }

  @Delete("me/addresses/:addressId")
  deleteAddress(@Req() req: any, @Param("addressId") addressId: string) {
    return this.usersService.deleteAddress(req.user.sub, addressId);
  }

  @Patch("me/addresses/:addressId/default")
  setDefaultAddress(@Req() req: any, @Param("addressId") addressId: string) {
    return this.usersService.setDefaultAddress(req.user.sub, addressId);
  }

  @Get(":id")
  getUser(@Param("id") id: string) {
    return this.usersService.findById(id);
  }
}
