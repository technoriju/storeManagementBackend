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
import { LeavesService } from "./leaves.service";
import { CreateLeaveTypeDto, CreateLeaveRequestDto, UpdateLeaveStatusDto } from "./dto/leave.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("HRM - Leaves")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("leaves")
export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  // --- Types ---
  @ApiOperation({ summary: "Get all leave categories" })
  @Get("types")
  findAllTypes() {
    return this.service.findAllTypes();
  }

  @ApiOperation({ summary: "Create leave category" })
  @Post("types")
  createType(@Body() dto: CreateLeaveTypeDto) {
    return this.service.createType(dto);
  }

  @ApiOperation({ summary: "Delete leave category" })
  @Delete("types/:id")
  removeType(@Param("id", ParseIntPipe) id: number) {
    return this.service.removeType(id);
  }

  // --- Requests ---
  @ApiOperation({ summary: "Apply for leave" })
  @Post()
  createRequest(@Body() dto: CreateLeaveRequestDto) {
    return this.service.createRequest(dto);
  }

  @ApiOperation({ summary: "Get leave applications" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "employeeId", required: false, type: Number })
  @Get()
  findAllRequests(
    @Query("status") status?: string,
    @Query("employeeId") employeeId?: string
  ) {
    return this.service.findAllRequests(status, employeeId ? +employeeId : undefined);
  }

  @ApiOperation({ summary: "Approve or reject leave request" })
  @Patch(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateLeaveStatusDto
  ) {
    return this.service.updateStatus(id, dto);
  }

  @ApiOperation({ summary: "Delete leave application" })
  @Delete(":id")
  removeRequest(@Param("id", ParseIntPipe) id: number) {
    return this.service.removeRequest(id);
  }
}
