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
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Categories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: "Create a new category" })
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @ApiOperation({ summary: "Get all categories" })
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @ApiOperation({ summary: "Get a category by id" })
  @Get(":id")
  findOne(@Param("id") id: any) {
    return this.categoriesService.findOne(id);
  }

  @ApiOperation({ summary: "Update a category by id" })
  @Patch(":id")
  update(@Param("id") id: any, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @ApiOperation({ summary: "Delete a category by id" })
  @Delete(":id")
  remove(@Param("id") id: any) {
    return this.categoriesService.remove(id);
  }
}
