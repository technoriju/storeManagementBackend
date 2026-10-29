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
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("HRM - Employees")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("employees")
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @ApiOperation({ summary: "Register new employee" })
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: "Get employees with optional filter" })
  @ApiQuery({ name: "departmentId", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @Get()
  findAll(
    @Query("departmentId") departmentId?: string,
    @Query("status") status?: string,
    @Query("search") search?: string
  ) {
    return this.service.findAll({
      departmentId: departmentId ? +departmentId : undefined,
      status,
      search,
    });
  }

  @ApiOperation({ summary: "Get employee profile by id" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: "Update employee details" })
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: "Soft delete employee" })
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
