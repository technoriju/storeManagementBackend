import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/data-access/prisma/prisma.service";
import { CreateDesignationDto } from "./dto/create-designation.dto";
import { UpdateDesignationDto } from "./dto/update-designation.dto";

@Injectable()
export class DesignationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDesignationDto) {
    const existing = await this.prisma.designation.findFirst({
      where: { code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Designation code "${dto.code}" already exists`);
    }

    let departmentName = dto.departmentName;
    if (dto.departmentId && !departmentName) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      departmentName = dept?.name;
    }

    return this.prisma.designation.create({
      data: {
        name: dto.name,
        code: dto.code,
        departmentId: dto.departmentId,
        departmentName,
        description: dto.description,
        status: dto.status || "ACTIVE",
        deviceId: dto.deviceId,
      },
    });
  }

  async findAll(departmentId?: number) {
    const where: any = { deletedAt: null };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    return this.prisma.designation.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { id: "desc" },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.designation.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: true,
        employees: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Designation with ID ${id} not found`);
    }

    return item;
  }

  async update(id: number, dto: UpdateDesignationDto) {
    const item = await this.prisma.designation.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Designation with ID ${id} not found`);
    }

    if (dto.code && dto.code !== item.code) {
      const exists = await this.prisma.designation.findFirst({
        where: { code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (exists) {
        throw new ConflictException(`Designation code "${dto.code}" already exists`);
      }
    }

    let departmentName = dto.departmentName;
    if (dto.departmentId && !departmentName) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      departmentName = dept?.name;
    }

    return this.prisma.designation.update({
      where: { id },
      data: {
        ...dto,
        departmentName: departmentName || item.departmentName,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: number) {
    const item = await this.prisma.designation.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { employees: true } } },
    });

    if (!item) {
      throw new NotFoundException(`Designation with ID ${id} not found`);
    }

    if (item._count.employees > 0) {
      throw new ConflictException(
        `Cannot delete designation "${item.name}" with ${item._count.employees} assigned employees`
      );
    }

    return this.prisma.designation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
