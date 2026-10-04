import { Controller, Get, Post, Body, Param, Delete, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PurchaseReturnsService } from "./purchase-returns.service";
import { CreatePurchaseReturnDto } from "./dto/create-purchase-return.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Purchase Returns")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("purchase-returns")
export class PurchaseReturnsController {
  constructor(private readonly purchaseReturnsService: PurchaseReturnsService) {}

  @ApiOperation({ summary: "Create a new purchase return" })
  @Post()
  create(@Body() createDto: CreatePurchaseReturnDto) {
    return this.purchaseReturnsService.create(createDto);
  }

  @ApiOperation({ summary: "Get all purchase returns" })
  @Get()
  findAll() {
    return this.purchaseReturnsService.findAll();
  }

  @ApiOperation({ summary: "Get a purchase return by id" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.purchaseReturnsService.findOne(BigInt(id));
  }

  @ApiOperation({ summary: "Delete a purchase return by id" })
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.purchaseReturnsService.remove(BigInt(id));
  }
}
