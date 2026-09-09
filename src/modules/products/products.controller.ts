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
import { ProductsService } from "./products.service";
import { CreateProductsDto } from "./dto/create-product.dto";
import { UpdateProductsDto } from "./dto/update-product.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Products")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: "Create a new product" })
  @Post()
  create(@Body() createProductsDto: CreateProductsDto) {
    return this.productsService.create(createProductsDto);
  }

  @ApiOperation({ summary: "Get all products" })
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @ApiOperation({ summary: "Get a product by id" })
  @Get(":id")
  findOne(@Param("id") id: any) {
    return this.productsService.findOne(id);
  }

  @ApiOperation({ summary: "Update a product by id" })
  @Patch(":id")
  update(@Param("id") id: any, @Body() updateProductsDto: UpdateProductsDto) {
    return this.productsService.update(id, updateProductsDto);
  }

  @ApiOperation({ summary: "Delete a product by id" })
  @Delete(":id")
  remove(@Param("id") id: any) {
    return this.productsService.remove(id);
  }
}
