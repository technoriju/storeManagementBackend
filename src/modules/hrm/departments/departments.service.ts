import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/data-access/prisma/prisma.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findFirst({
      where: { code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Department code "${dto.code}" already exists`);
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        code: dto.code,
        managerName: dto.managerName,
        description: dto.description,
        status: dto.status || "ACTIVE",
        deviceId: dto.deviceId,
      },
    });
  }

  async findAll() {
    return this.prisma.department.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { id: "desc" },
    });
  }

  async findOne(id: number) {
    const dept = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        employees: true,
        designations: true,
      },
    });

    if (!dept) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return dept;
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    const dept = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
    });

    if (!dept) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (dto.code && dto.code !== dept.code) {
      const codeExists = await this.prisma.department.findFirst({
        where: { code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (codeExists) {
        throw new ConflictException(`Department code "${dto.code}" already exists`);
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: number) {
    const dept = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { employees: true } } },
    });

    if (!dept) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (dept._count.employees > 0) {
      throw new ConflictException(
        `Cannot delete department "${dept.name}" with ${dept._count.employees} assigned employees`
      );
    }

    return this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
