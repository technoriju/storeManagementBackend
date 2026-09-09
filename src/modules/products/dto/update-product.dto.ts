import { PartialType } from "@nestjs/swagger";
import { CreateProductsDto } from "./create-product.dto";

export class UpdateProductsDto extends PartialType(CreateProductsDto) {}
