import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/data-access/prisma/prisma.service";
import { CreateShiftDto } from "./dto/create-shift.dto";
import { UpdateShiftDto } from "./dto/update-shift.dto";

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShiftDto) {
    const existing = await this.prisma.shift.findFirst({
      where: { code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Shift code "${dto.code}" already exists`);
    }

    return this.prisma.shift.create({
      data: {
        name: dto.name,
        code: dto.code,
        startTime: dto.startTime,
        endTime: dto.endTime,
        lateToleranceMinutes: dto.lateToleranceMinutes ?? 15,
        breakDurationMinutes: dto.breakDurationMinutes ?? 60,
        status: dto.status || "ACTIVE",
        deviceId: dto.deviceId,
      },
    });
  }

  async findAll() {
    return this.prisma.shift.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { id: "desc" },
    });
  }

  async findOne(id: number) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, deletedAt: null },
      include: { employees: true },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    return shift;
  }

  async update(id: number, dto: UpdateShiftDto) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, deletedAt: null },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    if (dto.code && dto.code !== shift.code) {
      const exists = await this.prisma.shift.findFirst({
        where: { code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (exists) {
        throw new ConflictException(`Shift code "${dto.code}" already exists`);
      }
    }

    return this.prisma.shift.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: number) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { employees: true } } },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    if (shift._count.employees > 0) {
      throw new ConflictException(
        `Cannot delete shift "${shift.name}" with ${shift._count.employees} assigned employees`
      );
    }

    return this.prisma.shift.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
