import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PurchaseOrdersService } from "./purchase-orders.service";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Purchase Orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("purchase-orders")
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @ApiOperation({ summary: "Create a new purchase order" })
  @Post()
  create(@Body() createDto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(createDto);
  }

  @ApiOperation({ summary: "Get all purchase orders" })
  @Get()
  findAll() {
    return this.purchaseOrdersService.findAll();
  }

  @ApiOperation({ summary: "Get a purchase order by id" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.purchaseOrdersService.findOne(BigInt(id));
  }

  @ApiOperation({ summary: "Update a purchase order by id" })
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateDto: UpdatePurchaseOrderDto) {
    return this.purchaseOrdersService.update(BigInt(id), updateDto);
  }

  @ApiOperation({ summary: "Delete a purchase order by id" })
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.purchaseOrdersService.remove(BigInt(id));
  }
}
