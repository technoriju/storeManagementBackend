import { Controller, Get, Post, Body, Patch, Put, Param, Delete, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PurchasesService } from "./purchases.service";
import { CreatePurchaseDto } from "./dto/create-purchase.dto";
import { UpdatePurchaseDto } from "./dto/update-purchase.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Purchases")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("purchases")
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @ApiOperation({ summary: "Create a new purchase" })
  @Post()
  create(@Body() createPurchaseDto: CreatePurchaseDto) {
    return this.purchasesService.create(createPurchaseDto);
  }

  @ApiOperation({ summary: "Get all purchases" })
  @Get()
  findAll() {
    return this.purchasesService.findAll();
  }

  @ApiOperation({ summary: "Get a purchase by id" })
  @Get(":id")
  findOne(@Param("id") id: any) {
    return this.purchasesService.findOne(BigInt(id));
  }

  @ApiOperation({ summary: "Update a purchase by id" })
  @Put(":id")
  @Patch(":id")
  update(@Param("id") id: any, @Body() updatePurchaseDto: UpdatePurchaseDto) {
    return this.purchasesService.update(BigInt(id), updatePurchaseDto);
  }

  @ApiOperation({ summary: "Delete a purchase by id" })
  @Delete(":id")
  remove(@Param("id") id: any) {
    return this.purchasesService.remove(BigInt(id));
  }
}
