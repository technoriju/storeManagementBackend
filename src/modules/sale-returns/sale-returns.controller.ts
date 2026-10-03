import { Controller, Get, Post, Body, Param, Delete, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SaleReturnsService } from "./sale-returns.service";
import { CreateSaleReturnDto } from "./dto/create-sale-return.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Sale Returns")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("sale-returns")
export class SaleReturnsController {
  constructor(private readonly saleReturnsService: SaleReturnsService) {}

  @ApiOperation({ summary: "Create a new sale return" })
  @Post()
  create(@Body() createDto: CreateSaleReturnDto) {
    return this.saleReturnsService.create(createDto);
  }

  @ApiOperation({ summary: "Get all sale returns" })
  @Get()
  findAll() {
    return this.saleReturnsService.findAll();
  }

  @ApiOperation({ summary: "Get a sale return by id" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.saleReturnsService.findOne(BigInt(id));
  }

  @ApiOperation({ summary: "Delete a sale return by id" })
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.saleReturnsService.remove(BigInt(id));
  }
}
