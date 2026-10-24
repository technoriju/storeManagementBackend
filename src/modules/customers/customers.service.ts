import { Injectable, NotFoundException, ConflictException, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

export function calculateCustomerLedger(sales: any[], payments: any[]): number {
  const validSales = (sales || []).filter(
    (s) => !s.status || !["cancelled", "CANCELLED"].includes(s.status)
  );

  // Sort sales chronologically by date/createdAt/id
  const sortedSales = [...validSales].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.saleDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.saleDate || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return Number(a.id || 0) - Number(b.id || 0);
  });

  // Sort payments chronologically by date/createdAt/id
  const sortedPayments = [...(payments || [])].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.paymentDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.paymentDate || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return Number(a.id || 0) - Number(b.id || 0);
  });

  const adjustmentRefs = new Set(
    sortedPayments
      .filter((p) => p.paymentMethod?.toLowerCase() === "adjustment" || p.method?.toLowerCase() === "adjustment")
      .map((p) => String(p.referenceNumber || p.reference || ""))
      .filter(Boolean)
  );

  let runningBalance = 0;
  let pIdx = 0;

  for (const s of sortedSales) {
    const sTime = new Date(s.createdAt || s.saleDate || 0).getTime();

    // Apply payments made before or at this sale
    while (pIdx < sortedPayments.length) {
      const p = sortedPayments[pIdx];
      const pTime = new Date(p.createdAt || p.paymentDate || 0).getTime();
      if (pTime < sTime) {
        const amt = Number(p.amount || 0);
        const t = (p.type || "receive").toLowerCase();
        if (t === "receive" || t === "received" || t === "adjustment_credit") {
          runningBalance -= amt;
        } else if (t === "pay" || t === "paid" || t === "adjustment_debit") {
          runningBalance += amt;
        }
        pIdx++;
      } else {
        break;
      }
    }

    // Check for manual balance adjustment on sale if not already recorded in payments
    const invNum = String(s.invoiceNumber || "");
    if (Boolean(s.showPreviousBalance) && !adjustmentRefs.has(invNum)) {
      const enteredPrev = Number(s.previousDue || 0) - Number(s.advancePayment || 0);
      const delta = enteredPrev - runningBalance;
      if (Math.abs(delta) > 0.001) {
        runningBalance += delta;
      }
    }

    const gt = Number(s.grandTotal || s.total || 0);
    let ret = 0;
    if (s.returns && Array.isArray(s.returns)) {
      ret = s.returns.reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0);
    }
    runningBalance += (gt - ret);
  }

  // Apply remaining payments made after the last sale
  while (pIdx < sortedPayments.length) {
    const p = sortedPayments[pIdx];
    const amt = Number(p.amount || 0);
    const t = (p.type || "receive").toLowerCase();
    if (t === "receive" || t === "received" || t === "adjustment_credit") {
      runningBalance -= amt;
    } else if (t === "pay" || t === "paid" || t === "adjustment_debit") {
      runningBalance += amt;
    }
    pIdx++;
  }

  return Number(runningBalance.toFixed(2));
}

export async function recalculateCustomerBalance(
  prisma: any,
  customerId: number
): Promise<number> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      payments: {
        where: { deletedAt: null },
        select: { id: true, amount: true, type: true, referenceNumber: true, paymentDate: true, createdAt: true, paymentMethod: true },
      },
      sales: {
        where: {
          deletedAt: null,
          NOT: { status: { in: ["cancelled", "CANCELLED"] } },
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          due: true,
          paid: true,
          grandTotal: true,
          previousDue: true,
          advancePayment: true,
          showPreviousBalance: true,
          saleDate: true,
          createdAt: true,
          returns: { select: { totalAmount: true } },
        },
      },
    },
  });

  if (!customer) return 0;
  const balance = calculateCustomerLedger(customer.sales, customer.payments);
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      outstandingBalance: balance,
    },
  });
  return balance;
}

@Injectable()
export class CustomersService implements OnModuleInit {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      this.logger.log("Syncing all customer outstandingBalances directly in DB...");
      const customers = await this.prisma.customer.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      for (const c of customers) {
        await recalculateCustomerBalance(this.prisma, c.id);
      }
      this.logger.log(`Synced balances for ${customers.length} customers in DB.`);
    } catch (err) {
      this.logger.warn("Initial customer balance calculation warning:", err);
    }
  }

  async create(createCustomerDto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { name: createCustomerDto.name, deletedAt: null },
    });
    if (existing) {
      return existing;
    }

    const created = await this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        outstandingBalance: 0,
      },
    });
    return created;
  }

  async sync(payloads: any[]) {
    const results = [];
    for (const payload of payloads) {
      const { id, ...data } = payload;
      if (id) {
        try {
          const updated = await this.update(Number(id), data);
          results.push(updated);
        } catch (error) {
          if (error instanceof NotFoundException) {
            try {
              const created = await this.create(data);
              results.push({ ...created, _clientTempId: id });
            } catch (createError) {
              // ignore or handle error
            }
          }
        }
      } else {
        try {
          const created = await this.create(data);
          results.push(created);
        } catch (error) {
          // ignore or handle error
        }
      }
    }
    return results;
  }

  public calculateOutstanding(sales: any[], payments: any[]): number {
    return calculateCustomerLedger(sales, payments);
  }

  public async recalculateBalance(customerId: number, tx?: any): Promise<number> {
    return recalculateCustomerBalance(tx || this.prisma, customerId);
  }

  async findAll() {
    return this.prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { id: "desc" },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return item;
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const item = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    if (updateCustomerDto.name && updateCustomerDto.name !== item.name) {
      const existing = await this.prisma.customer.findFirst({
        where: { name: updateCustomerDto.name, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException("Customer name already exists");
      }
    }

    await this.prisma.customer.update({
      where: { id },
      data: {
        ...updateCustomerDto,
        version: { increment: 1 },
      },
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const item = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }
}
