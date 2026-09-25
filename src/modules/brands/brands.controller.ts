import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { BrandsService } from "./brands.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Brands")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("brands")
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @ApiOperation({ summary: "Create a new brand" })
  @Post()
  create(@Body() createDto: CreateBrandDto) {
    return this.service.create(createDto);
  }

  @ApiOperation({ summary: "Get all brands" })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: "Get a brand by id" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(+id);
  }

  @ApiOperation({ summary: "Update a brand by id" })
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateDto: UpdateBrandDto) {
    return this.service.update(+id, updateDto);
  }

  @ApiOperation({ summary: "Delete a brand by id" })
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(+id);
  }
}
