import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { RegisterDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (
      user &&
      user.isActive &&
      (await bcrypt.compare(pass, user.passwordHash))
    ) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any, deviceId?: string) {
    const payload = { sub: user.id, username: user.username };
    const permissions = user.role.permissions.map((p) => p.permission.action);

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = crypto.randomUUID(); // Simple unique string for refresh token

    // Store the refresh token
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        deviceId: deviceId,
        expiresAt: expiration,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role.name,
        permissions,
        companyId: user.companyId,
        branchId: user.branchId,
      },
    };
  }

  async refresh(refreshTokenStr: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
      include: {
        user: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.revoked ||
      tokenRecord.expiresAt < new Date() ||
      !tokenRecord.user.isActive
    ) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Revoke old token and issue a new pair for rotation
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    const user = tokenRecord.user;
    return this.login(user, tokenRecord.deviceId || undefined);
  }

  async logout(refreshTokenStr: string) {
    try {
      await this.prisma.refreshToken.update({
        where: { token: refreshTokenStr },
        data: { revoked: true },
      });
    } catch (e) {
      // Ignored if token not found
    }
    return { success: true };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new ConflictException("Username already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const userId = await this.prisma.$transaction(async (prisma) => {
      const company = await prisma.company.create({
        data: {
          name: dto.companyName,
          email: dto.email,
          phone: dto.phone,
        },
      });

      const branch = await prisma.branch.create({
        data: {
          name: "Main Branch",
          companyId: company.id,
        },
      });

      let adminRole = await prisma.role.findFirst({
        where: { name: "Admin" },
      });

      if (!adminRole) {
        adminRole = await prisma.role.create({
          data: {
            name: "Admin",
            description: "System Administrator",
          },
        });
      }

      const user = await prisma.user.create({
        data: {
          username: dto.username,
          passwordHash,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          companyId: company.id,
          branchId: branch.id,
          roleId: adminRole.id,
        },
      });

      return user.id;
    });

    const userWithRelations = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return this.login(userWithRelations);
  }

  async getPermissions() {
    return this.prisma.permission.findMany({
      select: { id: true, action: true, description: true }
    });
  }
}
