import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBrandDto: CreateBrandDto) {
    const existing = await this.prisma.brand.findFirst({
      where: { name: createBrandDto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException("Brand name already exists");
    }

    return this.prisma.brand.create({
      data: createBrandDto,
    });
  }

  async findAll() {
    return this.prisma.brand.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return item;
  }

  async update(id: number, updateBrandDto: UpdateBrandDto) {
    const item = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    if (updateBrandDto.name && updateBrandDto.name !== item.name) {
      const existing = await this.prisma.brand.findFirst({
        where: { name: updateBrandDto.name, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException("Brand name already exists");
      }
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        ...updateBrandDto,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: number) {
    const item = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }
}
