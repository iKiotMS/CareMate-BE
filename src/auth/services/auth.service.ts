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
    console.log(`[AUTH] Register attempt - phone: ${registerDto.phone}, email: ${registerDto.email}`);
    const existingUser = await this.usersService.findByPhone(registerDto.phone);
    if (existingUser) {
      console.log(`[AUTH] Phone already exists: ${registerDto.phone}`);
      throw new BadRequestException("Số điện thoại đã được đăng ký");
    }

    console.log(`[AUTH] Hashing password...`);
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    console.log(`[AUTH] Creating user: ${registerDto.fullName}`);
    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      fullName: registerDto.fullName,
      phone: registerDto.phone,
      role: "customer",
      isActive: true,
    });

    console.log(`[AUTH] User created successfully: ${user._id}`);
    return { message: "Registration successful", userId: user._id };
  }

  async login(loginDto: any) {
    console.log(`[AUTH] Login attempt - phone: ${loginDto.phone}`);

    const user = await this.usersService.findByPhone(loginDto.phone);
    console.log(`[AUTH] User lookup - found: ${!!user}, isActive: ${user?.isActive}`);

    if (!user || !user.isActive) {
      console.log(`[AUTH] Login failed - user not found or inactive`);
      throw new UnauthorizedException("Invalid credentials");
    }

    console.log(`[AUTH] Verifying password for user: ${user._id}`);
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    console.log(`[AUTH] Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log(`[AUTH] Login failed - invalid password`);
      throw new UnauthorizedException("Invalid credentials");
    }

    console.log(`[AUTH] Generating tokens for user: ${user._id}`);
    const accessToken = this.jwtService.sign(
      { sub: user._id, role: user.role, phone: user.phone },
      { expiresIn: process.env.JWT_ACCESS_EXPIRATION || "15m" },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user._id, role: user.role },
      { expiresIn: process.env.JWT_REFRESH_EXPIRATION || "7d" },
    );

    console.log(`[AUTH] Login successful - user: ${user._id}, role: ${user.role}`);
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
