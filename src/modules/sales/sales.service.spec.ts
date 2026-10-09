import { Test, TestingModule } from "@nestjs/testing";
import { SalesService } from "./sales.service";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("SalesService - Delete and Update Stock Adjustments", () => {
  let service: SalesService;

  const mockTx: any = {
    product: {
      findUnique: jest.fn(),
    },
    productUnit: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    sale: {
      update: jest.fn(),
    },
    saleItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
    stockBalance: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    stockTransaction: {
      create: jest.fn(),
    },
  };

  const mockPrisma: any = {
    sale: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockTx)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  describe("remove (Delete Sale)", () => {
    it("should restore stock in StockBalance and record SALE_CANCELLED transaction when sale is deleted", async () => {
      const saleId = 100n;
      const existingSale = {
        id: saleId,
        warehouseId: 1,
        deletedAt: null,
        items: [
          {
            id: 1n,
            productId: 10n,
            quantity: 5,
            productUnit: { conversionFactor: 1, unitId: 1 },
          },
        ],
      };

      mockPrisma.sale.findFirst.mockResolvedValue(existingSale);
      mockTx.stockBalance.findUnique.mockResolvedValue({
        id: 50n,
        productId: 10n,
        warehouseId: 1,
        quantity: 15,
      });
      mockTx.sale.update.mockResolvedValue({ ...existingSale, deletedAt: new Date() });

      const result = await service.remove(saleId);

      expect(mockPrisma.sale.findFirst).toHaveBeenCalledWith({
        where: { id: saleId, deletedAt: null },
        include: {
          items: {
            include: {
              productUnit: true,
            },
          },
        },
      });

      // Verifies stock balance is restored: 15 + 5 = 20
      expect(mockTx.stockBalance.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: { quantity: 20 },
      });

      // Verifies stock transaction recorded
      expect(mockTx.stockTransaction.create).toHaveBeenCalledWith({
        data: {
          productId: 10n,
          warehouseId: 1,
          transactionType: "SALE_CANCELLED",
          referenceId: `SALE-100`,
          unitId: 1,
          unitQuantity: 5,
          baseQuantity: 5,
        },
      });

      // Verifies soft deletion
      expect(mockTx.saleItem.updateMany).toHaveBeenCalledWith({
        where: { saleId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockTx.sale.update).toHaveBeenCalledWith({
        where: { id: saleId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("should throw NotFoundException if sale does not exist", async () => {
      mockPrisma.sale.findFirst.mockResolvedValue(null);
      await expect(service.remove(999n)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update (Edit Sale)", () => {
    it("should reverse old items and deduct new items stock when items are updated", async () => {
      const saleId = 100n;
      const existingSale = {
        id: saleId,
        warehouseId: 1,
        deletedAt: null,
        items: [
          {
            id: 1n,
            productId: 10n,
            quantity: 5,
            productUnit: { conversionFactor: 1, unitId: 1 },
          },
        ],
      };

      mockPrisma.sale.findFirst.mockResolvedValue(existingSale);
      mockTx.product.findUnique.mockResolvedValue({
        id: 10n,
        baseUnitId: 1,
        productUnits: [{ id: 2n, unitId: 1, conversionFactor: 1 }],
      });
      mockTx.productUnit.findUnique.mockResolvedValue({ id: 2n, unitId: 1, conversionFactor: 1 });

      // Stock balance exists: 20
      mockTx.stockBalance.findUnique
        .mockResolvedValueOnce({ id: 50n, productId: 10n, warehouseId: 1, quantity: 20 }) // for reverse: 20 + 5 = 25
        .mockResolvedValueOnce({ id: 50n, productId: 10n, warehouseId: 1, quantity: 25 }); // for new: 25 - 8 = 17

      mockTx.sale.update.mockResolvedValue({ id: saleId, grandTotal: 800 });

      const updateDto: any = {
        grandTotal: 800,
        items: [
          {
            productId: "10",
            quantity: 8,
            unitPrice: 100,
            total: 800,
          },
        ],
      };

      await service.update(saleId, updateDto);

      // Verify reverse old stock: +5
      expect(mockTx.stockBalance.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: { quantity: 25 },
      });

      // Verify deduct new stock: 25 - 8 = 17
      expect(mockTx.stockBalance.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: { quantity: 17 },
      });

      // Verify stock transaction recorded
      expect(mockTx.stockTransaction.create).toHaveBeenCalledWith({
        data: {
          productId: 10n,
          warehouseId: 1,
          transactionType: "SALE_UPDATE",
          referenceId: `SALE-100`,
          unitId: 1,
          unitQuantity: -8,
          baseQuantity: -8,
        },
      });

      // Verify sale items replaced
      expect(mockTx.saleItem.deleteMany).toHaveBeenCalledWith({ where: { saleId } });
      expect(mockTx.saleItem.createMany).toHaveBeenCalled();
    });
  });

  describe("findAll & findOne (Product enrichment)", () => {
    const mockSaleWithProduct = {
      id: 10n,
      invoiceNumber: "INV-1001",
      deletedAt: null,
      items: [
        {
          id: 1n,
          productId: 18n,
          quantity: 2,
          unitPrice: 130,
          total: 260,
          product: {
            id: 18n,
            name: "250ML CONTANERhfhh",
            baseUnitId: 1,
            subUnitId: 2,
            brandId: 4,
            categoryId: 5,
            baseUnit: { id: 1, name: "Piece", shortName: "pcs" },
            subUnit: { id: 2, name: "Box", multiplier: 50 },
            brand: { id: 4, name: "PlasticCo" },
            category: { id: 5, name: "Containers" },
          },
        },
      ],
    };

    it("should enrich product with unitName, baseUnitName, brandName, subUnitName, and categoryName on findAll", async () => {
      mockPrisma.sale.findMany.mockResolvedValue([mockSaleWithProduct]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      const product = result[0].items[0].product;
      expect(product.unitName).toBe("Piece");
      expect(product.baseUnitName).toBe("Piece");
      expect(product.brandName).toBe("PlasticCo");
      expect(product.subUnitName).toBe("Box");
      expect(product.categoryName).toBe("Containers");
    });

    it("should enrich product with unitName, baseUnitName, brandName, subUnitName on findOne", async () => {
      mockPrisma.sale.findFirst.mockResolvedValue(mockSaleWithProduct);

      const result = await service.findOne("INV-1001");

      const product = result.items[0].product;
      expect(product.unitName).toBe("Piece");
      expect(product.brandName).toBe("PlasticCo");
      expect(product.subUnitName).toBe("Box");
    });
  });
});
