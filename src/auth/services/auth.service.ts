import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../../users/services/users.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: any) {
    const existingUser = await this.usersService.findByPhone(registerDto.phone);
    if (existingUser) {
      throw new BadRequestException("Số điện thoại đã được đăng ký");
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      fullName: registerDto.fullName,
      phone: registerDto.phone,
      role: "customer",
      isActive: true,
    });

    return { message: "Registration successful", userId: user._id };
  }

  async login(loginDto: any) {
    const user = await this.usersService.findByPhone(loginDto.phone);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = this.jwtService.sign(
      { sub: user._id, role: user.role, phone: user.phone },
      { expiresIn: process.env.JWT_ACCESS_EXPIRATION || "15m" },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user._id, role: user.role },
      { expiresIn: process.env.JWT_REFRESH_EXPIRATION || "7d" },
    );

    return { accessToken, refreshToken, user };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const accessToken = this.jwtService.sign(
        { sub: payload.sub, role: payload.role },
        { expiresIn: process.env.JWT_ACCESS_EXPIRATION || "15m" },
      );
      return { accessToken };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: "If email exists, reset link has been sent" };
    }

    // TODO: Send reset link via email
    return { message: "If email exists, reset link has been sent" };
  }
}
