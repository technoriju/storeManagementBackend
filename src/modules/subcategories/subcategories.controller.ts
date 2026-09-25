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
import { SubCategoriesService } from "./subcategories.service";
import { CreateSubCategoriesDto } from "./dto/create-subcategory.dto";
import { UpdateSubCategoriesDto } from "./dto/update-subcategory.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("SubCategories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("subcategories")
export class SubCategoriesController {
  constructor(private readonly subcategoriesService: SubCategoriesService) {}

  @ApiOperation({ summary: "Create a new subcategory" })
  @Post()
  create(@Body() createSubCategoriesDto: CreateSubCategoriesDto) {
    return this.subcategoriesService.create(createSubCategoriesDto);
  }

  @ApiOperation({ summary: "Get all subcategories" })
  @Get()
  findAll() {
    return this.subcategoriesService.findAll();
  }

  @ApiOperation({ summary: "Get a subcategory by id" })
  @Get(":id")
  findOne(@Param("id") id: any) {
    return this.subcategoriesService.findOne(+id);
  }

  @ApiOperation({ summary: "Update a subcategory by id" })
  @Patch(":id")
  update(
    @Param("id") id: any,
    @Body() updateSubCategoriesDto: UpdateSubCategoriesDto,
  ) {
    return this.subcategoriesService.update(+id, updateSubCategoriesDto);
  }

  @ApiOperation({ summary: "Delete a subcategory by id" })
  @Delete(":id")
  remove(@Param("id") id: any) {
    return this.subcategoriesService.remove(+id);
  }
}
