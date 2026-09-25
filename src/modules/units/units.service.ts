import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUnitDto: CreateUnitDto) {
    const existing = await this.prisma.unit.findFirst({
      where: { name: createUnitDto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException("Unit name already exists");
    }

    return this.prisma.unit.create({
      data: createUnitDto,
    });
  }

  async findAll() {
    return this.prisma.unit.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    return item;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto) {
    const item = await this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    if (updateUnitDto.name && updateUnitDto.name !== item.name) {
      const existing = await this.prisma.unit.findFirst({
        where: { name: updateUnitDto.name, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException("Unit name already exists");
      }
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        ...updateUnitDto,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: number) {
    const item = await this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }
}
