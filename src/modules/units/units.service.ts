import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateUnitsDto } from "./dto/create-unit.dto";
import { UpdateUnitsDto } from "./dto/update-unit.dto";

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(createUnitsDto: CreateUnitsDto) {
    return this.prisma.unit.create({
      data: createUnitsDto,
    });
  }

  async findAll() {
    return this.prisma.unit.findMany({
      where: { deletedAt: null },
    });
  }

  async findOne(id: any) {
    const item = await this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException("Units not found");
    }
    return item;
  }

  async update(id: any, updateUnitsDto: UpdateUnitsDto) {
    await this.findOne(id);
    return this.prisma.unit.update({
      where: { id },
      data: updateUnitsDto,
    });
  }

  async remove(id: any) {
    await this.findOne(id);
    return this.prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
