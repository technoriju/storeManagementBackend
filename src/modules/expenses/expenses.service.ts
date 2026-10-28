import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { CreateExpenseCategoryDto } from "./dto/create-expense-category.dto";
import { UpdateExpenseCategoryDto } from "./dto/update-expense-category.dto";

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // EXPENSES
  // ==========================================

  async create(createExpenseDto: CreateExpenseDto) {
    let branchId = createExpenseDto.branchId;
    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst();
      branchId = defaultBranch ? defaultBranch.id : 1;
    }

    let userId = createExpenseDto.userId;
    if (!userId) {
      const defaultUser = await this.prisma.user.findFirst();
      userId = defaultUser ? defaultUser.id : 1;
    }

    const expenseDate = createExpenseDto.expenseDate
      ? new Date(createExpenseDto.expenseDate)
      : new Date();

    return this.prisma.expense.create({
      data: {
        amount: createExpenseDto.amount,
        category: createExpenseDto.category,
        description: createExpenseDto.description || null,
        reference: createExpenseDto.reference || null,
        expenseDate,
        branchId,
        userId,
        status: createExpenseDto.status || "ACTIVE",
        deviceId: createExpenseDto.deviceId || null,
      },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findAll(query?: any) {
    const where: any = { deletedAt: null };

    if (query?.category && query.category !== "All") {
      where.category = query.category;
    }

    if (query?.search) {
      where.OR = [
        { category: { contains: query.search } },
        { description: { contains: query.search } },
        { reference: { contains: query.search } },
      ];
    }

    if (query?.startDate || query?.endDate) {
      where.expenseDate = {};
      if (query.startDate) {
        where.expenseDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    const aggregate = await this.prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    return {
      expenses,
      summary: {
        totalAmount: Number(aggregate._sum.amount || 0),
        totalCount: aggregate._count.id || 0,
      },
    };
  }

  async findOne(id: string | number) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async update(id: string | number, updateExpenseDto: UpdateExpenseDto) {
    await this.findOne(id);

    const updateData: any = {
      version: { increment: 1 },
    };

    if (updateExpenseDto.amount !== undefined) updateData.amount = updateExpenseDto.amount;
    if (updateExpenseDto.category !== undefined) updateData.category = updateExpenseDto.category;
    if (updateExpenseDto.description !== undefined) updateData.description = updateExpenseDto.description;
    if (updateExpenseDto.reference !== undefined) updateData.reference = updateExpenseDto.reference;
    if (updateExpenseDto.expenseDate !== undefined) {
      updateData.expenseDate = new Date(updateExpenseDto.expenseDate);
    }
    if (updateExpenseDto.status !== undefined) updateData.status = updateExpenseDto.status;
    if (updateExpenseDto.branchId !== undefined) updateData.branchId = updateExpenseDto.branchId;
    if (updateExpenseDto.userId !== undefined) updateData.userId = updateExpenseDto.userId;

    return this.prisma.expense.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async remove(id: string | number) {
    await this.findOne(id);

    return this.prisma.expense.update({
      where: { id: BigInt(id) },
      data: {
        deletedAt: new Date(),
        status: "DELETED",
        version: { increment: 1 },
      },
    });
  }

  // ==========================================
  // EXPENSE CATEGORIES
  // ==========================================

  async findAllCategories() {
    const categories = await this.prisma.expenseCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });

    // Seed defaults if empty
    if (categories.length === 0) {
      const defaults = [
        "Rent & Lease",
        "Utilities & Bills",
        "Salaries & Wages",
        "Office Supplies",
        "Maintenance & Repairs",
        "Marketing & Ads",
        "Logistics & Transport",
        "Miscellaneous",
      ];
      for (const name of defaults) {
        await this.prisma.expenseCategory.create({
          data: { name, description: `Standard ${name} expense category` },
        });
      }
      return this.prisma.expenseCategory.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      });
    }

    return categories;
  }

  async findOneCategory(id: number) {
    const cat = await this.prisma.expenseCategory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!cat) {
      throw new NotFoundException(`Expense Category with ID ${id} not found`);
    }
    return cat;
  }

  async createCategory(dto: CreateExpenseCategoryDto) {
    const existing = await this.prisma.expenseCategory.findFirst({
      where: { name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Expense Category "${dto.name}" already exists`);
    }

    return this.prisma.expenseCategory.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        status: dto.status || "ACTIVE",
        deviceId: dto.deviceId || null,
      },
    });
  }

  async updateCategory(id: number, dto: UpdateExpenseCategoryDto) {
    const cat = await this.findOneCategory(id);

    if (dto.name && dto.name !== cat.name) {
      const existing = await this.prisma.expenseCategory.findFirst({
        where: { name: dto.name, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Expense Category "${dto.name}" already exists`);
      }
    }

    return this.prisma.expenseCategory.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });
  }

  async removeCategory(id: number) {
    await this.findOneCategory(id);

    return this.prisma.expenseCategory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "DELETED",
        version: { increment: 1 },
      },
    });
  }
}
