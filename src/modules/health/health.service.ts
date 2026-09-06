import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    let dbStatus = "down";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = "up";
    } catch (error) {
      dbStatus = "down";
    }

    return {
      status: "ok",
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
