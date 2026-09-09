import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateProductsDto } from "./dto/create-product.dto";
import { UpdateProductsDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductsDto: CreateProductsDto) {
    return this.prisma.product.create({
      data: createProductsDto as unknown as Prisma.ProductUncheckedCreateInput,
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
    });
  }

  async findOne(id: any) {
    const item = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException("Products not found");
    }
    return item;
  }

  async update(id: any, updateProductsDto: UpdateProductsDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: updateProductsDto as unknown as Prisma.ProductUncheckedUpdateInput,
    });
  }

  async remove(id: any) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
