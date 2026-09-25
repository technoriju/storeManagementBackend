import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({
      where: { name: createSupplierDto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException("Supplier name already exists");
    }

    return this.prisma.supplier.create({
      data: createSupplierDto,
    });
  }

  async findAll() {
    return this.prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return item;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    const item = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    if (updateSupplierDto.name && updateSupplierDto.name !== item.name) {
      const existing = await this.prisma.supplier.findFirst({
        where: { name: updateSupplierDto.name, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException("Supplier name already exists");
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...updateSupplierDto,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: number) {
    const item = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }
}
