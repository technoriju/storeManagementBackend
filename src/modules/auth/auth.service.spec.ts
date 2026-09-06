import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import * as bcrypt from "bcryptjs";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("validateUser", () => {
    it("should return valid user without password", async () => {
      const passwordHash = await bcrypt.hash("password123", 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "1",
        username: "test",
        passwordHash,
        isActive: true,
        role: {
          name: "Admin",
          permissions: [{ permission: { action: "CAN_CREATE_SALE" } }],
        },
      });

      const result = await service.validateUser("test", "password123");
      expect(result).toBeDefined();
      expect(result.username).toBe("test");
      expect(result.passwordHash).toBeUndefined();
    });

    it("should return null if invalid password", async () => {
      const passwordHash = await bcrypt.hash("password123", 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "1",
        username: "test",
        passwordHash,
        isActive: true,
      });

      const result = await service.validateUser("test", "wrongpassword");
      expect(result).toBeNull();
    });
  });

  describe("login", () => {
    it("should return access token, refresh token and user payload", async () => {
      mockJwt.sign.mockReturnValue("mockAccessToken");
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const user = {
        id: "1",
        username: "test",
        companyId: "comp1",
        branchId: "branch1",
        role: {
          name: "Admin",
          permissions: [{ permission: { action: "CAN_CREATE_SALE" } }],
        },
      };

      const result = await service.login(user);
      expect(result.accessToken).toBe("mockAccessToken");
      expect(result.refreshToken).toBeDefined();
      expect(result.user.username).toBe("test");
      expect(result.user.permissions).toContain("CAN_CREATE_SALE");
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("should refresh tokens if valid", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "token1",
        token: "old-refresh",
        revoked: false,
        expiresAt: futureDate,
        user: {
          id: "1",
          username: "test",
          isActive: true,
          role: {
            name: "Admin",
            permissions: [],
          },
        },
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockJwt.sign.mockReturnValue("newAccessToken");

      const result = await service.refresh("old-refresh");
      expect(result.accessToken).toBe("newAccessToken");
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe("old-refresh");
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: "token1" },
        data: { revoked: true },
      });
    });

    it("should throw error if token expired", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "token1",
        token: "old-refresh",
        revoked: false,
        expiresAt: pastDate,
        user: { isActive: true },
      });

      await expect(service.refresh("old-refresh")).rejects.toThrow(
        "Invalid or expired refresh token",
      );
    });

    it("should throw error if revoked", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "token1",
        token: "old-refresh",
        revoked: true,
        expiresAt: new Date(Date.now() + 10000),
        user: { isActive: true },
      });

      await expect(service.refresh("old-refresh")).rejects.toThrow();
    });
  });

  describe("logout", () => {
    it("should revoke token", async () => {
      mockPrisma.refreshToken.update.mockResolvedValue({});
      await service.logout("refresh-tok");
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { token: "refresh-tok" },
        data: { revoked: true },
      });
    });
  });
});
