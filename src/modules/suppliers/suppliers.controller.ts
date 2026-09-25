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
import { SuppliersService } from "./suppliers.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Suppliers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @ApiOperation({ summary: "Create a new supplier" })
  @Post()
  create(@Body() createDto: CreateSupplierDto) {
    return this.service.create(createDto);
  }

  @ApiOperation({ summary: "Get all suppliers" })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: "Get a supplier by id" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(+id);
  }

  @ApiOperation({ summary: "Update a supplier by id" })
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateDto: UpdateSupplierDto) {
    return this.service.update(+id, updateDto);
  }

  @ApiOperation({ summary: "Delete a supplier by id" })
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(+id);
  }
}
