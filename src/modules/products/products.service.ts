import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateProductsDto } from "./dto/create-product.dto";
import { UpdateProductsDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private mapMobileDtoToPrisma(dto: any, isUpdate = false) {
    const data = { ...dto };
    
    // Map mobile fields to backend fields
    if (data.unitId && !data.baseUnitId) {
      data.baseUnitId = Number(data.unitId);
    }
    if (!data.baseUnitId && !isUpdate) {
      data.baseUnitId = 1; // Fallback
    }
    if (data.baseUnitId) {
      data.baseUnitId = Number(data.baseUnitId);
    }

    const subUnitId = data.subUnitId || data.subunitId;
    if (subUnitId !== undefined && subUnitId !== null && subUnitId !== '') {
      data.subUnitId = Number(subUnitId);
    } else if (!isUpdate) {
      data.subUnitId = null;
    }

    if (data.conversionRate !== undefined && data.conversionRate !== null && data.conversionRate !== '') {
      data.conversionRate = Number(data.conversionRate) || 1;
    } else if (!isUpdate) {
      data.conversionRate = 1;
    }
    
    if (!data.productCode && data.sku) {
      data.productCode = data.sku;
    }
    if (!data.productCode && !isUpdate) {
      data.productCode = `PROD-${Date.now()}`; // Fallback
    }
    
    if (data.price !== undefined && data.retailPrice === undefined) data.retailPrice = data.price;
    if (data.cost !== undefined && data.purchasePrice === undefined) data.purchasePrice = data.cost;
    if (data.purchasePrice !== undefined && data.purchasePrice !== null && data.purchasePrice !== '') {
      data.purchasePrice = Number(data.purchasePrice);
    }
    if (data.wholesalePrice !== undefined && data.wholesalePrice !== null && data.wholesalePrice !== '') {
      data.wholesalePrice = Number(data.wholesalePrice);
    }
    if (data.retailPrice !== undefined && data.retailPrice !== null && data.retailPrice !== '') {
      data.retailPrice = Number(data.retailPrice);
    }
    if (data.lowStockThreshold !== undefined && data.lowStockLevel === undefined) data.lowStockLevel = data.lowStockThreshold;
    if (data.hsn && !data.hsnCode) data.hsnCode = data.hsn;
    
    if (data.categoryId !== undefined) {
      data.categoryId = data.categoryId ? Number(data.categoryId) : null;
    }
    if (data.subCategoryId !== undefined) {
      data.subCategoryId = data.subCategoryId ? Number(data.subCategoryId) : null;
    }
    if (data.brandId !== undefined) {
      data.brandId = data.brandId ? Number(data.brandId) : null;
    }
    
    // Remove offline/unmapped fields so Prisma doesn't crash
    delete data.id;
    delete data.price;
    delete data.cost;
    delete data.unitId;
    delete data.subunitId;
    delete data.stockQuantity;
    delete data.lowStockThreshold;
    delete data.syncStatus;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.mrp;
    delete data.hsn;
    delete data.gst;
    delete data.openingStock;
    delete data.categoryName;
    delete data.brandName;
    delete data.unit;
    delete data.category;
    delete data.brand;
    delete data.baseUnit;
    delete data.subUnit;

    return data as Prisma.ProductUncheckedCreateInput;
  }

  private async ensureProductUnits(productId: bigint, baseUnitId: number, subUnitId?: number | null, conversionRate?: number | null) {
    try {
      // 1. Ensure base unit ProductUnit exists
      let basePU = await this.prisma.productUnit.findFirst({
        where: { productId, unitId: baseUnitId, deletedAt: null },
      });
      if (!basePU) {
        basePU = await this.prisma.productUnit.create({
          data: {
            productId,
            unitId: baseUnitId,
            conversionFactor: 1,
          },
        });
      }

      let subPU = null;
      if (subUnitId) {
        const subUnit = await this.prisma.subUnit.findFirst({ where: { id: subUnitId, deletedAt: null } });
        if (subUnit) {
          const cFactor = Number(conversionRate || subUnit.multiplier || 1);
          subPU = await this.prisma.productUnit.findFirst({
            where: { productId, unitId: subUnit.parentUnitId, id: { not: basePU.id }, deletedAt: null }
          });
          if (!subPU) {
            subPU = await this.prisma.productUnit.create({
              data: {
                productId,
                unitId: subUnit.parentUnitId,
                conversionFactor: cFactor > 0 ? 1 / cFactor : 1,
              },
            });
          } else {
            await this.prisma.productUnit.update({
              where: { id: subPU.id },
              data: { conversionFactor: cFactor > 0 ? 1 / cFactor : 1 },
            });
          }
        }
      }

      await this.prisma.product.update({
        where: { id: productId },
        data: {
          defaultPurchaseUnitId: basePU.id,
          defaultSalesUnitId: subPU ? subPU.id : basePU.id,
        },
      });
    } catch (e) {
      console.warn("Failed to ensure product units:", e);
    }
  }

  async create(createProductsDto: CreateProductsDto) {
    const rawStock = (createProductsDto as any).openingStock ?? (createProductsDto as any).stockQuantity ?? (createProductsDto as any).stock;
    const initialQty = rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock)) ? Number(rawStock) : 0;
    const data = this.mapMobileDtoToPrisma(createProductsDto, false);
    const product = await this.prisma.product.create({ data });
    if (product.baseUnitId) {
      await this.ensureProductUnits(product.id, product.baseUnitId, product.subUnitId, Number(product.conversionRate || 1));
    }
    if (initialQty > 0) {
      try {
        let warehouse = await this.prisma.warehouse.findFirst({ where: { deletedAt: null } });
        if (!warehouse) {
          warehouse = await this.prisma.warehouse.findFirst();
        }
        if (!warehouse) {
          let branch = await this.prisma.branch.findFirst({ where: { deletedAt: null } }) || await this.prisma.branch.findFirst();
          if (branch) {
            warehouse = await this.prisma.warehouse.create({
              data: { name: "Default Warehouse", branchId: branch.id }
            });
          }
        }
        if (warehouse) {
          await this.prisma.stockBalance.create({
            data: {
              productId: product.id,
              warehouseId: warehouse.id,
              quantity: initialQty,
            }
          });
          await this.prisma.stockTransaction.create({
            data: {
              productId: product.id,
              warehouseId: warehouse.id,
              transactionType: "OPENING_STOCK",
              referenceId: `OPENING-${product.id}`,
              unitId: product.baseUnitId || undefined,
              unitQuantity: initialQty,
              baseQuantity: initialQty,
            }
          });
        }
      } catch (err) {
        console.warn("Failed to create opening stock balance:", err);
      }
    }
    return this.findOne(product.id);
  }

  async findAll() {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        baseUnit: true,
        subUnit: true,
        category: true,
        subCategory: true,
        brand: true,
        productUnits: { include: { unit: true } },
        stockBalances: true,
      },
      orderBy: { id: "desc" },
    });

    return products.map((p) => {
      const stockQuantity = p.stockBalances?.reduce((sum, b) => sum + Number(b.quantity || 0), 0) ?? 0;
      return {
        ...p,
        purchasePrice: p.purchasePrice !== null && p.purchasePrice !== undefined ? Number(p.purchasePrice) : 0,
        wholesalePrice: p.wholesalePrice !== null && p.wholesalePrice !== undefined ? Number(p.wholesalePrice) : 0,
        retailPrice: p.retailPrice !== null && p.retailPrice !== undefined ? Number(p.retailPrice) : 0,
        stockQuantity,
        categoryName: p.category?.name ?? null,
        brandName: p.brand?.name ?? null,
      };
    });
  }

  async findOne(id: any) {
    let bigId: bigint;
    try {
      bigId = BigInt(id);
    } catch {
      throw new NotFoundException("Invalid product id");
    }
    const item = await this.prisma.product.findFirst({
      where: { id: bigId, deletedAt: null },
      include: {
        baseUnit: true,
        subUnit: true,
        category: true,
        subCategory: true,
        brand: true,
        productUnits: { include: { unit: true } },
        stockBalances: true,
      },
    });
    if (!item) {
      throw new NotFoundException("Products not found");
    }
    const stockQuantity = item.stockBalances?.reduce((sum, b) => sum + Number(b.quantity || 0), 0) ?? 0;
    return {
      ...item,
      purchasePrice: item.purchasePrice !== null && item.purchasePrice !== undefined ? Number(item.purchasePrice) : 0,
      wholesalePrice: item.wholesalePrice !== null && item.wholesalePrice !== undefined ? Number(item.wholesalePrice) : 0,
      retailPrice: item.retailPrice !== null && item.retailPrice !== undefined ? Number(item.retailPrice) : 0,
      stockQuantity,
      categoryName: item.category?.name ?? null,
      brandName: item.brand?.name ?? null,
    };
  }

  async update(id: any, updateProductsDto: UpdateProductsDto) {
    await this.findOne(id);
    const rawStock = (updateProductsDto as any).openingStock ?? (updateProductsDto as any).stockQuantity;
    const data = this.mapMobileDtoToPrisma(updateProductsDto, true) as Prisma.ProductUncheckedUpdateInput;
    const product = await this.prisma.product.update({
      where: { id: BigInt(id) },
      data,
    });
    if (product.baseUnitId) {
      await this.ensureProductUnits(product.id, product.baseUnitId, product.subUnitId, Number(product.conversionRate || 1));
    }
    if (rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock))) {
      try {
        const targetQty = Number(rawStock);
        let warehouse = await this.prisma.warehouse.findFirst({ where: { deletedAt: null } });
        if (warehouse) {
          const balance = await this.prisma.stockBalance.findFirst({
            where: { productId: product.id, warehouseId: warehouse.id, deletedAt: null }
          });
          if (balance) {
            await this.prisma.stockBalance.update({
              where: { id: balance.id },
              data: { quantity: targetQty }
            });
          } else {
            await this.prisma.stockBalance.create({
              data: { productId: product.id, warehouseId: warehouse.id, quantity: targetQty }
            });
          }
        }
      } catch (err) {
        console.warn("Failed to update stock balance on product update:", err);
      }
    }
    return this.findOne(product.id);
  }

  async remove(id: any) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() },
    });
  }
}
