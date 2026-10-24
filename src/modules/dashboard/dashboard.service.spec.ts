import { Test, TestingModule } from "@nestjs/testing";
import { DashboardService } from "./dashboard.service";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";

describe("DashboardService", () => {
  let service: DashboardService;
  let prisma: PrismaService;

  const mockPrisma = {
    sale: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { grandTotal: 15970.84 }, _count: { id: 45 } }),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    purchase: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { grandTotal: 2116.4 } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    expense: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    saleItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    saleReturn: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }),
    },
    purchaseReturn: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }),
    },
    customer: {
      count: jest.fn().mockResolvedValue(10),
      aggregate: jest.fn().mockResolvedValue({ _sum: { outstandingBalance: 7833.59 } }),
    },
    supplier: {
      count: jest.fn().mockResolvedValue(2),
    },
    product: {
      count: jest.fn().mockResolvedValue(993),
    },
    stockBalance: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return aggregated metrics with real values and proper shapes", async () => {
    const metrics = await service.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.totalSales).toBe(15970.84);
    expect(metrics.totalPurchases).toBe(2116.4);
    expect(metrics.totalCustomers).toBe(10);
    expect(metrics.totalSuppliers).toBe(2);
    expect(metrics.totalProducts).toBe(993);
    expect(metrics.outstanding).toBe(7833.59);
    expect(Array.isArray(metrics.weeklySalesData)).toBe(true);
    expect(Array.isArray(metrics.monthlySalesData)).toBe(true);
    expect(Array.isArray(metrics.hourlySalesData)).toBe(true);
    expect(metrics.customerDistribution).toBeDefined();
  });

  it("should utilize memory cache on repeated calls within TTL", async () => {
    service.clearCache();
    const firstCall = await service.getMetrics();
    const secondCall = await service.getMetrics();
    expect(firstCall).toEqual(secondCall);
  });
});
