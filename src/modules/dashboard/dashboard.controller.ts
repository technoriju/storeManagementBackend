import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DashboardMetricsDto } from "./dto/dashboard-metrics.dto";

@ApiTags("Dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: "Get aggregated dashboard metrics for sales, purchases, stock, and charts" })
  @ApiQuery({ name: "branchId", required: false, type: Number })
  @Get("metrics")
  async getMetrics(@Query("branchId") branchId?: string): Promise<DashboardMetricsDto> {
    const branchIdNum = branchId ? parseInt(branchId, 10) : undefined;
    return this.dashboardService.getMetrics(isNaN(branchIdNum as number) ? undefined : branchIdNum);
  }
}
