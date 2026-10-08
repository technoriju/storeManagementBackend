import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { AddStockDto } from "./dto/add-stock.dto";
import { AdjustStockDto, StockAdjustmentType } from "./dto/adjust-stock.dto";
import { QueryStockDto } from "./dto/query-stock.dto";

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateDefaultWarehouse(): Promise<number> {
    const existingWarehouse = await this.prisma.warehouse.findFirst({
      where: { deletedAt: null },
    });
    if (existingWarehouse) {
      return existingWarehouse.id;
    }

    let branch =
      (await this.prisma.branch.findFirst({ where: { deletedAt: null } })) ||
      (await this.prisma.branch.findFirst());

    if (!branch) {
      let company = await this.prisma.company.findFirst({
        where: { deletedAt: null },
      });
      if (!company) {
        company = await this.prisma.company.create({
          data: { name: "Main Company", status: "ACTIVE" },
        });
      }
      branch = await this.prisma.branch.create({
        data: { name: "Main Branch", companyId: company.id, status: "ACTIVE" },
      });
    }

    const newWarehouse = await this.prisma.warehouse.create({
      data: {
        name: "Default Warehouse",
        branchId: branch.id,
        status: "ACTIVE",
      },
    });

    return newWarehouse.id;
  }

  async getStocks(query: QueryStockDto) {
    const whereClause: any = {
      deletedAt: null,
    };

    if (query.categoryId) {
      whereClause.categoryId = Number(query.categoryId);
    }
    if (query.brandId) {
      whereClause.brandId = Number(query.brandId);
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      whereClause.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { productCode: { contains: q } },
        { barcode: { contains: q } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        baseUnit: { select: { id: true, name: true, shortName: true } },
        stockBalances: {
          include: {
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const targetWarehouseId = query.warehouseId ? Number(query.warehouseId) : undefined;

    let items = products.map((p) => {
      let filteredBalances = p.stockBalances || [];
      if (targetWarehouseId) {
        filteredBalances = filteredBalances.filter(
          (b) => b.warehouseId === targetWarehouseId,
        );
      }

      const currentStock = filteredBalances.reduce(
        (sum, b) => sum + Number(b.quantity || 0),
        0,
      );

      const purchasePrice = Number(p.purchasePrice || 0);
      const retailPrice = Number(p.retailPrice || 0);
      const lowStockLevel = Number(p.lowStockLevel || 0);
      const stockValue = Number((currentStock * purchasePrice).toFixed(2));

      let status = "IN_STOCK";
      if (currentStock <= 0) {
        status = "OUT_OF_STOCK";
      } else if (lowStockLevel > 0 && currentStock <= lowStockLevel) {
        status = "LOW_STOCK";
      }

      return {
        id: p.id.toString(),
        name: p.name,
        sku: p.sku,
        productCode: p.productCode,
        barcode: p.barcode,
        categoryId: p.categoryId,
        category: p.category,
        brandId: p.brandId,
        brand: p.brand,
        subCategory: p.subCategory,
        baseUnit: p.baseUnit,
        unit: p.baseUnit?.shortName || p.baseUnit?.name || "pcs",
        purchasePrice,
        retailPrice,
        lowStockLevel,
        currentStock,
        stockValue,
        status,
        warehouses: (p.stockBalances || []).map((b) => ({
          warehouseId: b.warehouseId,
          warehouseName: b.warehouse?.name || "Warehouse",
          quantity: Number(b.quantity || 0),
        })),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    if (query.status) {
      const filterStatus = query.status.toUpperCase();
      items = items.filter((item) => item.status === filterStatus);
    }

    const summary = {
      totalProducts: items.length,
      totalStockQuantity: Number(
        items.reduce((sum, item) => sum + item.currentStock, 0).toFixed(4),
      ),
      totalStockValue: Number(
        items.reduce((sum, item) => sum + item.stockValue, 0).toFixed(2),
      ),
      lowStockCount: items.filter((item) => item.status === "LOW_STOCK").length,
      outOfStockCount: items.filter((item) => item.status === "OUT_OF_STOCK").length,
      inStockCount: items.filter((item) => item.status === "IN_STOCK").length,
    };

    // Pagination
    let paginatedItems = items;
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 0;

    if (limit > 0) {
      const startIndex = (page - 1) * limit;
      paginatedItems = items.slice(startIndex, startIndex + limit);
    }

    return {
      items: paginatedItems,
      summary,
      total: items.length,
      page,
      limit: limit || items.length,
    };
  }

  async getSummary() {
    const stockData = await this.getStocks({});
    return stockData.summary;
  }

  async addStock(dto: AddStockDto) {
    const productId = BigInt(dto.productId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { baseUnit: true },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    const warehouseId = dto.warehouseId
      ? Number(dto.warehouseId)
      : await this.getOrCreateDefaultWarehouse();

    const qtyToAdd = Number(dto.quantity);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      throw new BadRequestException("Quantity to add must be greater than 0");
    }

    return await this.prisma.$transaction(async (tx) => {
      // Find or create stock balance for product & warehouse
      const existingBalance = await tx.stockBalance.findFirst({
        where: {
          productId,
          warehouseId,
        },
      });

      let updatedBalance;
      const prevQty = existingBalance ? Number(existingBalance.quantity) : 0;
      const newQty = prevQty + qtyToAdd;

      if (existingBalance) {
        updatedBalance = await tx.stockBalance.update({
          where: { id: existingBalance.id },
          data: {
            quantity: newQty,
            version: { increment: 1 },
          },
        });
      } else {
        updatedBalance = await tx.stockBalance.create({
          data: {
            productId,
            warehouseId,
            quantity: newQty,
            status: "ACTIVE",
          },
        });
      }

      // Record Stock Transaction
      const refId =
        dto.reference ||
        dto.reason ||
        `STK-IN-${Date.now()}`;

      const stockTx = await tx.stockTransaction.create({
        data: {
          productId,
          warehouseId,
          transactionType: "ADD_STOCK",
          referenceId: refId,
          unitId: product.baseUnitId,
          unitQuantity: qtyToAdd,
          baseQuantity: qtyToAdd,
          status: "ACTIVE",
        },
      });

      // Update unit purchase price if supplied
      if (dto.unitCost !== undefined && Number(dto.unitCost) > 0) {
        await tx.product.update({
          where: { id: productId },
          data: {
            purchasePrice: Number(dto.unitCost),
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.product.update({
          where: { id: productId },
          data: {
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
      }

      return {
        success: true,
        productId: product.id.toString(),
        productName: product.name,
        warehouseId,
        previousStock: prevQty,
        quantityAdded: qtyToAdd,
        newStock: newQty,
        transactionId: stockTx.id.toString(),
        referenceId: refId,
      };
    });
  }

  async adjustStock(dto: AdjustStockDto) {
    const productId = BigInt(dto.productId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { baseUnit: true },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    const warehouseId = dto.warehouseId
      ? Number(dto.warehouseId)
      : await this.getOrCreateDefaultWarehouse();

    const inputQty = Number(dto.quantity);
    if (isNaN(inputQty) || inputQty < 0) {
      throw new BadRequestException("Quantity must be a valid positive number");
    }

    return await this.prisma.$transaction(async (tx) => {
      const existingBalance = await tx.stockBalance.findFirst({
        where: {
          productId,
          warehouseId,
        },
      });

      const currentQty = existingBalance ? Number(existingBalance.quantity) : 0;
      let newQty = currentQty;

      if (dto.adjustmentType === StockAdjustmentType.ADD) {
        newQty = currentQty + inputQty;
      } else if (dto.adjustmentType === StockAdjustmentType.SUBTRACT) {
        newQty = Math.max(0, currentQty - inputQty);
      } else if (dto.adjustmentType === StockAdjustmentType.SET) {
        newQty = inputQty;
      }

      const delta = newQty - currentQty;

      if (existingBalance) {
        await tx.stockBalance.update({
          where: { id: existingBalance.id },
          data: {
            quantity: newQty,
            version: { increment: 1 },
          },
        });
      } else {
        await tx.stockBalance.create({
          data: {
            productId,
            warehouseId,
            quantity: newQty,
            status: "ACTIVE",
          },
        });
      }

      const txType =
        dto.adjustmentType === StockAdjustmentType.SUBTRACT
          ? "ADJUSTMENT_SUB"
          : dto.adjustmentType === StockAdjustmentType.ADD
          ? "ADJUSTMENT_ADD"
          : "ADJUSTMENT_SET";

      const refId = dto.reason || `ADJ-${Date.now()}`;

      const stockTx = await tx.stockTransaction.create({
        data: {
          productId,
          warehouseId,
          transactionType: txType,
          referenceId: refId,
          unitId: product.baseUnitId,
          unitQuantity: Math.abs(delta),
          baseQuantity: delta,
          status: "ACTIVE",
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        productId: product.id.toString(),
        productName: product.name,
        warehouseId,
        adjustmentType: dto.adjustmentType,
        previousStock: currentQty,
        delta,
        newStock: newQty,
        transactionId: stockTx.id.toString(),
        referenceId: refId,
      };
    });
  }

  async getTransactions(query: {
    productId?: number | string;
    warehouseId?: number;
    transactionType?: string;
    limit?: number;
  }) {
    const whereClause: any = {
      status: "ACTIVE",
    };

    if (query.productId !== undefined && query.productId !== null && query.productId !== "") {
      try {
        whereClause.productId = BigInt(query.productId);
      } catch {
        return [];
      }
    }
    if (query.warehouseId) {
      whereClause.warehouseId = Number(query.warehouseId);
    }
    if (query.transactionType) {
      whereClause.transactionType = query.transactionType;
    }

    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 100;

    const list = await this.prisma.stockTransaction.findMany({
      where: whereClause,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return list.map((tx) => ({
      id: tx.id.toString(),
      productId: tx.productId.toString(),
      productName: tx.product?.name || "Product",
      sku: tx.product?.sku || "",
      warehouseId: tx.warehouseId,
      warehouseName: tx.warehouse?.name || "Warehouse",
      transactionType: tx.transactionType,
      referenceId: tx.referenceId,
      unitQuantity: Math.abs(Number(tx.unitQuantity)),
      baseQuantity: Number(tx.baseQuantity),
      unitName: tx.unit?.shortName || tx.unit?.name || "pcs",
      createdAt: tx.createdAt,
    }));
  }
}
