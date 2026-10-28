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
import { BankingService } from "./banking.service";
import { CreateBankAccountDto } from "./dto/create-bank-account.dto";
import { UpdateBankAccountDto } from "./dto/update-bank-account.dto";
import { CreateMoneyTransferDto } from "./dto/create-money-transfer.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Banking & Accounts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("banking")
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  // ==========================================
  // BANK ACCOUNTS
  // ==========================================

  @ApiOperation({ summary: "Get all bank and cash accounts" })
  @Get("accounts")
  findAllAccounts() {
    return this.bankingService.findAllAccounts();
  }

  @ApiOperation({ summary: "Create a bank or cash account" })
  @Post("accounts")
  createAccount(@Body() dto: CreateBankAccountDto) {
    return this.bankingService.createAccount(dto);
  }

  @ApiOperation({ summary: "Get account by ID" })
  @Get("accounts/:id")
  findOneAccount(@Param("id") id: string) {
    return this.bankingService.findOneAccount(+id);
  }

  @ApiOperation({ summary: "Update bank or cash account" })
  @Patch("accounts/:id")
  @Put("accounts/:id")
  updateAccount(
    @Param("id") id: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.bankingService.updateAccount(+id, dto);
  }

  @ApiOperation({ summary: "Delete bank or cash account" })
  @Delete("accounts/:id")
  removeAccount(@Param("id") id: string) {
    return this.bankingService.removeAccount(+id);
  }

  @ApiOperation({ summary: "Get detailed account statement with running balance" })
  @Get("accounts/:id/statement")
  getAccountStatement(
    @Param("id") id: string,
    @Query() query?: any,
  ) {
    return this.bankingService.getAccountStatement(+id, query);
  }

  // ==========================================
  // MONEY TRANSFERS
  // ==========================================

  @ApiOperation({ summary: "Get all money transfers" })
  @Get("transfers")
  findAllTransfers(@Query() query?: any) {
    return this.bankingService.findAllTransfers(query);
  }

  @ApiOperation({ summary: "Create inter-account money transfer" })
  @Post("transfers")
  createTransfer(@Body() dto: CreateMoneyTransferDto) {
    return this.bankingService.createTransfer(dto);
  }

  @ApiOperation({ summary: "Delete or reverse money transfer" })
  @Delete("transfers/:id")
  removeTransfer(@Param("id") id: string) {
    return this.bankingService.removeTransfer(id);
  }
}
