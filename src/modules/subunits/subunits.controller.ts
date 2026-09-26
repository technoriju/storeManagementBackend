import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateSubUnitDto } from "./dto/create-subunit.dto";
import { UpdateSubUnitDto } from "./dto/update-subunit.dto";
import { SubUnitsService } from "./subunits.service";

@ApiTags("SubUnits")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("sub-units")
export class SubUnitsController {
  constructor(private readonly service: SubUnitsService) {}

  @ApiOperation({ summary: "Create a sub-unit" })
  @Post()
  create(@Body() dto: CreateSubUnitDto) { return this.service.create(dto); }

  @ApiOperation({ summary: "Get all sub-units" })
  @Get()
  findAll() { return this.service.findAll(); }

  @Get(":id")
  findOne(@Param("id") id: string) { return this.service.findOne(+id); }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSubUnitDto) { return this.service.update(+id, dto); }

  @Delete(":id")
  remove(@Param("id") id: string) { return this.service.remove(+id); }
}
