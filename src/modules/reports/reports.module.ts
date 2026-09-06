import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ExcelService } from "./excel.service";

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ExcelService],
  exports: [ReportsService, ExcelService],
})
export class ReportsModule {}
