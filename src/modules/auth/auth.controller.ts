import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { PermissionsGuard } from "./guards/permissions.guard";
import { Roles } from "./decorators/roles.decorator";
import { Permissions } from "./decorators/permissions.decorator";

@Controller("api/auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(
      body.username,
      body.password,
    );
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.authService.login(user, body.deviceId);
  }

  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  async refresh(@Body("refreshToken") refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is required");
    }
    return this.authService.refresh(refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post("logout")
  async logout(@Body("refreshToken") refreshToken: string) {
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    return { success: true };
  }

  // --- TEST ENDPOINTS --- //

  @UseGuards(JwtAuthGuard)
  @Get("protected")
  protectedRoute(@Request() req: any) {
    return { message: "Protected", user: req.user };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  @Get("admin")
  adminRoute() {
    return { message: "Admin only" };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("CAN_CREATE_SALE")
  @Get("sale")
  saleRoute() {
    return { message: "Can create sale" };
  }
}
