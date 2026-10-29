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
import { DesignationsService } from "./designations.service";
import { CreateDesignationDto } from "./dto/create-designation.dto";
import { UpdateDesignationDto } from "./dto/update-designation.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("HRM - Designations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("designations")
export class DesignationsController {
  constructor(private readonly service: DesignationsService) {}

  @ApiOperation({ summary: "Create designation" })
  @Post()
  create(@Body() dto: CreateDesignationDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: "Get all designations" })
  @ApiQuery({ name: "departmentId", required: false, type: Number })
  @Get()
  findAll(@Query("departmentId") departmentId?: string) {
    return this.service.findAll(departmentId ? +departmentId : undefined);
  }

  @ApiOperation({ summary: "Get designation by id" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: "Update designation" })
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateDesignationDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: "Delete designation" })
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
