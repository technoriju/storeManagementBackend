import { Test, TestingModule } from "@nestjs/testing";
import { ProductsService } from "./products.service";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("ProductsService - Delete and Update", () => {
  let service: ProductsService;

  const mockTx: any = {
    stockBalance: {
      updateMany: jest.fn(),
    },
    productUnit: {
      updateMany: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
  };

  const mockPrisma: any = {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
    },
    stockBalance: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockTx)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe("remove (Delete Product)", () => {
    it("should soft delete product and its stock balances and product units", async () => {
      const prodId = 55n;
      const existingProduct = {
        id: prodId,
        name: "Test Product",
        deletedAt: null,
      };

      mockPrisma.product.findFirst.mockResolvedValue(existingProduct);
      mockTx.product.update.mockResolvedValue({ ...existingProduct, deletedAt: new Date() });

      await service.remove(prodId);

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: prodId, deletedAt: null },
        })
      );

      // Verify stock balances soft-deleted
      expect(mockTx.stockBalance.updateMany).toHaveBeenCalledWith({
        where: { productId: prodId },
        data: { deletedAt: expect.any(Date) },
      });

      // Verify product units soft-deleted
      expect(mockTx.productUnit.updateMany).toHaveBeenCalledWith({
        where: { productId: prodId },
        data: { deletedAt: expect.any(Date) },
      });

      // Verify product soft-deleted
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: prodId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("should throw NotFoundException if product does not exist", async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(service.remove(999n)).rejects.toThrow(NotFoundException);
    });
  });
});
