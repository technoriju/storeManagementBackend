import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateIncomeDto } from "./dto/create-income.dto";
import { UpdateIncomeDto } from "./dto/update-income.dto";
import { CreateIncomeCategoryDto } from "./dto/create-income-category.dto";
import { UpdateIncomeCategoryDto } from "./dto/update-income-category.dto";

@Injectable()
export class IncomesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // INCOMES
  // ==========================================

  async create(createIncomeDto: CreateIncomeDto) {
    let branchId = createIncomeDto.branchId;
    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst();
      branchId = defaultBranch ? defaultBranch.id : 1;
    }

    let userId = createIncomeDto.userId;
    if (!userId) {
      const defaultUser = await this.prisma.user.findFirst();
      userId = defaultUser ? defaultUser.id : 1;
    }

    const incomeDate = createIncomeDto.incomeDate
      ? new Date(createIncomeDto.incomeDate)
      : new Date();

    return this.prisma.income.create({
      data: {
        amount: createIncomeDto.amount,
        category: createIncomeDto.category,
        description: createIncomeDto.description || null,
        reference: createIncomeDto.reference || null,
        incomeDate,
        branchId,
        userId,
        status: createIncomeDto.status || "ACTIVE",
        deviceId: createIncomeDto.deviceId || null,
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
      where.incomeDate = {};
      if (query.startDate) {
        where.incomeDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.incomeDate.lte = end;
      }
    }

    const incomes = await this.prisma.income.findMany({
      where,
      orderBy: { incomeDate: "desc" },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    const aggregate = await this.prisma.income.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    return {
      incomes,
      summary: {
        totalAmount: Number(aggregate._sum.amount || 0),
        totalCount: aggregate._count.id || 0,
      },
    };
  }

  async findOne(id: string | number) {
    const income = await this.prisma.income.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!income) {
      throw new NotFoundException(`Income with ID ${id} not found`);
    }

    return income;
  }

  async update(id: string | number, updateIncomeDto: UpdateIncomeDto) {
    await this.findOne(id);

    const updateData: any = {
      version: { increment: 1 },
    };

    if (updateIncomeDto.amount !== undefined) updateData.amount = updateIncomeDto.amount;
    if (updateIncomeDto.category !== undefined) updateData.category = updateIncomeDto.category;
    if (updateIncomeDto.description !== undefined) updateData.description = updateIncomeDto.description;
    if (updateIncomeDto.reference !== undefined) updateData.reference = updateIncomeDto.reference;
    if (updateIncomeDto.incomeDate !== undefined) {
      updateData.incomeDate = new Date(updateIncomeDto.incomeDate);
    }
    if (updateIncomeDto.status !== undefined) updateData.status = updateIncomeDto.status;
    if (updateIncomeDto.branchId !== undefined) updateData.branchId = updateIncomeDto.branchId;
    if (updateIncomeDto.userId !== undefined) updateData.userId = updateIncomeDto.userId;

    return this.prisma.income.update({
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

    return this.prisma.income.update({
      where: { id: BigInt(id) },
      data: {
        deletedAt: new Date(),
        status: "DELETED",
        version: { increment: 1 },
      },
    });
  }

  // ==========================================
  // INCOME CATEGORIES
  // ==========================================

  async findAllCategories() {
    const categories = await this.prisma.incomeCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });

    // Seed defaults if empty
    if (categories.length === 0) {
      const defaults = [
        "Service Revenue",
        "Consultancy",
        "Rental Income",
        "Commission",
        "Interest & Dividends",
        "Scrap & Disposal",
        "Miscellaneous Income",
      ];
      for (const name of defaults) {
        await this.prisma.incomeCategory.create({
          data: { name, description: `Standard ${name} income category` },
        });
      }
      return this.prisma.incomeCategory.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      });
    }

    return categories;
  }

  async findOneCategory(id: number) {
    const cat = await this.prisma.incomeCategory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!cat) {
      throw new NotFoundException(`Income Category with ID ${id} not found`);
    }
    return cat;
  }

  async createCategory(dto: CreateIncomeCategoryDto) {
    const existing = await this.prisma.incomeCategory.findFirst({
      where: { name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Income Category "${dto.name}" already exists`);
    }

    return this.prisma.incomeCategory.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        status: dto.status || "ACTIVE",
        deviceId: dto.deviceId || null,
      },
    });
  }

  async updateCategory(id: number, dto: UpdateIncomeCategoryDto) {
    const cat = await this.findOneCategory(id);

    if (dto.name && dto.name !== cat.name) {
      const existing = await this.prisma.incomeCategory.findFirst({
        where: { name: dto.name, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Income Category "${dto.name}" already exists`);
      }
    }

    return this.prisma.incomeCategory.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });
  }

  async removeCategory(id: number) {
    await this.findOneCategory(id);

    return this.prisma.incomeCategory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "DELETED",
        version: { increment: 1 },
      },
    });
  }
}
