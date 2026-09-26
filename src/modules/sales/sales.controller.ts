import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SalesService } from "./sales.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Sales")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @ApiOperation({ summary: "Create a new sale" })
  @Post()
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @ApiOperation({ summary: "Get all sales" })
  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @ApiOperation({ summary: "Get a sale by id" })
  @Get(":id")
  findOne(@Param("id") id: any) {
    return this.salesService.findOne(BigInt(id));
  }

  @ApiOperation({ summary: "Update a sale by id" })
  @Patch(":id")
  update(@Param("id") id: any, @Body() updateSaleDto: UpdateSaleDto) {
    return this.salesService.update(BigInt(id), updateSaleDto);
  }

  @ApiOperation({ summary: "Delete a sale by id" })
  @Delete(":id")
  remove(@Param("id") id: any) {
    return this.salesService.remove(BigInt(id));
  }
}
