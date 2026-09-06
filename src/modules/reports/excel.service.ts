import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/data-access/prisma/prisma.service';
import { Workbook, Row, CellValue } from 'exceljs';
import { ReportFiltersDto } from './dto/report-filters.dto';

export interface ProductImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  errors: { row: number; error: string }[];
}

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export all products or filtered products into an Excel file
   */
  async exportProducts(filters?: ReportFiltersDto): Promise<Buffer> {
    const where: any = {
      deletedAt: null,
    };

    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.brandId) where.brandId = filters.brandId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { sku: { contains: filters.search } },
        { productCode: { contains: filters.search } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        baseUnit: true,
        taxRate: true,
        stockBalances: {
          include: {
            warehouse: true,
          },
        },
        prices: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const workbook = new Workbook();
    workbook.creator = 'Billing System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Products', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Define column headers
    sheet.columns = [
      { header: 'Product Code', key: 'productCode', width: 18 },
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Barcode', key: 'barcode', width: 18 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Brand', key: 'brand', width: 18 },
      { header: 'Base Unit', key: 'unit', width: 12 },
      { header: 'HSN Code', key: 'hsnCode', width: 14 },
      { header: 'Tax Rate (%)', key: 'taxRate', width: 14 },
      { header: 'Tax Type', key: 'taxType', width: 12 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 16 },
      { header: 'Selling Price', key: 'sellingPrice', width: 16 },
      { header: 'Current Stock', key: 'currentStock', width: 14 },
      { header: 'Low Stock Level', key: 'lowStockLevel', width: 16 },
      { header: 'Reorder Level', key: 'reorderLevel', width: 14 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Is Active', key: 'isActive', width: 12 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }, // Blue 800
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    // Populate data rows
    products.forEach((product, index) => {
      const totalStock = product.stockBalances.reduce(
        (sum, b) => sum + Number(b.quantity || 0),
        0,
      );

      const purchasePrice =
        product.prices.find((p) => p.priceType === 'PURCHASE')?.price || null;
      const sellingPrice =
        product.prices.find(
          (p) => p.priceType === 'RETAIL' || p.priceType === 'SALE',
        )?.price || null;

      const totalTaxRate = product.taxRate
        ? Number(product.taxRate.cgstRate || 0) +
          Number(product.taxRate.sgstRate || 0) +
          Number(product.taxRate.igstRate || 0)
        : 0;

      const row = sheet.addRow({
        productCode: product.productCode,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || '',
        category: product.category?.name || '',
        brand: product.brand?.name || '',
        unit: product.baseUnit?.name || product.baseUnit?.shortName || '',
        hsnCode: product.hsnCode || '',
        taxRate: totalTaxRate,
        taxType: product.taxType,
        purchasePrice: purchasePrice ? Number(purchasePrice) : '',
        sellingPrice: sellingPrice ? Number(sellingPrice) : '',
        currentStock: totalStock,
        lowStockLevel: product.lowStockLevel ? Number(product.lowStockLevel) : '',
        reorderLevel: product.reorderLevel ? Number(product.reorderLevel) : '',
        description: product.description || '',
        isActive: product.isActive ? 'YES' : 'NO',
      });

      row.height = 20;

      // Alternating row background
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' },
          };
        });
      }

      // Borders and alignments
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        cell.alignment = { vertical: 'middle' };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Import products from Excel file inside a Prisma transaction
   */
  async importProducts(fileBuffer: Buffer): Promise<ProductImportResult> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Empty or invalid file uploaded');
    }

    const workbook = new Workbook();
    try {
      await workbook.xlsx.load(fileBuffer as any);
    } catch (e) {
      throw new BadRequestException(`Failed to parse Excel file: ${e.message}`);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount <= 1) {
      throw new BadRequestException(
        'The uploaded worksheet is empty or missing data rows',
      );
    }

    // Map header names to column indexes
    const headerRow = worksheet.getRow(1);
    const colMap = new Map<string, number>();

    headerRow.eachCell((cell, colNumber) => {
      const val = cell.value?.toString().trim().toLowerCase() || '';
      if (val.includes('code')) colMap.set('productCode', colNumber);
      else if (val.includes('sku')) colMap.set('sku', colNumber);
      else if (val.includes('barcode')) colMap.set('barcode', colNumber);
      else if (val.includes('name')) colMap.set('name', colNumber);
      else if (val.includes('category')) colMap.set('category', colNumber);
      else if (val.includes('brand')) colMap.set('brand', colNumber);
      else if (val.includes('unit')) colMap.set('unit', colNumber);
      else if (val.includes('hsn')) colMap.set('hsnCode', colNumber);
      else if (val.includes('tax rate') || val.includes('gst'))
        colMap.set('taxRate', colNumber);
      else if (val.includes('tax type')) colMap.set('taxType', colNumber);
      else if (val.includes('purchase price') || val.includes('cost'))
        colMap.set('purchasePrice', colNumber);
      else if (val.includes('selling price') || val.includes('sale price'))
        colMap.set('sellingPrice', colNumber);
      else if (val.includes('stock') || val.includes('qty') || val.includes('quantity'))
        colMap.set('stock', colNumber);
      else if (val.includes('low stock')) colMap.set('lowStockLevel', colNumber);
      else if (val.includes('reorder')) colMap.set('reorderLevel', colNumber);
      else if (val.includes('description')) colMap.set('description', colNumber);
      else if (val.includes('active')) colMap.set('isActive', colNumber);
    });

    const getCellValue = (row: Row, field: string): any => {
      const col = colMap.get(field);
      if (!col) return undefined;
      const cell = row.getCell(col);
      const val = cell.value;
      if (val === null || val === undefined) return undefined;
      if (typeof val === 'object' && 'result' in (val as any)) {
        return (val as any).result;
      }
      return val;
    };

    let totalRows = 0;
    let importedCount = 0;
    let updatedCount = 0;
    const errors: { row: number; error: string }[] = [];

    // Process all imports inside a Prisma transaction
    await this.prisma.$transaction(
      async (tx) => {
        // Find default warehouse for stock balance updates
        const defaultWarehouse = await tx.warehouse.findFirst();

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
          const row = worksheet.getRow(rowNumber);
          // Skip completely empty rows
          if (!row.hasValues) continue;

          totalRows++;

          const name = getCellValue(row, 'name')?.toString().trim();
          let productCode = getCellValue(row, 'productCode')?.toString().trim();
          let sku = getCellValue(row, 'sku')?.toString().trim();

          if (!name) {
            errors.push({
              row: rowNumber,
              error: 'Product Name is required',
            });
            continue;
          }

          // Generate productCode and sku if missing
          if (!productCode && !sku) {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            productCode = `PRD-${Date.now().toString().slice(-4)}-${randomSuffix}`;
            sku = `SKU-${Date.now().toString().slice(-4)}-${randomSuffix}`;
          } else if (!productCode) {
            productCode = `PRD-${sku}`;
          } else if (!sku) {
            sku = `SKU-${productCode}`;
          }

          const barcode = getCellValue(row, 'barcode')?.toString().trim() || null;
          const categoryName = getCellValue(row, 'category')?.toString().trim();
          const brandName = getCellValue(row, 'brand')?.toString().trim();
          const unitName = getCellValue(row, 'unit')?.toString().trim() || 'PCS';
          const hsnCode = getCellValue(row, 'hsnCode')?.toString().trim() || null;
          const taxRateVal = Number(getCellValue(row, 'taxRate') || 0);
          const taxTypeStr = getCellValue(row, 'taxType')?.toString().trim().toUpperCase();
          const taxType = taxTypeStr === 'NON_GST' ? 'NON_GST' : 'GST';

          const purchasePrice = getCellValue(row, 'purchasePrice');
          const sellingPrice = getCellValue(row, 'sellingPrice');
          const stock = getCellValue(row, 'stock');
          const lowStock = getCellValue(row, 'lowStockLevel');
          const reorder = getCellValue(row, 'reorderLevel');
          const description = getCellValue(row, 'description')?.toString().trim() || null;
          const activeVal = getCellValue(row, 'isActive')?.toString().trim().toUpperCase();
          const isActive = activeVal === 'NO' || activeVal === 'FALSE' ? false : true;

          try {
            // 1. Resolve Base Unit
            let unit = await tx.unit.findFirst({
              where: {
                OR: [
                  { name: { equals: unitName } },
                  { shortName: { equals: unitName } },
                ],
              },
            });
            if (!unit) {
              unit = await tx.unit.create({
                data: {
                  name: unitName,
                  shortName: unitName.slice(0, 8).toUpperCase(),
                },
              });
            }

            // 2. Resolve Category
            let categoryId: string | null = null;
            if (categoryName) {
              let category = await tx.category.findFirst({
                where: { name: { equals: categoryName } },
              });
              if (!category) {
                category = await tx.category.create({
                  data: { name: categoryName },
                });
              }
              categoryId = category.id;
            }

            // 3. Resolve Brand
            let brandId: string | null = null;
            if (brandName) {
              let brand = await tx.brand.findFirst({
                where: { name: { equals: brandName } },
              });
              if (!brand) {
                brand = await tx.brand.create({
                  data: { name: brandName },
                });
              }
              brandId = brand.id;
            }

            // 4. Resolve Tax Rate
            let taxRateId: string | null = null;
            if (taxRateVal > 0) {
              const halfRate = taxRateVal / 2;
              let taxRate = await tx.taxRate.findFirst({
                where: {
                  cgstRate: halfRate,
                  sgstRate: halfRate,
                },
              });
              if (!taxRate) {
                taxRate = await tx.taxRate.create({
                  data: {
                    name: `GST ${taxRateVal}%`,
                    cgstRate: halfRate,
                    sgstRate: halfRate,
                    igstRate: taxRateVal,
                  },
                });
              }
              taxRateId = taxRate.id;
            }

            // 5. Check if product exists
            let existing = await tx.product.findFirst({
              where: {
                OR: [{ productCode }, { sku }],
              },
            });

            let product: any;

            if (existing) {
              // Update product
              product = await tx.product.update({
                where: { id: existing.id },
                data: {
                  name,
                  barcode: barcode || existing.barcode,
                  categoryId: categoryId || existing.categoryId,
                  brandId: brandId || existing.brandId,
                  baseUnitId: unit.id,
                  taxRateId: taxRateId || existing.taxRateId,
                  taxType,
                  hsnCode: hsnCode || existing.hsnCode,
                  description: description || existing.description,
                  isActive,
                  lowStockLevel: lowStock ? Number(lowStock) : existing.lowStockLevel,
                  reorderLevel: reorder ? Number(reorder) : existing.reorderLevel,
                },
              });
              updatedCount++;
            } else {
              // Create product
              product = await tx.product.create({
                data: {
                  name,
                  productCode,
                  sku,
                  barcode,
                  categoryId,
                  brandId,
                  baseUnitId: unit.id,
                  taxRateId,
                  taxType,
                  hsnCode,
                  description,
                  isActive,
                  lowStockLevel: lowStock ? Number(lowStock) : null,
                  reorderLevel: reorder ? Number(reorder) : null,
                },
              });
              importedCount++;
            }

            // 6. Ensure default ProductUnit
            let productUnit = await tx.productUnit.findUnique({
              where: {
                productId_unitId: {
                  productId: product.id,
                  unitId: unit.id,
                },
              },
            });

            if (!productUnit) {
              productUnit = await tx.productUnit.create({
                data: {
                  productId: product.id,
                  unitId: unit.id,
                  conversionFactor: 1.0,
                },
              });
            }

            // 7. Upsert Prices if provided
            if (purchasePrice !== undefined && purchasePrice !== null && !isNaN(Number(purchasePrice))) {
              await tx.productPrice.upsert({
                where: {
                  productId_productUnitId_priceType: {
                    productId: product.id,
                    productUnitId: productUnit.id,
                    priceType: 'PURCHASE',
                  },
                },
                create: {
                  productId: product.id,
                  productUnitId: productUnit.id,
                  priceType: 'PURCHASE',
                  price: Number(purchasePrice),
                },
                update: {
                  price: Number(purchasePrice),
                },
              });
            }

            if (sellingPrice !== undefined && sellingPrice !== null && !isNaN(Number(sellingPrice))) {
              await tx.productPrice.upsert({
                where: {
                  productId_productUnitId_priceType: {
                    productId: product.id,
                    productUnitId: productUnit.id,
                    priceType: 'RETAIL',
                  },
                },
                create: {
                  productId: product.id,
                  productUnitId: productUnit.id,
                  priceType: 'RETAIL',
                  price: Number(sellingPrice),
                },
                update: {
                  price: Number(sellingPrice),
                },
              });
            }

            // 8. Upsert Stock Balance if provided and warehouse exists
            if (stock !== undefined && stock !== null && !isNaN(Number(stock)) && defaultWarehouse) {
              await tx.stockBalance.upsert({
                where: {
                  productId_warehouseId: {
                    productId: product.id,
                    warehouseId: defaultWarehouse.id,
                  },
                },
                create: {
                  productId: product.id,
                  warehouseId: defaultWarehouse.id,
                  quantity: Number(stock),
                },
                update: {
                  quantity: Number(stock),
                },
              });
            }
          } catch (rowErr) {
            this.logger.error(`Error importing row ${rowNumber}:`, rowErr);
            errors.push({
              row: rowNumber,
              error: rowErr.message || 'Failed to process row',
            });
          }
        }
      },
      {
        timeout: 90000, // 90 seconds timeout for larger transactions
      },
    );

    return {
      success: errors.length === 0 || importedCount + updatedCount > 0,
      totalRows,
      importedCount,
      updatedCount,
      errors,
    };
  }

  /**
   * Generic Excel export utility for tabular reports
   */
  async exportReportToExcel(
    sheetName: string,
    columns: { header: string; key: string; width?: number }[],
    data: any[],
  ): Promise<Buffer> {
    const workbook = new Workbook();
    workbook.creator = 'Billing System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 18,
    }));

    // Style Header
    const headerRow = sheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' }, // Gray 800
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'medium', color: { argb: 'FF111827' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    // Populate rows
    data.forEach((item, index) => {
      const row = sheet.addRow(item);
      row.height = 20;

      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' },
          };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        cell.alignment = { vertical: 'middle' };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
