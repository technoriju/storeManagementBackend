import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { AttendanceService } from "./attendance.service";
import { LogAttendanceDto } from "./dto/log-attendance.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("HRM - Attendance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @ApiOperation({ summary: "Log or update daily attendance" })
  @Post()
  log(@Body() dto: LogAttendanceDto) {
    return this.service.logAttendance(dto);
  }

  @ApiOperation({ summary: "Get attendance list with date/status filter" })
  @ApiQuery({ name: "date", required: false, type: String })
  @ApiQuery({ name: "employeeId", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, type: String })
  @Get()
  findAll(
    @Query("date") date?: string,
    @Query("employeeId") employeeId?: string,
    @Query("status") status?: string
  ) {
    return this.service.findAll({
      date,
      employeeId: employeeId ? +employeeId : undefined,
      status,
    });
  }

  @ApiOperation({ summary: "Delete attendance entry" })
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
