import { Test, TestingModule } from "@nestjs/testing";
import { PurchasesService } from "./purchases.service";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("PurchasesService - Delete and Update Stock Adjustments", () => {
  let service: PurchasesService;

  const mockTx: any = {
    product: {
      findUnique: jest.fn(),
    },
    productUnit: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    purchase: {
      update: jest.fn(),
      create: jest.fn(),
    },
    purchaseItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
    purchasePayment: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    payment: {
      updateMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    stockBalance: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    stockTransaction: {
      create: jest.fn(),
    },
    warehouse: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    supplier: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrisma: any = {
    purchase: {
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
        PurchasesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
  });

  describe("remove (Delete Purchase)", () => {
    it("should deduct stock in StockBalance and record PURCHASE_CANCELLED transaction when purchase is deleted", async () => {
      const purchaseId = 200n;
      const existingPurchase = {
        id: purchaseId,
        warehouseId: 1,
        deletedAt: null,
        items: [
          {
            id: 1n,
            productId: 10n,
            quantity: 10,
            productUnit: { conversionFactor: 1, unitId: 1 },
          },
        ],
      };

      mockPrisma.purchase.findFirst.mockResolvedValue(existingPurchase);
      mockTx.stockBalance.findUnique.mockResolvedValue({
        id: 50n,
        productId: 10n,
        warehouseId: 1,
        quantity: 30,
      });
      mockTx.purchase.update.mockResolvedValue({ ...existingPurchase, deletedAt: new Date() });

      await service.remove(purchaseId);

      expect(mockPrisma.purchase.findFirst).toHaveBeenCalledWith({
        where: { id: purchaseId, deletedAt: null },
        include: {
          items: {
            include: {
              productUnit: true,
            },
          },
          returns: {
            where: { deletedAt: null },
            include: {
              items: true,
            },
          },
        },
      });

      // Verifies stock balance is deducted: 30 - 10 = 20
      expect(mockTx.stockBalance.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: { quantity: 20 },
      });

      // Verifies stock transaction recorded
      expect(mockTx.stockTransaction.create).toHaveBeenCalledWith({
        data: {
          productId: 10n,
          warehouseId: 1,
          transactionType: "PURCHASE_CANCELLED",
          referenceId: `PURCHASE-200`,
          unitId: 1,
          unitQuantity: -10,
          baseQuantity: -10,
        },
      });

      // Verifies soft deletion
      expect(mockTx.purchaseItem.updateMany).toHaveBeenCalledWith({
        where: { purchaseId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockTx.purchasePayment.updateMany).toHaveBeenCalledWith({
        where: { purchaseId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockTx.purchase.update).toHaveBeenCalledWith({
        where: { id: purchaseId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("should throw NotFoundException if purchase does not exist", async () => {
      mockPrisma.purchase.findFirst.mockResolvedValue(null);
      await expect(service.remove(999n)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update (Edit Purchase)", () => {
    it("should reverse old items and add new items stock when items are updated", async () => {
      const purchaseId = 200n;
      const existingPurchase = {
        id: purchaseId,
        warehouseId: 1,
        deletedAt: null,
        items: [
          {
            id: 1n,
            productId: 10n,
            quantity: 10,
            productUnit: { conversionFactor: 1, unitId: 1 },
          },
        ],
      };

      mockPrisma.purchase.findFirst.mockResolvedValue(existingPurchase);
      mockTx.product.findUnique.mockResolvedValue({
        id: 10n,
        baseUnitId: 1,
        productUnits: [{ id: 2n, unitId: 1, conversionFactor: 1 }],
      });
      mockTx.productUnit.findUnique.mockResolvedValue({ id: 2n, unitId: 1, conversionFactor: 1 });

      // Stock balance exists: 50
      mockTx.stockBalance.findUnique
        .mockResolvedValueOnce({ id: 50n, productId: 10n, warehouseId: 1, quantity: 50 }) // for reverse: 50 - 10 = 40
        .mockResolvedValueOnce({ id: 50n, productId: 10n, warehouseId: 1, quantity: 40 }); // for new: 40 + 15 = 55

      mockTx.purchase.update.mockResolvedValue({ id: purchaseId, grandTotal: 1500 });

      const updateDto: any = {
        grandTotal: 1500,
        items: [
          {
            productId: "10",
            quantity: 15,
            unitPrice: 100,
            total: 1500,
          },
        ],
      };

      await service.update(purchaseId, updateDto);

      // Verify reverse old stock: 50 - 10 = 40
      expect(mockTx.stockBalance.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: { quantity: 40 },
      });

      // Verify add new stock: 40 + 15 = 55
      expect(mockTx.stockBalance.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: { quantity: 55 },
      });

      // Verify stock transaction recorded
      expect(mockTx.stockTransaction.create).toHaveBeenCalledWith({
        data: {
          productId: 10n,
          warehouseId: 1,
          transactionType: "PURCHASE_UPDATE",
          referenceId: `PURCHASE-200`,
          unitId: 1,
          unitQuantity: 15,
          baseQuantity: 15,
        },
      });

      // Verify purchase items replaced
      expect(mockTx.purchaseItem.deleteMany).toHaveBeenCalledWith({ where: { purchaseId } });
      expect(mockTx.purchaseItem.createMany).toHaveBeenCalled();
    });
  });

  describe("remove with active returns", () => {
    it("should deduct only net remaining quantity from stock if some items were already returned", async () => {
      const purchaseId = 300n;
      const existingPurchase = {
        id: purchaseId,
        warehouseId: 1,
        deletedAt: null,
        items: [
          {
            id: 1n,
            productId: 10n,
            quantity: 10,
            productUnit: { conversionFactor: 1, unitId: 1 },
          },
        ],
        returns: [
          {
            id: 1n,
            purchaseId,
            items: [
              {
                id: 11n,
                productId: 10n,
                quantity: 4,
                productUnit: { conversionFactor: 1, unitId: 1 },
              },
            ],
          },
        ],
      };

      mockPrisma.purchase.findFirst.mockResolvedValue(existingPurchase);
      mockTx.stockBalance.findUnique.mockResolvedValue({
        id: 50n,
        productId: 10n,
        warehouseId: 1,
        quantity: 26, // 30 originally - 4 returned = 26
      });
      mockTx.purchase.update.mockResolvedValue({ ...existingPurchase, deletedAt: new Date() });

      await service.remove(purchaseId);

      // Only net 6 (10 - 4 returned) should be deducted from stock: 26 - 6 = 20
      expect(mockTx.stockBalance.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: { quantity: 20 },
      });

      expect(mockTx.stockTransaction.create).toHaveBeenCalledWith({
        data: {
          productId: 10n,
          warehouseId: 1,
          transactionType: "PURCHASE_CANCELLED",
          referenceId: `PURCHASE-300`,
          unitId: 1,
          unitQuantity: -10,
          baseQuantity: -6,
        },
      });
    });
  });

  describe("create with supplier balance adjustment", () => {
    it("should create payment with type receive when previous due is higher than existing balance", async () => {
      mockTx.product.findUnique.mockResolvedValue({
        id: 10n,
        baseUnitId: 1,
        productUnits: [{ id: 1n, unitId: 1, conversionFactor: 1 }],
      });
      mockTx.productUnit.findUnique.mockResolvedValue({ id: 1n, unitId: 1, conversionFactor: 1 });
      mockTx.warehouse.findUnique.mockResolvedValue({ id: 1 });
      mockTx.supplier = {
        findUnique: jest.fn().mockResolvedValue({ id: 5, outstandingBalance: 100 }),
        update: jest.fn(),
      };
      mockTx.purchase.create.mockResolvedValue({
        id: 400n,
        invoiceNumber: "PUR-400",
        grandTotal: 1000,
        supplierId: 5,
      });
      mockTx.stockBalance.findUnique.mockResolvedValue({ id: 50n, quantity: 10 });
      mockTx.payment.create.mockResolvedValue({ id: 101n, amount: 50 });

      // Mock supplier for ledger recalculation
      mockTx.supplier.findUnique.mockResolvedValue({
        id: 5,
        outstandingBalance: 100,
        payments: [],
        purchases: [],
      });

      mockPrisma.purchase.findFirst.mockResolvedValue({
        id: 400n,
        invoiceNumber: "PUR-400",
        grandTotal: 1000,
        supplierId: 5,
      });

      const createDto: any = {
        supplierId: 5,
        warehouseId: 1,
        purchaseDate: new Date().toISOString(),
        grandTotal: 1000,
        paid: 0,
        showPreviousBalance: true,
        previousDue: 150, // 150 - 100 = +50 delta
        advancePayment: 0,
        items: [
          {
            productId: "10",
            quantity: 5,
            unitPrice: 200,
            total: 1000,
          },
        ],
      };

      await service.create(createDto);

      // Verify payment was created with type 'receive' to increase running balance
      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 50,
          paymentMethod: "adjustment",
          type: "receive",
          supplierId: 5,
        }),
      });
    });

    it("should create payment with type pay when previous due is lower than existing balance", async () => {
      mockTx.product.findUnique.mockResolvedValue({
        id: 10n,
        baseUnitId: 1,
        productUnits: [{ id: 1n, unitId: 1, conversionFactor: 1 }],
      });
      mockTx.productUnit.findUnique.mockResolvedValue({ id: 1n, unitId: 1, conversionFactor: 1 });
      mockTx.warehouse.findUnique.mockResolvedValue({ id: 1 });
      mockTx.supplier = {
        findUnique: jest.fn().mockResolvedValue({ id: 5, outstandingBalance: 100 }),
        update: jest.fn(),
      };
      mockTx.purchase.create.mockResolvedValue({
        id: 401n,
        invoiceNumber: "PUR-401",
        grandTotal: 1000,
        supplierId: 5,
      });
      mockTx.stockBalance.findUnique.mockResolvedValue({ id: 50n, quantity: 10 });
      mockTx.payment.create.mockResolvedValue({ id: 102n, amount: 40 });

      mockTx.supplier.findUnique.mockResolvedValue({
        id: 5,
        outstandingBalance: 100,
        payments: [],
        purchases: [],
      });

      mockPrisma.purchase.findFirst.mockResolvedValue({
        id: 401n,
        invoiceNumber: "PUR-401",
        grandTotal: 1000,
        supplierId: 5,
      });

      const createDto: any = {
        supplierId: 5,
        warehouseId: 1,
        purchaseDate: new Date().toISOString(),
        grandTotal: 1000,
        paid: 0,
        showPreviousBalance: true,
        previousDue: 60, // 60 - 100 = -40 delta
        advancePayment: 0,
        items: [
          {
            productId: "10",
            quantity: 5,
            unitPrice: 200,
            total: 1000,
          },
        ],
      };

      await service.create(createDto);

      // Verify payment was created with type 'pay' to decrease running balance
      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 40,
          paymentMethod: "adjustment",
          type: "pay",
          supplierId: 5,
        }),
      });
    });
  });
});
