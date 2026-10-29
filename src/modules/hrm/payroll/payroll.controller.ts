import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { PayrollService } from "./payroll.service";
import { CreatePayrollDto, MarkPayrollPaidDto } from "./dto/payroll.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("HRM - Payroll")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("payrolls")
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @ApiOperation({ summary: "Generate salary voucher" })
  @Post()
  create(@Body() dto: CreatePayrollDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: "Get all payroll vouchers" })
  @ApiQuery({ name: "month", required: false, type: String })
  @ApiQuery({ name: "year", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "employeeId", required: false, type: Number })
  @Get()
  findAll(
    @Query("month") month?: string,
    @Query("year") year?: string,
    @Query("status") status?: string,
    @Query("employeeId") employeeId?: string
  ) {
    return this.service.findAll({
      month,
      year: year ? +year : undefined,
      status,
      employeeId: employeeId ? +employeeId : undefined,
    });
  }

  @ApiOperation({ summary: "Get salary pay slip by id" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: "Disburse salary / mark paid" })
  @Patch(":id/pay")
  markPaid(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: MarkPayrollPaidDto
  ) {
    return this.service.markPaid(id, dto);
  }

  @ApiOperation({ summary: "Delete payroll slip" })
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
