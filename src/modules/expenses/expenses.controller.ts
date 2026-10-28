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
import { ExpensesService } from "./expenses.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { CreateExpenseCategoryDto } from "./dto/create-expense-category.dto";
import { UpdateExpenseCategoryDto } from "./dto/update-expense-category.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Expenses")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ==========================================
  // EXPENSE CATEGORIES (Must be defined before :id route)
  // ==========================================

  @ApiOperation({ summary: "Get all expense categories" })
  @Get("categories")
  findAllCategories() {
    return this.expensesService.findAllCategories();
  }

  @ApiOperation({ summary: "Create expense category" })
  @Post("categories")
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(dto);
  }

  @ApiOperation({ summary: "Get expense category by ID" })
  @Get("categories/:id")
  findOneCategory(@Param("id") id: string) {
    return this.expensesService.findOneCategory(+id);
  }

  @ApiOperation({ summary: "Update expense category" })
  @Patch("categories/:id")
  @Put("categories/:id")
  updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.expensesService.updateCategory(+id, dto);
  }

  @ApiOperation({ summary: "Delete expense category" })
  @Delete("categories/:id")
  removeCategory(@Param("id") id: string) {
    return this.expensesService.removeCategory(+id);
  }

  // ==========================================
  // EXPENSES
  // ==========================================

  @ApiOperation({ summary: "Create a new expense" })
  @Post()
  create(@Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.create(createExpenseDto);
  }

  @ApiOperation({ summary: "Get all expenses with filters and summary" })
  @Get()
  findAll(@Query() query?: any) {
    return this.expensesService.findAll(query);
  }

  @ApiOperation({ summary: "Get an expense by id" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.expensesService.findOne(id);
  }

  @ApiOperation({ summary: "Update an expense by id" })
  @Patch(":id")
  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @ApiOperation({ summary: "Delete an expense by id" })
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.expensesService.remove(id);
  }
}
