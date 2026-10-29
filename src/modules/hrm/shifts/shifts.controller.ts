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
import { ShiftsService } from "./shifts.service";
import { CreateShiftDto } from "./dto/create-shift.dto";
import { UpdateShiftDto } from "./dto/update-shift.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("HRM - Shifts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("shifts")
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @ApiOperation({ summary: "Create shift" })
  @Post()
  create(@Body() dto: CreateShiftDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: "Get all shifts" })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: "Get shift by id" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: "Update shift" })
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateShiftDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: "Delete shift" })
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
