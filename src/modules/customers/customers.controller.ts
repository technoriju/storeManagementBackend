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
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Customers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @ApiOperation({ summary: "Create a new customer" })
  @Post()
  create(@Body() createDto: CreateCustomerDto) {
    return this.service.create(createDto);
  }

  @ApiOperation({ summary: "Get all customers" })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: "Get a customer by id" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(+id);
  }

  @ApiOperation({ summary: "Update a customer by id" })
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateDto: UpdateCustomerDto) {
    return this.service.update(+id, updateDto);
  }

  @ApiOperation({ summary: "Delete a customer by id" })
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(+id);
  }
}
