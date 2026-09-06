import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ["warn", "error"],
    });
  }

  async onModuleInit() {
    await this.$connect();

    // Audit Middleware
    this.$use(async (params, next) => {
      const result = await next(params);

      const auditModels = [
        "ProductPrice",
        "StockTransaction",
        "Sale",
        "Purchase",
        "Payment",
        "RolePermission",
        "User",
      ];

      const writeActions = [
        "create",
        "update",
        "delete",
        "upsert",
        "createMany",
        "updateMany",
        "deleteMany",
      ];

      if (
        params.model &&
        auditModels.includes(params.model) &&
        writeActions.includes(params.action)
      ) {
        try {
          let entityId = "unknown";
          if (result && result.id) {
            entityId = result.id;
          } else if (params.args && params.args.where && params.args.where.id) {
            entityId = params.args.where.id;
          }

          await this.auditLog.create({
            data: {
              action: params.action,
              entityType: params.model,
              entityId: String(entityId),
              details: JSON.parse(JSON.stringify(params.args)),
            },
          });
        } catch (error) {
          console.error("Audit log failed:", error);
        }
      }
      return result;
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
