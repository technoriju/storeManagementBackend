import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("HRM - Departments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @ApiOperation({ summary: "Create department" })
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: "Get all departments" })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: "Get department by id" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: "Update department" })
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateDepartmentDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: "Delete department" })
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
