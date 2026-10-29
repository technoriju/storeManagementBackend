import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/data-access/prisma/prisma.service";
import { CreateHolidayDto } from "./dto/create-holiday.dto";

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHolidayDto) {
    return this.prisma.holiday.create({
      data: {
        name: dto.name,
        date: new Date(dto.date),
        type: dto.type || "PUBLIC",
        description: dto.description,
        status: dto.status || "ACTIVE",
        deviceId: dto.deviceId,
      },
    });
  }

  async findAll(type?: string, year?: number) {
    const where: any = { deletedAt: null };
    if (type && type !== "ALL") {
      where.type = type;
    }
    if (year) {
      where.date = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      };
    }

    return this.prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
    });
  }

  async remove(id: number) {
    const h = await this.prisma.holiday.findFirst({
      where: { id, deletedAt: null },
    });
    if (!h) {
      throw new NotFoundException(`Holiday ${id} not found`);
    }

    return this.prisma.holiday.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
