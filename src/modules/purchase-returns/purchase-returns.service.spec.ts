import { Test, TestingModule } from "@nestjs/testing";
import { PurchaseReturnsService } from "./purchase-returns.service";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("PurchaseReturnsService - Stock and Supplier Balance", () => {
  let service: PurchaseReturnsService;

  const mockTx: any = {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productUnit: {
      findUnique: jest.fn(),
    },
    purchase: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    purchaseReturn: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    purchaseReturnItem: {
      updateMany: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
    },
    stockBalance: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    stockTransaction: {
      create: jest.fn(),
    },
    supplier: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrisma: any = {
    purchase: {
      findUnique: jest.fn(),
    },
    purchaseReturn: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockTx)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseReturnsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PurchaseReturnsService>(PurchaseReturnsService);
  });

  describe("create (Purchase Return)", () => {
    it("should deduct stock, record PURCHASE_RETURN transaction, update parent purchase due, and recalculate supplier balance", async () => {
      const purchaseId = 100n;
      const parentPurchase = {
        id: purchaseId,
        warehouseId: 1,
        supplierId: 5,
        grandTotal: 1000,
        paid: 200,
        due: 800,
        paymentStatus: "Partial",
      };

      mockPrisma.purchase.findUnique.mockResolvedValue(parentPurchase);

      mockTx.product.findUnique.mockResolvedValue({
        id: 10n,
        baseUnitId: 1,
        productUnits: [{ id: 1n, unitId: 1, conversionFactor: 1 }],
      });
      mockTx.productUnit.findUnique.mockResolvedValue({ id: 1n, unitId: 1, conversionFactor: 1 });

      const createdReturn = {
        id: 501n,
        purchaseId,
        totalAmount: 300,
      };
      mockTx.purchaseReturn.create.mockResolvedValue(createdReturn);

      mockTx.stockBalance.findUnique.mockResolvedValue({
        id: 50n,
        productId: 10n,
        warehouseId: 1,
        quantity: 20,
      });

      // After return: all returns total = 300
      mockTx.purchaseReturn.findMany.mockResolvedValue([{ totalAmount: 300 }]);

      // Supplier ledger mock
      mockTx.supplier.findUnique.mockResolvedValue({
        id: 5,
        outstandingBalance: 800,
        purchases: [
          {
            id: purchaseId,
            grandTotal: 1000,
            returns: [{ totalAmount: 300 }],
          },
        ],
        payments: [{ amount: 200, type: "pay" }],
      });

      const createDto: any = {
        purchaseId: "100",
        returnDate: new Date().toISOString(),
        totalAmount: 300,
        items: [
          {
            productId: "10",
            quantity: 3,
            unitPrice: 100,
            total: 300,
          },
        ],
      };

      await service.create(createDto);

      // Verify stock deducted: 20 - 3 = 17
      expect(mockTx.stockBalance.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: { quantity: 17 },
      });

      // Verify stock transaction recorded
      expect(mockTx.stockTransaction.create).toHaveBeenCalledWith({
        data: {
          productId: 10n,
          warehouseId: 1,
          transactionType: "PURCHASE_RETURN",
          referenceId: `PURCHASE-RETURN-501`,
          unitId: 1,
          unitQuantity: -3,
          baseQuantity: -3,
        },
      });

      // Verify product version bumped
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 10n },
        data: { version: { increment: 1 }, updatedAt: expect.any(Date) },
      });

      // Verify parent purchase due updated: original 1000 - returned 300 = effective 700; 700 - 200 paid = 500 due
      expect(mockTx.purchase.update).toHaveBeenCalledWith({
        where: { id: purchaseId },
        data: {
          due: 500,
          paymentStatus: "Partial",
        },
      });

      // Verify supplier outstandingBalance recalculated in DB: (1000 - 300) - 200 = 500
      expect(mockTx.supplier.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { outstandingBalance: 500 },
      });
    });

    it("should throw NotFoundException if parent purchase is not found", async () => {
      mockPrisma.purchase.findUnique.mockResolvedValue(null);
      await expect(
        service.create({
          purchaseId: "999",
          returnDate: new Date().toISOString(),
          items: [],
        } as any)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove (Delete Purchase Return)", () => {
    it("should restore warehouse stock, soft delete items, recalculate purchase due, and recalculate supplier balance", async () => {
      const returnId = 501n;
      const purchaseId = 100n;
      const existingReturn = {
        id: returnId,
        purchaseId,
        totalAmount: 300,
        purchase: {
          id: purchaseId,
          warehouseId: 1,
          supplierId: 5,
          grandTotal: 1000,
          paid: 200,
          due: 500,
          paymentStatus: "Partial",
        },
        items: [
          {
            id: 11n,
            productId: 10n,
            productUnitId: 1n,
            quantity: 3,
            product: { baseUnitId: 1 },
          },
        ],
      };

      mockPrisma.purchaseReturn.findFirst.mockResolvedValue(existingReturn);
      mockTx.productUnit.findUnique.mockResolvedValue({ id: 1n, unitId: 1, conversionFactor: 1 });

      mockTx.purchaseReturn.update.mockResolvedValue({ ...existingReturn, deletedAt: new Date() });
      mockTx.stockBalance.findUnique.mockResolvedValue({
        id: 50n,
        productId: 10n,
        warehouseId: 1,
        quantity: 17,
      });

      // After return removal: no active returns remaining
      mockTx.purchaseReturn.findMany.mockResolvedValue([]);
      mockTx.purchase.findUnique.mockResolvedValue(existingReturn.purchase);

      // Supplier ledger mock without active returns
      mockTx.supplier.findUnique.mockResolvedValue({
        id: 5,
        outstandingBalance: 500,
        purchases: [
          {
            id: purchaseId,
            grandTotal: 1000,
            returns: [], // deleted return is excluded!
          },
        ],
        payments: [{ amount: 200, type: "pay" }],
      });

      await service.remove(returnId);

      // Verify soft delete return
      expect(mockTx.purchaseReturn.update).toHaveBeenCalledWith({
        where: { id: returnId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockTx.purchaseReturnItem.updateMany).toHaveBeenCalledWith({
        where: { purchaseReturnId: returnId },
        data: { deletedAt: expect.any(Date) },
      });

      // Verify stock restored: 17 + 3 = 20
      expect(mockTx.stockBalance.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: { quantity: 20 },
      });

      // Verify stock transaction recorded as PURCHASE_RETURN_CANCELLED
      expect(mockTx.stockTransaction.create).toHaveBeenCalledWith({
        data: {
          productId: 10n,
          warehouseId: 1,
          transactionType: "PURCHASE_RETURN_CANCELLED",
          referenceId: `PURCHASE-RETURN-501`,
          unitId: 1,
          unitQuantity: 3,
          baseQuantity: 3,
        },
      });

      // Verify product version bumped
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 10n },
        data: { version: { increment: 1 }, updatedAt: expect.any(Date) },
      });

      // Verify parent purchase due restored: 1000 - 200 paid = 800 due
      expect(mockTx.purchase.update).toHaveBeenCalledWith({
        where: { id: purchaseId },
        data: {
          due: 800,
          paymentStatus: "Partial",
        },
      });

      // Verify supplier outstandingBalance restored in DB: 1000 - 200 = 800
      expect(mockTx.supplier.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { outstandingBalance: 800 },
      });
    });

    it("should throw NotFoundException if purchase return is not found", async () => {
      mockPrisma.purchaseReturn.findFirst.mockResolvedValue(null);
      await expect(service.remove(999n)).rejects.toThrow(NotFoundException);
    });
  });
});
