import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IncomesService } from "./incomes.service";
import { CreateIncomeDto } from "./dto/create-income.dto";
import { UpdateIncomeDto } from "./dto/update-income.dto";
import { CreateIncomeCategoryDto } from "./dto/create-income-category.dto";
import { UpdateIncomeCategoryDto } from "./dto/update-income-category.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Incomes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("incomes")
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  // ==========================================
  // INCOME CATEGORIES (Must be defined before :id route)
  // ==========================================

  @ApiOperation({ summary: "Get all income categories" })
  @Get("categories")
  findAllCategories() {
    return this.incomesService.findAllCategories();
  }

  @ApiOperation({ summary: "Create income category" })
  @Post("categories")
  createCategory(@Body() dto: CreateIncomeCategoryDto) {
    return this.incomesService.createCategory(dto);
  }

  @ApiOperation({ summary: "Get income category by ID" })
  @Get("categories/:id")
  findOneCategory(@Param("id") id: string) {
    return this.incomesService.findOneCategory(+id);
  }

  @ApiOperation({ summary: "Update income category" })
  @Patch("categories/:id")
  @Put("categories/:id")
  updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateIncomeCategoryDto,
  ) {
    return this.incomesService.updateCategory(+id, dto);
  }

  @ApiOperation({ summary: "Delete income category" })
  @Delete("categories/:id")
  removeCategory(@Param("id") id: string) {
    return this.incomesService.removeCategory(+id);
  }

  // ==========================================
  // INCOMES
  // ==========================================

  @ApiOperation({ summary: "Create a new income" })
  @Post()
  create(@Body() createIncomeDto: CreateIncomeDto) {
    return this.incomesService.create(createIncomeDto);
  }

  @ApiOperation({ summary: "Get all incomes with filters and summary" })
  @Get()
  findAll(@Query() query?: any) {
    return this.incomesService.findAll(query);
  }

  @ApiOperation({ summary: "Get an income by id" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.incomesService.findOne(id);
  }

  @ApiOperation({ summary: "Update an income by id" })
  @Patch(":id")
  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() updateIncomeDto: UpdateIncomeDto,
  ) {
    return this.incomesService.update(id, updateIncomeDto);
  }

  @ApiOperation({ summary: "Delete an income by id" })
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.incomesService.remove(id);
  }
}
