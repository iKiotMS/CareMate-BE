import { Controller, Get, Patch, Param, Body, UseGuards, Req } from "@nestjs/common";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsersService } from "../services/users.service";

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) fullName?: string;
  @IsOptional() @IsString() @MaxLength(20)  phone?: string;
  @IsOptional() @IsString()                 avatarUrl?: string | null;
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

  @Get(":id")
  getUser(@Param("id") id: string) {
    return this.usersService.findById(id);
  }
}
