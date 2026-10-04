import { Module } from "@nestjs/common";
import { SaleReturnsService } from "./sale-returns.service";
import { SaleReturnsController } from "./sale-returns.controller";

@Module({
  controllers: [SaleReturnsController],
  providers: [SaleReturnsService],
  exports: [SaleReturnsService],
})
export class SaleReturnsModule {}
