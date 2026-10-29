import { Module } from "@nestjs/common";
import { BarcodeController } from "./barcode.controller";
import { BarcodeService } from "./barcode.service";
import { PrismaModule } from "../../infrastructure/data-access/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [BarcodeController],
  providers: [BarcodeService],
  exports: [BarcodeService],
})
export class BarcodeModule {}
