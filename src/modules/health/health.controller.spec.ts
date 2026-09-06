import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";

describe("HealthController", () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{}]),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should return health status", async () => {
    const result = await controller.check();
    expect(result.status).toBe("ok");
    expect(result.database).toBe("up");
  });
});
