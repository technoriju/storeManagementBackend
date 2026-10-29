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
import { HolidaysService } from "./holidays.service";
import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("HRM - Holidays")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("holidays")
export class HolidaysController {
  constructor(private readonly service: HolidaysService) {}

  @ApiOperation({ summary: "Create holiday" })
  @Post()
  create(@Body() dto: CreateHolidayDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: "Get holiday calendar" })
  @ApiQuery({ name: "type", required: false, type: String })
  @ApiQuery({ name: "year", required: false, type: Number })
  @Get()
  findAll(
    @Query("type") type?: string,
    @Query("year") year?: string
  ) {
    return this.service.findAll(type, year ? +year : undefined);
  }

  @ApiOperation({ summary: "Delete holiday" })
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
