import { Test, TestingModule } from "@nestjs/testing";
import { SyncService } from "./sync.service";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";

describe("SyncService Offline Data Safety", () => {
  let service: SyncService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: PrismaService,
          useValue: {
            syncQueue: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            product: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("handles duplicate sync (Idempotency)", async () => {
    (prisma.syncQueue.findUnique as jest.Mock).mockResolvedValue({
      id: "1",
      status: "COMPLETED",
    });
    const result = await service.pushChanges([
      { id: "1", entityType: "PRODUCT", operation: "CREATE" },
    ]);
    expect(result[0].status).toBe("COMPLETED");
    expect(prisma.syncQueue.create).not.toHaveBeenCalled();
  });

  it("detects version conflicts (Partial/Crash Recovery)", async () => {
    (prisma.syncQueue.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma as any).product.findUnique = jest
      .fn()
      .mockResolvedValue({ id: "prod1", version: 5 });

    const result = await service.pushChanges([
      {
        id: "2",
        entityType: "PRODUCT",
        entityId: "prod1",
        operation: "UPDATE",
        payload: { version: 3 },
      },
    ]);

    expect(result[0].status).toBe("FAILED");
    expect(result[0].error).toBe("Server has newer version");
  });
});
