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
    if (data.subUnitId) {
      const validSub = await this.prisma.subUnit.findFirst({
        where: { id: Number(data.subUnitId), deletedAt: null },
      });
      if (!validSub) {
        data.subUnitId = null;
      }
    }
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

  async bulkCreate(items: any[]) {
    return this.bulkImport(items);
  }

  async bulkImport(rawItems: any[]) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return {
        success: true,
        total: 0,
        createdCount: 0,
        updatedCount: 0,
        failCount: 0,
        errors: [],
        data: [],
      };
    }

    // --- STEP 1: Collect unique Category, Brand, and Unit names ---
    const categoryNameMap = new Map<string, string>(); // lower -> original
    const brandNameMap = new Map<string, string>(); // lower -> original
    const unitNameMap = new Map<string, string>(); // lower -> original

    for (const item of rawItems) {
      if (!item) continue;
      const catName = String(
        item.categoryName ||
          item.category?.name ||
          (typeof item.category === "string" ? item.category : "") ||
          "",
      ).trim();
      if (catName && !item.categoryId) {
        categoryNameMap.set(catName.toLowerCase(), catName);
      }

      const bName = String(
        item.brandName ||
          item.brand?.name ||
          (typeof item.brand === "string" ? item.brand : "") ||
          "",
      ).trim();
      if (bName && !item.brandId) {
        brandNameMap.set(bName.toLowerCase(), bName);
      }

      const uName = String(
        item.unit ||
          item.baseUnitName ||
          item.unitName ||
          item.baseUnit?.name ||
          "",
      ).trim();
      if (uName && !item.baseUnitId && !item.unitId) {
        unitNameMap.set(uName.toLowerCase(), uName);
      }
    }

    // --- STEP 2: Pre-create / Resolve Categories ---
    const categoryIdMap = new Map<string, number>(); // lowerName -> id
    const existingCats = await this.prisma.category.findMany({
      where: { deletedAt: null },
    });
    for (const cat of existingCats) {
      categoryIdMap.set(cat.name.toLowerCase().trim(), cat.id);
    }
    for (const [lowerName, originalName] of categoryNameMap.entries()) {
      if (!categoryIdMap.has(lowerName)) {
        try {
          const createdCat = await this.prisma.category.create({
            data: { name: originalName, status: "ACTIVE" },
          });
          categoryIdMap.set(lowerName, createdCat.id);
        } catch (_) {
          const refetchCat = await this.prisma.category.findFirst({
            where: { name: originalName, deletedAt: null },
          });
          if (refetchCat) categoryIdMap.set(lowerName, refetchCat.id);
        }
      }
    }

    // --- STEP 3: Pre-create / Resolve Brands ---
    const brandIdMap = new Map<string, number>(); // lowerName -> id
    const existingBrands = await this.prisma.brand.findMany({
      where: { deletedAt: null },
    });
    for (const brand of existingBrands) {
      brandIdMap.set(brand.name.toLowerCase().trim(), brand.id);
    }
    for (const [lowerName, originalName] of brandNameMap.entries()) {
      if (!brandIdMap.has(lowerName)) {
        try {
          const createdBrand = await this.prisma.brand.create({
            data: { name: originalName, status: "ACTIVE" },
          });
          brandIdMap.set(lowerName, createdBrand.id);
        } catch (_) {
          const refetchBrand = await this.prisma.brand.findFirst({
            where: { name: originalName, deletedAt: null },
          });
          if (refetchBrand) brandIdMap.set(lowerName, refetchBrand.id);
        }
      }
    }

    // --- STEP 4: Pre-create / Resolve Units ---
    const unitIdMap = new Map<string, number>(); // lowerName -> id
    const existingUnits = await this.prisma.unit.findMany({
      where: { deletedAt: null },
    });
    for (const unit of existingUnits) {
      unitIdMap.set(unit.name.toLowerCase().trim(), unit.id);
      if (unit.shortName) {
        unitIdMap.set(unit.shortName.toLowerCase().trim(), unit.id);
      }
    }
    for (const [lowerName, originalName] of unitNameMap.entries()) {
      if (!unitIdMap.has(lowerName)) {
        try {
          const shortName =
            originalName.length <= 10
              ? originalName.toLowerCase()
              : originalName.substring(0, 10).toLowerCase();
          const createdUnit = await this.prisma.unit.create({
            data: { name: originalName, shortName, status: "ACTIVE" },
          });
          unitIdMap.set(lowerName, createdUnit.id);
          unitIdMap.set(shortName.toLowerCase(), createdUnit.id);
        } catch (_) {
          const refetchUnit = await this.prisma.unit.findFirst({
            where: { name: originalName, deletedAt: null },
          });
          if (refetchUnit) unitIdMap.set(lowerName, refetchUnit.id);
        }
      }
    }

    let defaultUnitId: number;
    if (existingUnits.length > 0) {
      defaultUnitId = existingUnits[0].id;
    } else {
      const defUnit = await this.prisma.unit.create({
        data: { name: "Piece", shortName: "pcs", status: "ACTIVE" },
      });
      defaultUnitId = defUnit.id;
    }

    // Default warehouse for stock balance updates
    let defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { deletedAt: null },
    });
    if (!defaultWarehouse) {
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
      defaultWarehouse = await this.prisma.warehouse.create({
        data: { name: "Default Warehouse", branchId: branch.id, status: "ACTIVE" },
      });
    }

    // Tax rate cache
    const taxRateCache = new Map<number, number>();
    const existingTaxRates = await this.prisma.taxRate.findMany({
      where: { deletedAt: null },
    });
    for (const tr of existingTaxRates) {
      const full = Number(tr.cgstRate || 0) + Number(tr.sgstRate || 0);
      taxRateCache.set(Math.round(full * 100) / 100, tr.id);
      if (tr.igstRate) {
        taxRateCache.set(Math.round(Number(tr.igstRate) * 100) / 100, tr.id);
      }
    }

    // --- STEP 5: Process each product row ---
    let createdCount = 0;
    let updatedCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    const results: any[] = [];

    const toNum = (val: any, defaultVal = 0): number => {
      if (val === undefined || val === null || val === "") return defaultVal;
      const n = Number(String(val).replace(/[^0-9.-]/g, ""));
      return isNaN(n) ? defaultVal : n;
    };

    const toStrOrNull = (val: any): string | null => {
      if (val === undefined || val === null) return null;
      const s = String(val).trim();
      return s.length > 0 && s.toLowerCase() !== "null" ? s : null;
    };

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const rowIdx = i + 1;
      try {
        const name = toStrOrNull(item.name);
        if (!name) {
          failCount++;
          errors.push(`Row ${rowIdx}: Product name is required`);
          continue;
        }

        let sku = toStrOrNull(item.sku);
        let productCode = toStrOrNull(item.productCode || item.code);
        if (!sku && !productCode) {
          const gen = `PRD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
          sku = gen;
          productCode = gen;
        } else if (!sku) {
          sku = productCode!;
        } else if (!productCode) {
          productCode = sku!;
        }

        // Category resolution
        let categoryId: number | null = null;
        if (item.categoryId && Number(item.categoryId) > 0) {
          categoryId = Number(item.categoryId);
        } else {
          const catName = String(
            item.categoryName ||
              item.category?.name ||
              (typeof item.category === "string" ? item.category : "") ||
              "",
          )
            .trim()
            .toLowerCase();
          if (catName && categoryIdMap.has(catName)) {
            categoryId = categoryIdMap.get(catName)!;
          }
        }

        // Brand resolution
        let brandId: number | null = null;
        if (item.brandId && Number(item.brandId) > 0) {
          brandId = Number(item.brandId);
        } else {
          const bName = String(
            item.brandName ||
              item.brand?.name ||
              (typeof item.brand === "string" ? item.brand : "") ||
              "",
          )
            .trim()
            .toLowerCase();
          if (bName && brandIdMap.has(bName)) {
            brandId = brandIdMap.get(bName)!;
          }
        }

        // Unit resolution
        let baseUnitId: number = defaultUnitId;
        const rawUnitId = item.baseUnitId || item.unitId;
        if (rawUnitId && Number(rawUnitId) > 0) {
          baseUnitId = Number(rawUnitId);
        } else {
          const uName = String(
            item.unit ||
              item.baseUnitName ||
              item.unitName ||
              item.baseUnit?.name ||
              "",
          )
            .trim()
            .toLowerCase();
          if (uName && unitIdMap.has(uName)) {
            baseUnitId = unitIdMap.get(uName)!;
          }
        }

        // Subunit & conversionRate
        let subUnitId: number | null = null;
        const rawSubUnitId = item.subUnitId || item.subunitId;
        if (rawSubUnitId && Number(rawSubUnitId) > 0) {
          subUnitId = Number(rawSubUnitId);
        }
        let conversionRate = toNum(item.conversionRate, 0);
        if (conversionRate <= 0) {
          const rawSub = toNum(item.subunit || item.subUnit, 0);
          conversionRate = rawSub > 0 ? rawSub : 1;
        }

        // Tax Rate resolution
        let taxRateId: number | null = null;
        if (item.taxRateId && Number(item.taxRateId) > 0) {
          taxRateId = Number(item.taxRateId);
        } else {
          const gstVal = toNum(item.gst || item.taxRate, 0);
          if (gstVal > 0) {
            const rounded = Math.round(gstVal * 100) / 100;
            if (taxRateCache.has(rounded)) {
              taxRateId = taxRateCache.get(rounded)!;
            } else {
              const half = rounded / 2;
              try {
                const newTaxRate = await this.prisma.taxRate.create({
                  data: {
                    name: `GST ${rounded}%`,
                    cgstRate: half,
                    sgstRate: half,
                    igstRate: rounded,
                    status: "ACTIVE",
                  },
                });
                taxRateCache.set(rounded, newTaxRate.id);
                taxRateId = newTaxRate.id;
              } catch (_) {}
            }
          }
        }

        // Numbers default to 0
        const purchasePrice = toNum(item.purchasePrice ?? item.cost, 0);
        const wholesalePrice = toNum(item.wholesalePrice, 0);
        const retailPrice = toNum(item.retailPrice ?? item.price, 0);
        const openingStock = toNum(
          item.openingStock ?? item.stockQuantity ?? item.stock,
          0,
        );
        const lowStockLevel = toNum(
          item.lowStockLevel ?? item.lowStockThreshold,
          0,
        );
        const reorderLevel = toNum(item.reorderLevel, 0);

        // Strings: blank -> null
        const barcode = toStrOrNull(item.barcode);
        const hsnCode = toStrOrNull(item.hsnCode ?? item.hsn);
        const description = toStrOrNull(item.description);
        const taxType = item.taxType === "NON_GST" ? "NON_GST" : "GST";
        const isActive = item.isActive !== false;
        const isPriceInclusive = item.isPriceInclusive === true;

        // Check if product exists by SKU or Product Code
        const existing = await this.prisma.product.findFirst({
          where: {
            OR: [{ sku }, { productCode }],
            deletedAt: null,
          },
        });

        let savedProduct: any;

        if (existing) {
          savedProduct = await this.prisma.product.update({
            where: { id: existing.id },
            data: {
              name,
              sku,
              productCode,
              barcode: barcode || existing.barcode,
              categoryId: categoryId !== null ? categoryId : existing.categoryId,
              brandId: brandId !== null ? brandId : existing.brandId,
              baseUnitId,
              subUnitId: subUnitId !== null ? subUnitId : existing.subUnitId,
              conversionRate,
              taxRateId: taxRateId !== null ? taxRateId : existing.taxRateId,
              taxType,
              purchasePrice,
              wholesalePrice,
              retailPrice,
              lowStockLevel,
              reorderLevel,
              hsnCode: hsnCode || existing.hsnCode,
              description: description || existing.description,
              isActive,
              isPriceInclusive,
            },
          });
          updatedCount++;
        } else {
          savedProduct = await this.prisma.product.create({
            data: {
              name,
              sku,
              productCode,
              barcode,
              categoryId,
              brandId,
              baseUnitId,
              subUnitId,
              conversionRate,
              taxRateId,
              taxType,
              purchasePrice,
              wholesalePrice,
              retailPrice,
              lowStockLevel,
              reorderLevel,
              hsnCode,
              description,
              isActive,
              isPriceInclusive,
              status: "ACTIVE",
            },
          });
          createdCount++;
        }

        // Ensure ProductUnit entries
        if (savedProduct.baseUnitId) {
          await this.ensureProductUnits(
            savedProduct.id,
            savedProduct.baseUnitId,
            savedProduct.subUnitId,
            Number(savedProduct.conversionRate || 1),
          );
        }

        // Opening stock handling
        if (openingStock > 0 && defaultWarehouse) {
          try {
            const existingBalance = await this.prisma.stockBalance.findFirst({
              where: {
                productId: savedProduct.id,
                warehouseId: defaultWarehouse.id,
                deletedAt: null,
              },
            });
            if (existingBalance) {
              await this.prisma.stockBalance.update({
                where: { id: existingBalance.id },
                data: { quantity: openingStock },
              });
            } else {
              await this.prisma.stockBalance.create({
                data: {
                  productId: savedProduct.id,
                  warehouseId: defaultWarehouse.id,
                  quantity: openingStock,
                },
              });
            }

            await this.prisma.stockTransaction.create({
              data: {
                productId: savedProduct.id,
                warehouseId: defaultWarehouse.id,
                transactionType: "OPENING_STOCK",
                referenceId: `OPENING-${savedProduct.id}-${Date.now()}`,
                unitId: savedProduct.baseUnitId || undefined,
                unitQuantity: openingStock,
                baseQuantity: openingStock,
              },
            });
          } catch (stkErr) {
            console.warn(`Stock balance warning for row ${rowIdx}:`, stkErr);
          }
        }

        results.push({
          id: savedProduct.id.toString(),
          name: savedProduct.name,
          sku: savedProduct.sku,
          productCode: savedProduct.productCode,
          purchasePrice,
          wholesalePrice,
          retailPrice,
          stockQuantity: openingStock,
          categoryId: savedProduct.categoryId,
          categoryName: item.categoryName || null,
          brandId: savedProduct.brandId,
          brandName: item.brandName || null,
          baseUnitId: savedProduct.baseUnitId,
          unitName: item.unitName || item.unit || "Piece",
          conversionRate,
          barcode,
          hsnCode,
          description,
        });
      } catch (rowErr: any) {
        failCount++;
        errors.push(`Row ${rowIdx} (${item?.name || "Unknown"}): ${rowErr.message}`);
      }
    }

    return {
      success: failCount === 0,
      total: rawItems.length,
      createdCount,
      updatedCount,
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
        unitName: p.baseUnit?.name ?? null,
        baseUnitName: p.baseUnit?.name ?? null,
        brandName: p.brand?.name ?? null,
        subUnitName: p.subUnit?.name ?? null,
        categoryName: p.category?.name ?? null,
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
      unitName: item.baseUnit?.name ?? null,
      baseUnitName: item.baseUnit?.name ?? null,
      brandName: item.brand?.name ?? null,
      subUnitName: item.subUnit?.name ?? null,
      categoryName: item.category?.name ?? null,
    };
  }

  async update(id: any, updateProductsDto: UpdateProductsDto) {
    await this.findOne(id);
    const rawStock = (updateProductsDto as any).openingStock ?? (updateProductsDto as any).stockQuantity;
    const data = this.mapMobileDtoToPrisma(updateProductsDto, true) as Prisma.ProductUncheckedUpdateInput;
    if (data.subUnitId) {
      const validSub = await this.prisma.subUnit.findFirst({
        where: { id: Number(data.subUnitId), deletedAt: null },
      });
      if (!validSub) {
        data.subUnitId = null;
      }
    }
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
    const bigId = BigInt(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.stockBalance.updateMany({
        where: { productId: bigId },
        data: { deletedAt: new Date() },
      });
      await tx.productUnit.updateMany({
        where: { productId: bigId },
        data: { deletedAt: new Date() },
      });
      return tx.product.update({
        where: { id: bigId },
        data: { deletedAt: new Date() },
      });
    });
  }
}
