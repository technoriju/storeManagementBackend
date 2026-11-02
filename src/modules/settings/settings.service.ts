import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return (this.prisma as any).setting.findMany({
      where: { deletedAt: null },
      orderBy: { key: "asc" },
    });
  }

  async findByKey(key: string) {
    const setting = await (this.prisma as any).setting.findFirst({
      where: { key, deletedAt: null },
    });

    if (!setting) {
      return { key, value: null };
    }

    return setting;
  }

  async upsert(key: string, value: any, deviceId?: string) {
    const strVal =
      value !== undefined && value !== null
        ? typeof value === "object"
          ? JSON.stringify(value)
          : String(value)
        : null;

    const existing = await (this.prisma as any).setting.findUnique({
      where: { key },
    });

    if (existing) {
      return (this.prisma as any).setting.update({
        where: { key },
        data: {
          value: strVal,
          deletedAt: null,
          version: (existing.version || 1) + 1,
          ...(deviceId ? { deviceId } : {}),
        },
      });
    }

    return (this.prisma as any).setting.create({
      data: {
        key,
        value: strVal,
        ...(deviceId ? { deviceId } : {}),
      },
    });
  }

  async remove(key: string) {
    const existing = await (this.prisma as any).setting.findFirst({
      where: { key, deletedAt: null },
    });

    if (!existing) {
      return { success: true };
    }

    return (this.prisma as any).setting.update({
      where: { key },
      data: {
        deletedAt: new Date(),
        version: (existing.version || 1) + 1,
      },
    });
  }
}
