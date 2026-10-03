import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { QuotationsService } from "./quotations.service";
import { CreateQuotationDto } from "./dto/create-quotation.dto";
import { UpdateQuotationDto } from "./dto/update-quotation.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Quotations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("quotations")
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @ApiOperation({ summary: "Create a new quotation" })
  @Post()
  create(@Body() createQuotationDto: CreateQuotationDto) {
    return this.quotationsService.create(createQuotationDto);
  }

  @ApiOperation({ summary: "Get all quotations" })
  @Get()
  findAll() {
    return this.quotationsService.findAll();
  }

  @ApiOperation({ summary: "Get a quotation by id" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.quotationsService.findOne(BigInt(id));
  }

  @ApiOperation({ summary: "Update a quotation by id" })
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateQuotationDto: UpdateQuotationDto) {
    return this.quotationsService.update(BigInt(id), updateQuotationDto);
  }

  @ApiOperation({ summary: "Delete a quotation by id" })
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.quotationsService.remove(BigInt(id));
  }
}
