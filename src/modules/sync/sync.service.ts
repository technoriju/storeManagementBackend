import { Injectable, Logger, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  async pushChanges(changes: any[]) {
    const results = [];
    for (const change of changes) {
      try {
        const result = await this.processChange(change);
        results.push({ id: change.id, status: "COMPLETED" });
      } catch (error) {
        this.logger.error(`Failed to process change ${change.id}:`, error);
        results.push({ id: change.id, status: "FAILED", error: error.message });
      }
    }
    return results;
  }

  private async processChange(change: any) {
    // Idempotency check
    const existingLog = await this.prisma.syncQueue.findUnique({
      where: { id: change.id },
    });

    if (existingLog) {
      if (existingLog.status === "COMPLETED") return; // Already processed
    } else {
      // Log the incoming sync request
      await this.prisma.syncQueue.create({
        data: {
          id: change.id,
          entityType: change.entityType,
          entityId: change.entityId,
          action: change.operation,
          payload: change.payload,
          status: "PENDING",
          deviceId: change.deviceId || "unknown",
        },
      });
    }

    const { entityType, entityId, operation, payload } = change;
    const model = this.getModel(entityType);

    if (!model) {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }

    // Process based on operation
    if (operation === "CREATE") {
      const exists = await model.findUnique({ where: { id: entityId } });
      if (!exists) {
        await model.create({ data: { ...payload, id: entityId } });
      }
    } else if (operation === "UPDATE") {
      const exists = await model.findUnique({ where: { id: entityId } });
      if (exists) {
        // Conflict Detection
        if (payload.version && exists.version > payload.version) {
          this.logger.warn(`Version conflict for ${entityType} ${entityId}`);
          // Server-authoritative resolution: ignore older client update
          throw new ConflictException("Server has newer version");
        }

        // Prevent destructive overwrite of financial data
        if (entityType === "SALE" || entityType === "PURCHASE") {
          // Additional checks can be placed here
          // But for now, we apply the update safely
        }

        await model.update({
          where: { id: entityId },
          data: { ...payload, version: exists.version + 1 },
        });
      }
    } else if (operation === "DELETE") {
      const exists = await model.findUnique({ where: { id: entityId } });
      if (exists) {
        // Tombstones/Soft Delete
        await model.update({
          where: { id: entityId },
          data: { deletedAt: new Date() },
        });
      }
    }

    // Mark as completed
    await this.prisma.syncQueue.update({
      where: { id: change.id },
      data: { status: "COMPLETED" },
    });
  }

  async pullChanges(lastSyncStr: string, deviceId: string) {
    const lastSync = new Date(lastSyncStr || 0);
    const changes = [];
    const newSyncCursor = new Date().toISOString();

    const tables = [
      "product",
      "category",
      "sale",
      "purchase",
      "customer",
      "supplier",
    ];

    for (const table of tables) {
      const model = this.getModel(table);
      if (model) {
        const updatedRecords = await model.findMany({
          where: {
            updatedAt: { gt: lastSync },
          },
        });

        for (const record of updatedRecords) {
          changes.push({
            entityType: table.toUpperCase(),
            entityId: record.id,
            operation: record.deletedAt ? "DELETE" : "UPDATE",
            payload: record,
            version: record.version,
          });
        }
      }
    }

    return { changes, newSyncCursor };
  }

  private getModel(entityType: string): any {
    const type = entityType.toLowerCase();
    switch (type) {
      case "product":
        return this.prisma.product;
      case "category":
        return this.prisma.category;
      case "sale":
        return this.prisma.sale;
      case "purchase":
        return this.prisma.purchase;
      case "customer":
        return this.prisma.customer;
      case "supplier":
        return this.prisma.supplier;
      default:
        return null;
    }
  }
}
