import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post("login")
  async login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Post("refresh")
  async refresh(@Body() body: any) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post("forgot-password")
  async forgotPassword(@Body() body: any) {
    return this.authService.forgotPassword(body.email);
  }
}
