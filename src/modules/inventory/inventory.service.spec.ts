import { Test, TestingModule } from "@nestjs/testing";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { StockAdjustmentType } from "./dto/adjust-stock.dto";

describe("InventoryService", () => {
  let service: InventoryService;

  const mockPrisma: any = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    branch: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    company: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    stockBalance: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    stockTransaction: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getStocks", () => {
    it("should return stock items with computed statuses and summary metrics", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: BigInt(1),
          name: "Item A",
          sku: "SKU-A",
          productCode: "CD-A",
          barcode: "BAR-A",
          purchasePrice: 100,
          retailPrice: 150,
          lowStockLevel: 5,
          category: { id: 1, name: "Electronics" },
          brand: { id: 1, name: "Sony" },
          baseUnit: { id: 1, name: "Piece", shortName: "pcs" },
          stockBalances: [
            { warehouseId: 1, quantity: 20, warehouse: { id: 1, name: "Main Warehouse" } },
          ],
        },
        {
          id: BigInt(2),
          name: "Item B",
          sku: "SKU-B",
          productCode: "CD-B",
          barcode: null,
          purchasePrice: 50,
          retailPrice: 80,
          lowStockLevel: 10,
          category: null,
          brand: null,
          baseUnit: { id: 1, name: "Piece", shortName: "pcs" },
          stockBalances: [
            { warehouseId: 1, quantity: 4, warehouse: { id: 1, name: "Main Warehouse" } },
          ],
        },
        {
          id: BigInt(3),
          name: "Item C",
          sku: "SKU-C",
          purchasePrice: 200,
          retailPrice: 300,
          lowStockLevel: 2,
          stockBalances: [
            { warehouseId: 1, quantity: 0, warehouse: { id: 1, name: "Main Warehouse" } },
          ],
        },
      ]);

      const res = await service.getStocks({});
      expect(res.items.length).toBe(3);
      expect(res.items[0].status).toBe("IN_STOCK");
      expect(res.items[0].currentStock).toBe(20);
      expect(res.items[0].stockValue).toBe(2000);

      expect(res.items[1].status).toBe("LOW_STOCK"); // 4 <= 10
      expect(res.items[2].status).toBe("OUT_OF_STOCK"); // 0

      expect(res.summary.totalProducts).toBe(3);
      expect(res.summary.totalStockQuantity).toBe(24);
      expect(res.summary.lowStockCount).toBe(1);
      expect(res.summary.outOfStockCount).toBe(1);
      expect(res.summary.inStockCount).toBe(1);
    });

    it("should filter by status if provided", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: BigInt(1),
          name: "Item A",
          sku: "SKU-A",
          purchasePrice: 100,
          lowStockLevel: 5,
          stockBalances: [{ warehouseId: 1, quantity: 20 }],
        },
        {
          id: BigInt(2),
          name: "Item B",
          sku: "SKU-B",
          purchasePrice: 50,
          lowStockLevel: 10,
          stockBalances: [{ warehouseId: 1, quantity: 2 }],
        },
      ]);

      const res = await service.getStocks({ status: "LOW_STOCK" });
      expect(res.items.length).toBe(1);
      expect(res.items[0].sku).toBe("SKU-B");
    });
  });

  describe("addStock", () => {
    it("should throw NotFoundException if product does not exist", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addStock({ productId: 999, quantity: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if quantity <= 0", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: BigInt(1),
        name: "Item",
        baseUnitId: 1,
      });
      mockPrisma.warehouse.findFirst.mockResolvedValue({ id: 1 });

      await expect(
        service.addStock({ productId: 1, quantity: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should add stock and create StockTransaction", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: BigInt(1),
        name: "Item A",
        baseUnitId: 1,
      });
      mockPrisma.warehouse.findFirst.mockResolvedValue({ id: 1 });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          stockBalance: {
            findFirst: jest.fn().mockResolvedValue({ id: BigInt(10), quantity: 15 }),
            update: jest.fn().mockResolvedValue({ id: BigInt(10), quantity: 25 }),
          },
          stockTransaction: {
            create: jest.fn().mockResolvedValue({ id: BigInt(101) }),
          },
          product: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await service.addStock({
        productId: 1,
        quantity: 10,
        reason: "Purchase arrival",
      });

      expect(res.success).toBe(true);
      expect(res.previousStock).toBe(15);
      expect(res.quantityAdded).toBe(10);
      expect(res.newStock).toBe(25);
    });
  });

  describe("adjustStock", () => {
    it("should adjust stock with SET type correctly", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: BigInt(1),
        name: "Item A",
        baseUnitId: 1,
      });
      mockPrisma.warehouse.findFirst.mockResolvedValue({ id: 1 });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          stockBalance: {
            findFirst: jest.fn().mockResolvedValue({ id: BigInt(10), quantity: 50 }),
            update: jest.fn().mockResolvedValue({ id: BigInt(10), quantity: 40 }),
          },
          stockTransaction: {
            create: jest.fn().mockResolvedValue({ id: BigInt(102) }),
          },
          product: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await service.adjustStock({
        productId: 1,
        adjustmentType: StockAdjustmentType.SET,
        quantity: 40,
        reason: "Physical audit recount",
      });

      expect(res.success).toBe(true);
      expect(res.previousStock).toBe(50);
      expect(res.newStock).toBe(40);
      expect(res.delta).toBe(-10);
    });
  });

  describe("getTransactions", () => {
    it("should return formatted transactions list", async () => {
      mockPrisma.stockTransaction.findMany.mockResolvedValue([
        {
          id: BigInt(101),
          productId: BigInt(1),
          warehouseId: 1,
          transactionType: "ADD_STOCK",
          referenceId: "REF-001",
          unitQuantity: 10,
          baseQuantity: 10,
          createdAt: new Date(),
          product: { id: BigInt(1), name: "Product A", sku: "SKU-A" },
          warehouse: { id: 1, name: "Warehouse 1" },
          unit: { id: 1, name: "Piece", shortName: "pcs" },
        },
      ]);

      const res = await service.getTransactions({ productId: 1 });
      expect(res.length).toBe(1);
      expect(res[0].productName).toBe("Product A");
      expect(res[0].transactionType).toBe("ADD_STOCK");
      expect(res[0].unitQuantity).toBe(10);
    });
  });
});
