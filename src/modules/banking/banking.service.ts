import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateBankAccountDto } from "./dto/create-bank-account.dto";
import { UpdateBankAccountDto } from "./dto/update-bank-account.dto";
import { CreateMoneyTransferDto } from "./dto/create-money-transfer.dto";

@Injectable()
export class BankingService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // BANK ACCOUNTS
  // ==========================================

  async findAllAccounts() {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
    });

    if (accounts.length === 0) {
      await this.prisma.bankAccount.createMany({
        data: [
          {
            accountName: "Cash in Hand",
            accountType: "CASH",
            openingBalance: 0,
            currentBalance: 0,
            status: "ACTIVE",
          },
          {
            accountName: "Main Bank Account",
            bankName: "Primary Bank",
            accountNumber: "0000000000",
            accountType: "BANK",
            openingBalance: 0,
            currentBalance: 0,
            status: "ACTIVE",
          },
        ],
      });
      return this.prisma.bankAccount.findMany({
        where: { deletedAt: null },
        orderBy: { id: "asc" },
      });
    }

    return accounts;
  }

  async findOneAccount(id: number) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException(`Bank account ${id} not found`);
    }
    return account;
  }

  async createAccount(dto: CreateBankAccountDto) {
    const openingBal = Number(dto.openingBalance || 0);
    return this.prisma.bankAccount.create({
      data: {
        accountName: dto.accountName,
        accountNumber: dto.accountNumber || null,
        bankName: dto.bankName || null,
        branchName: dto.branchName || null,
        ifscCode: dto.ifscCode || null,
        accountType: dto.accountType || "BANK",
        openingBalance: openingBal,
        currentBalance: openingBal,
        status: dto.status || "ACTIVE",
        deviceId: dto.deviceId || null,
      },
    });
  }

  async updateAccount(id: number, dto: UpdateBankAccountDto) {
    const account = await this.findOneAccount(id);

    const updateData: any = {
      version: { increment: 1 },
    };

    if (dto.accountName !== undefined) updateData.accountName = dto.accountName;
    if (dto.accountNumber !== undefined) updateData.accountNumber = dto.accountNumber;
    if (dto.bankName !== undefined) updateData.bankName = dto.bankName;
    if (dto.branchName !== undefined) updateData.branchName = dto.branchName;
    if (dto.ifscCode !== undefined) updateData.ifscCode = dto.ifscCode;
    if (dto.accountType !== undefined) updateData.accountType = dto.accountType;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (dto.openingBalance !== undefined) {
      const diff = Number(dto.openingBalance) - Number(account.openingBalance);
      updateData.openingBalance = Number(dto.openingBalance);
      updateData.currentBalance = { increment: diff };
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: updateData,
    });
  }

  async removeAccount(id: number) {
    await this.findOneAccount(id);
    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "DELETED",
        version: { increment: 1 },
      },
    });
  }

  // ==========================================
  // MONEY TRANSFERS
  // ==========================================

  async findAllTransfers(query?: any) {
    const where: any = { deletedAt: null };

    if (query?.fromAccountId) {
      where.fromAccountId = Number(query.fromAccountId);
    }
    if (query?.toAccountId) {
      where.toAccountId = Number(query.toAccountId);
    }
    if (query?.search) {
      where.OR = [
        { reference: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    return this.prisma.moneyTransfer.findMany({
      where,
      orderBy: { transferDate: "desc" },
      include: {
        fromAccount: { select: { id: true, accountName: true, accountType: true } },
        toAccount: { select: { id: true, accountName: true, accountType: true } },
      },
    });
  }

  async createTransfer(dto: CreateMoneyTransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException("From Account and To Account cannot be the same");
    }

    const amount = Number(dto.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException("Transfer amount must be greater than 0");
    }

    const fromAcc = await this.findOneAccount(dto.fromAccountId);
    const toAcc = await this.findOneAccount(dto.toAccountId);

    const transferDate = dto.transferDate ? new Date(dto.transferDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Deduct from source
      await tx.bankAccount.update({
        where: { id: fromAcc.id },
        data: { currentBalance: { decrement: amount }, version: { increment: 1 } },
      });

      // 2. Add to destination
      await tx.bankAccount.update({
        where: { id: toAcc.id },
        data: { currentBalance: { increment: amount }, version: { increment: 1 } },
      });

      // 3. Create transfer record
      return tx.moneyTransfer.create({
        data: {
          transferDate,
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
          amount,
          reference: dto.reference || null,
          description: dto.description || null,
          deviceId: dto.deviceId || null,
        },
        include: {
          fromAccount: { select: { id: true, accountName: true, accountType: true } },
          toAccount: { select: { id: true, accountName: true, accountType: true } },
        },
      });
    });
  }

  async removeTransfer(id: string | number) {
    const transferId = BigInt(id);
    const transfer = await this.prisma.moneyTransfer.findFirst({
      where: { id: transferId, deletedAt: null },
    });
    if (!transfer) {
      throw new NotFoundException(`Transfer ${id} not found`);
    }

    const amount = Number(transfer.amount);

    return this.prisma.$transaction(async (tx) => {
      // Reverse balances
      await tx.bankAccount.update({
        where: { id: transfer.fromAccountId },
        data: { currentBalance: { increment: amount }, version: { increment: 1 } },
      });

      await tx.bankAccount.update({
        where: { id: transfer.toAccountId },
        data: { currentBalance: { decrement: amount }, version: { increment: 1 } },
      });

      return tx.moneyTransfer.update({
        where: { id: transferId },
        data: { deletedAt: new Date(), status: "CANCELLED", version: { increment: 1 } },
      });
    });
  }

  // ==========================================
  // ACCOUNT STATEMENT
  // ==========================================

  async getAccountStatement(accountId: number, query?: any) {
    const account = await this.findOneAccount(accountId);

    const transfersIn = await this.prisma.moneyTransfer.findMany({
      where: { toAccountId: accountId, deletedAt: null },
      include: { fromAccount: { select: { accountName: true } } },
    });

    const transfersOut = await this.prisma.moneyTransfer.findMany({
      where: { fromAccountId: accountId, deletedAt: null },
      include: { toAccount: { select: { accountName: true } } },
    });

    const rows: any[] = [];

    for (const t of transfersIn) {
      rows.push({
        id: `tin-${t.id}`,
        date: t.transferDate,
        type: "TRANSFER_IN",
        reference: t.reference || `TRF-${t.id}`,
        description: `Transfer from ${t.fromAccount.accountName}${t.description ? ' - ' + t.description : ''}`,
        debit: 0,
        credit: Number(t.amount),
      });
    }

    for (const t of transfersOut) {
      rows.push({
        id: `tout-${t.id}`,
        date: t.transferDate,
        type: "TRANSFER_OUT",
        reference: t.reference || `TRF-${t.id}`,
        description: `Transfer to ${t.toAccount.accountName}${t.description ? ' - ' + t.description : ''}`,
        debit: Number(t.amount),
        credit: 0,
      });
    }

    // Sort chronologically
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = Number(account.openingBalance);
    let totalDebit = 0;
    let totalCredit = 0;

    const statementEntries = rows.map((r) => {
      totalDebit += r.debit;
      totalCredit += r.credit;
      runningBalance = runningBalance + r.credit - r.debit;
      return {
        ...r,
        balance: Number(runningBalance.toFixed(2)),
      };
    });

    return {
      account: {
        id: account.id,
        accountName: account.accountName,
        accountType: account.accountType,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        openingBalance: Number(account.openingBalance),
        currentBalance: Number(account.currentBalance),
      },
      summary: {
        openingBalance: Number(account.openingBalance),
        totalDebit,
        totalCredit,
        closingBalance: Number(account.currentBalance),
      },
      entries: statementEntries,
    };
  }
}
