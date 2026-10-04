import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateProductsDto } from "./dto/create-product.dto";
import { UpdateProductsDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private async resolveRelations(dto: any) {
    // 1. Resolve Category
    let categoryId = dto.categoryId !== undefined && dto.categoryId !== null ? Number(dto.categoryId) : null;
    if (categoryId !== null && categoryId <= 0) categoryId = null;

    const catName = String(dto.categoryName || dto.category?.name || (typeof dto.category === 'string' ? dto.category : '') || '').trim();
    if (!categoryId && catName) {
      let cat = await this.prisma.category.findFirst({
        where: { name: catName, deletedAt: null },
      });
      if (!cat) {
        cat = await this.prisma.category.create({
          data: { name: catName, status: "ACTIVE" },
        });
      }
      categoryId = cat.id;
    }

    // 2. Resolve Brand
    let brandId = dto.brandId !== undefined && dto.brandId !== null ? Number(dto.brandId) : null;
    if (brandId !== null && brandId <= 0) brandId = null;

    const bName = String(dto.brandName || dto.brand?.name || (typeof dto.brand === 'string' ? dto.brand : '') || '').trim();
    if (!brandId && bName) {
      let b = await this.prisma.brand.findFirst({
        where: { name: bName, deletedAt: null },
      });
      if (!b) {
        b = await this.prisma.brand.create({
          data: { name: bName, status: "ACTIVE" },
        });
      }
      brandId = b.id;
    }

    // 3. Resolve Unit
    let baseUnitId = dto.baseUnitId || dto.unitId;
    baseUnitId = baseUnitId !== undefined && baseUnitId !== null ? Number(baseUnitId) : null;
    if (baseUnitId !== null && baseUnitId <= 0) baseUnitId = null;

    const uName = String(dto.unit || dto.baseUnitName || dto.unitName || dto.baseUnit?.name || '').trim();
    if (!baseUnitId && uName) {
      let u = await this.prisma.unit.findFirst({
        where: {
          OR: [
            { name: uName },
            { shortName: uName },
          ],
          deletedAt: null,
        },
      });
      if (!u) {
        u = await this.prisma.unit.create({
          data: {
            name: uName,
            shortName: uName.length <= 10 ? uName.toLowerCase() : uName.substring(0, 10).toLowerCase(),
            status: "ACTIVE",
          },
        });
      }
      baseUnitId = u.id;
    }

    if (!baseUnitId) {
      let defaultUnit = await this.prisma.unit.findFirst({ where: { deletedAt: null } });
      if (!defaultUnit) {
        defaultUnit = await this.prisma.unit.create({
          data: { name: "Piece", shortName: "pcs", status: "ACTIVE" },
        });
      }
      baseUnitId = defaultUnit.id;
    }

    // 4. Resolve Subunit conversion multiplier
    let conversionRate = Number(dto.conversionRate);
    if (!conversionRate || isNaN(conversionRate) || conversionRate <= 0) {
      const rawSub = Number(dto.subunit || dto.subUnit || dto.subunitId || dto.subUnitId);
      conversionRate = !isNaN(rawSub) && rawSub > 0 ? rawSub : 1;
    }

    return {
      categoryId,
      brandId,
      baseUnitId,
      conversionRate,
    };
  }

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
    if (subUnitId !== undefined && subUnitId !== null && subUnitId !== '' && Number(subUnitId) > 0) {
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
      data.productCode = String(data.sku).trim();
    }
    if (!data.sku && data.productCode) {
      data.sku = String(data.productCode).trim();
    }
    if (!data.productCode && !isUpdate) {
      const genCode = `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      data.productCode = genCode;
      data.sku = genCode;
    }
    
    if (data.price !== undefined && data.retailPrice === undefined) data.retailPrice = data.price;
    if (data.cost !== undefined && data.purchasePrice === undefined) data.purchasePrice = data.cost;
    
    // Numeric defaults: blank -> 0
    data.purchasePrice = (data.purchasePrice !== undefined && data.purchasePrice !== null && data.purchasePrice !== '' && !isNaN(Number(data.purchasePrice))) 
      ? Number(data.purchasePrice) 
      : 0;
    data.wholesalePrice = (data.wholesalePrice !== undefined && data.wholesalePrice !== null && data.wholesalePrice !== '' && !isNaN(Number(data.wholesalePrice))) 
      ? Number(data.wholesalePrice) 
      : 0;
    data.retailPrice = (data.retailPrice !== undefined && data.retailPrice !== null && data.retailPrice !== '' && !isNaN(Number(data.retailPrice))) 
      ? Number(data.retailPrice) 
      : 0;
    
    if (data.lowStockThreshold !== undefined && data.lowStockLevel === undefined) {
      data.lowStockLevel = Number(data.lowStockThreshold) || 0;
    }
    if (data.hsn && !data.hsnCode) data.hsnCode = String(data.hsn).trim();
    
    if (data.categoryId !== undefined) {
      data.categoryId = (data.categoryId && Number(data.categoryId) > 0) ? Number(data.categoryId) : null;
    }
    if (data.subCategoryId !== undefined) {
      data.subCategoryId = (data.subCategoryId && Number(data.subCategoryId) > 0) ? Number(data.subCategoryId) : null;
    }
    if (data.brandId !== undefined) {
      data.brandId = (data.brandId && Number(data.brandId) > 0) ? Number(data.brandId) : null;
    }

    // String fields: blank -> null
    data.barcode = data.barcode && String(data.barcode).trim() ? String(data.barcode).trim() : null;
    data.hsnCode = data.hsnCode && String(data.hsnCode).trim() ? String(data.hsnCode).trim() : null;
    data.description = data.description && String(data.description).trim() ? String(data.description).trim() : null;
    
    // Remove offline/unmapped fields so Prisma doesn't crash
    delete data.id;
    delete data.price;
    delete data.cost;
    delete data.unitId;
    delete data.subunitId;
    delete data.subunit;
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
        where: { productId, unitId: baseUnitId },
      });
      if (!basePU) {
        basePU = await this.prisma.productUnit.create({
          data: {
            productId,
            unitId: baseUnitId,
            conversionFactor: 1,
          },
        });
      } else if (basePU.deletedAt) {
        basePU = await this.prisma.productUnit.update({
          where: { id: basePU.id },
          data: { deletedAt: null, conversionFactor: 1 },
        });
      }

      let subPU = null;
      if (subUnitId) {
        const subUnit = await this.prisma.subUnit.findFirst({ where: { id: subUnitId, deletedAt: null } });
        if (subUnit) {
          const cFactor = Number(conversionRate || subUnit.multiplier || 1);
          let targetUnit = await this.prisma.unit.findFirst({
            where: {
              OR: [
                { name: subUnit.name },
                { shortName: subUnit.name },
              ],
            },
          });
          if (!targetUnit) {
            targetUnit = await this.prisma.unit.create({
              data: {
                name: subUnit.name,
                shortName: subUnit.name.length <= 10 ? subUnit.name.toLowerCase() : subUnit.name.substring(0, 10).toLowerCase(),
              },
            });
          } else if (targetUnit.deletedAt) {
            targetUnit = await this.prisma.unit.update({
              where: { id: targetUnit.id },
              data: { deletedAt: null },
            });
          }

          if (targetUnit.id !== baseUnitId) {
            subPU = await this.prisma.productUnit.findFirst({
              where: { productId, unitId: targetUnit.id },
            });
            if (!subPU) {
              subPU = await this.prisma.productUnit.create({
                data: {
                  productId,
                  unitId: targetUnit.id,
                  conversionFactor: cFactor > 0 ? 1 / cFactor : 1,
                },
              });
            } else {
              subPU = await this.prisma.productUnit.update({
                where: { id: subPU.id },
                data: {
                  deletedAt: null,
                  conversionFactor: cFactor > 0 ? 1 / cFactor : 1,
                },
              });
            }
          } else {
            subPU = basePU;
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
    const relations = await this.resolveRelations(createProductsDto);
    const dtoWithRelations = {
      ...createProductsDto,
      categoryId: relations.categoryId,
      brandId: relations.brandId,
      baseUnitId: relations.baseUnitId,
      conversionRate: relations.conversionRate,
    };
    const rawStock = (dtoWithRelations as any).openingStock ?? (dtoWithRelations as any).stockQuantity ?? (dtoWithRelations as any).stock;
    const initialQty = rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock)) ? Number(rawStock) : 0;
    const data = this.mapMobileDtoToPrisma(dtoWithRelations, false);
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

  async bulkCreate(items: CreateProductsDto[]) {
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    const results: any[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const prod = await this.create(items[i]);
        results.push(prod);
        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push(`Row ${i + 1} (${items[i]?.name || 'Unknown'}): ${err.message}`);
      }
    }

    return {
      total: items.length,
      successCount,
      failCount,
      errors,
      data: results,
    };
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
