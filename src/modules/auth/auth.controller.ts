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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { PermissionsGuard } from "./guards/permissions.guard";
import { Roles } from "./decorators/roles.decorator";
import { Permissions } from "./decorators/permissions.decorator";
import { LoginDto, RefreshTokenDto, RegisterDto } from "./dto/auth.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: "Login user" })
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(
      body.username,
      body.password,
    );
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.authService.login(user, body.deviceId);
  }

  @ApiOperation({ summary: "Refresh token" })
  @ApiBody({ type: RefreshTokenDto })
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  async refresh(@Body() body: RefreshTokenDto) {
    if (!body.refreshToken) {
      throw new UnauthorizedException("Refresh token is required");
    }
    return this.authService.refresh(body.refreshToken);
  }

  @ApiOperation({ summary: "Logout user" })
  @ApiBody({ type: RefreshTokenDto })
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  async logout(@Body() body: RefreshTokenDto) {
    if (body.refreshToken) {
      await this.authService.logout(body.refreshToken);
    }
    return { success: true };
  }

  @ApiOperation({ summary: "Register new tenant/user" })
  @ApiBody({ type: RegisterDto })
  @Post("register")
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  // --- TEST ENDPOINTS --- //

  @ApiBearerAuth()
  @ApiOperation({ summary: "Protected route test" })
  @UseGuards(JwtAuthGuard)
  @Get("protected")
  protectedRoute(@Request() req: any) {
    return { message: "Protected", user: req.user };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin route test" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  @Get("admin")
  adminRoute() {
    return { message: "Admin only" };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Sale permission route test" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("CAN_CREATE_SALE")
  @Get("sale")
  saleRoute() {
    return { message: "Can create sale" };
  }
}
