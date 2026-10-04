import { Module } from "@nestjs/common";
import { PurchaseReturnsService } from "./purchase-returns.service";
import { PurchaseReturnsController } from "./purchase-returns.controller";

@Module({
  controllers: [PurchaseReturnsController],
  providers: [PurchaseReturnsService],
  exports: [PurchaseReturnsService],
})
export class PurchaseReturnsModule {}
