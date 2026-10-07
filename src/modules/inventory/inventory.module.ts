import { Module } from "@nestjs/common";
import { InventoryController, StockDirectController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { PrismaModule } from "../../infrastructure/data-access/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController, StockDirectController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
