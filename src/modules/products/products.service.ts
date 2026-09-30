import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateProductsDto } from "./dto/create-product.dto";
import { UpdateProductsDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private mapMobileDtoToPrisma(dto: any) {
    const data = { ...dto };
    
    // Map mobile fields to backend fields
    if (data.unitId) {
      data.baseUnitId = data.baseUnitId || data.unitId;
    }
    if (!data.baseUnitId) {
      data.baseUnitId = 1; // Fallback
    }
    
    if (!data.productCode && data.sku) {
      data.productCode = data.sku;
    }
    if (!data.productCode) {
      data.productCode = \PROD-\\; // Fallback
    }
    
    if (data.price !== undefined) data.retailPrice = data.price;
    if (data.cost !== undefined) data.purchasePrice = data.cost;
    if (data.lowStockThreshold !== undefined) data.lowStockLevel = data.lowStockThreshold;
    
    // Remove offline/unmapped fields so Prisma doesn't crash
    delete data.id;
    delete data.price;
    delete data.cost;
    delete data.unitId;
    delete data.subUnitId;
    delete data.subunitId;
    delete data.conversionRate;
    delete data.stockQuantity;
    delete data.lowStockThreshold;
    delete data.syncStatus;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.mrp;
    delete data.hsn;
    delete data.gst;
    delete data.openingStock;

    return data as Prisma.ProductUncheckedCreateInput;
  }

  async create(createProductsDto: CreateProductsDto) {
    const data = this.mapMobileDtoToPrisma(createProductsDto);
    return this.prisma.product.create({ data });
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: any) {
    const item = await this.prisma.product.findFirst({
      where: { id: BigInt(id), deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException("Products not found");
    }
    return item;
  }

  async update(id: any, updateProductsDto: UpdateProductsDto) {
    await this.findOne(id);
    const data = this.mapMobileDtoToPrisma(updateProductsDto) as Prisma.ProductUncheckedUpdateInput;
    return this.prisma.product.update({
      where: { id: BigInt(id) },
      data,
    });
  }

  async remove(id: any) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() },
    });
  }
}
