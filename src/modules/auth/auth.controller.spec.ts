import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UnauthorizedException } from "@nestjs/common";

describe("AuthController", () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("login", () => {
    it("should return token if valid", async () => {
      const user = { id: "1", username: "test" };
      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.login.mockResolvedValue({
        accessToken: "token",
        refreshToken: "refresh",
      });

      const result = await controller.login({
        username: "test",
        password: "password",
      });
      expect(result).toEqual({ accessToken: "token", refreshToken: "refresh" });
    });

    it("should throw UnauthorizedException if invalid", async () => {
      mockAuthService.validateUser.mockResolvedValue(null);
      await expect(
        controller.login({ username: "test", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    it("should return new tokens", async () => {
      mockAuthService.refresh.mockResolvedValue({
        accessToken: "new",
        refreshToken: "new-refresh",
      });
      const result = await controller.refresh("old-refresh");
      expect(result).toEqual({
        accessToken: "new",
        refreshToken: "new-refresh",
      });
    });
  });

  describe("logout", () => {
    it("should call logout on service", async () => {
      mockAuthService.logout.mockResolvedValue({ success: true });
      const result = await controller.logout("refresh-tok");
      expect(mockAuthService.logout).toHaveBeenCalledWith("refresh-tok");
      expect(result).toEqual({ success: true });
    });
  });
});
