import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateSubUnitDto } from "./dto/create-subunit.dto";
import { UpdateSubUnitDto } from "./dto/update-subunit.dto";

@Injectable()
export class SubUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubUnitDto) {
    await this.ensureParent(dto.parentUnitId);
    const existing = await this.prisma.subUnit.findFirst({
      where: { parentUnitId: dto.parentUnitId, name: dto.name, deletedAt: null },
    });
    if (existing) throw new ConflictException("Sub-unit name already exists");
    return this.prisma.subUnit.create({ data: dto as Prisma.SubUnitUncheckedCreateInput });
  }

  findAll() {
    return this.prisma.subUnit.findMany({ where: { deletedAt: null }, orderBy: { id: "desc" } });
  }

  async findOne(id: number) {
    const item = await this.prisma.subUnit.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundException(`Sub-unit with ID ${id} not found`);
    return item;
  }

  async update(id: number, dto: UpdateSubUnitDto) {
    const item = await this.findOne(id);
    const parentUnitId = dto.parentUnitId ?? item.parentUnitId;
    await this.ensureParent(parentUnitId);
    if (dto.name || dto.parentUnitId) {
      const existing = await this.prisma.subUnit.findFirst({
        where: { parentUnitId, name: dto.name ?? item.name, id: { not: id }, deletedAt: null },
      });
      if (existing) throw new ConflictException("Sub-unit name already exists");
    }
    return this.prisma.subUnit.update({ where: { id }, data: { ...dto, version: { increment: 1 } } });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.subUnit.update({ where: { id }, data: { deletedAt: new Date(), version: { increment: 1 } } });
  }

  private async ensureParent(parentUnitId: number) {
    const parent = await this.prisma.unit.findFirst({ where: { id: parentUnitId, deletedAt: null } });
    if (!parent) throw new NotFoundException(`Parent unit with ID ${parentUnitId} not found`);
  }
}
