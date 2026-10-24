import { Injectable, NotFoundException, ConflictException, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";

export function calculateSupplierLedger(purchases: any[], payments: any[]): number {
  const validPurchases = (purchases || []).filter(
    (p) => !p.status || !["cancelled", "CANCELLED"].includes(p.status)
  );

  // Sort purchases chronologically by date/createdAt/id
  const sortedPurchases = [...validPurchases].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.purchaseDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.purchaseDate || 0).getTime();
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

  for (const pur of sortedPurchases) {
    const purTime = new Date(pur.createdAt || pur.purchaseDate || 0).getTime();

    // Apply payments made before or at this purchase
    while (pIdx < sortedPayments.length) {
      const p = sortedPayments[pIdx];
      const pTime = new Date(p.createdAt || p.paymentDate || 0).getTime();
      if (pTime < purTime) {
        const amt = Number(p.amount || 0);
        const t = (p.type || "pay").toLowerCase();
        if (t === "pay" || t === "paid" || t === "adjustment_debit") {
          runningBalance -= amt;
        } else if (t === "receive" || t === "received" || t === "adjustment_credit") {
          runningBalance += amt;
        }
        pIdx++;
      } else {
        break;
      }
    }

    // Check for manual balance adjustment on purchase if not already recorded in payments
    const invNum = String(pur.invoiceNumber || "");
    if (Boolean(pur.showPreviousBalance) && !adjustmentRefs.has(invNum)) {
      const enteredPrev = Number(pur.previousDue || 0) - Number(pur.advancePayment || 0);
      const delta = enteredPrev - runningBalance;
      if (Math.abs(delta) > 0.001) {
        runningBalance += delta;
      }
    }

    const gt = Number(pur.grandTotal || pur.total || 0);
    let ret = 0;
    if (pur.returns && Array.isArray(pur.returns)) {
      ret = pur.returns.reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0);
    }
    runningBalance += (gt - ret);
  }

  // Apply remaining payments made after the last purchase
  while (pIdx < sortedPayments.length) {
    const p = sortedPayments[pIdx];
    const amt = Number(p.amount || 0);
    const t = (p.type || "pay").toLowerCase();
    if (t === "pay" || t === "paid" || t === "adjustment_debit") {
      runningBalance -= amt;
    } else if (t === "receive" || t === "received" || t === "adjustment_credit") {
      runningBalance += amt;
    }
    pIdx++;
  }

  return Number(runningBalance.toFixed(2));
}

export async function recalculateSupplierBalance(
  prisma: any,
  supplierId: number
): Promise<number> {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      payments: {
        where: { deletedAt: null },
        select: { id: true, amount: true, type: true, referenceNumber: true, paymentDate: true, createdAt: true, paymentMethod: true },
      },
      purchases: {
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
          purchaseDate: true,
          createdAt: true,
          returns: { select: { totalAmount: true } },
        },
      },
    },
  });

  if (!supplier) return 0;
  const balance = calculateSupplierLedger(supplier.purchases, supplier.payments);
  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      outstandingBalance: balance,
    },
  });
  return balance;
}

@Injectable()
export class SuppliersService implements OnModuleInit {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      this.logger.log("Syncing all supplier outstandingBalances directly in DB...");
      const suppliers = await this.prisma.supplier.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      for (const s of suppliers) {
        await recalculateSupplierBalance(this.prisma, s.id);
      }
      this.logger.log(`Synced balances for ${suppliers.length} suppliers in DB.`);
    } catch (err) {
      this.logger.warn("Initial supplier balance calculation warning:", err);
    }
  }

  async create(createSupplierDto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({
      where: { name: createSupplierDto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException("Supplier name already exists");
    }

    const created = await this.prisma.supplier.create({
      data: createSupplierDto,
    });
    return { ...created, outstandingBalance: 0 };
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
            } catch (createError) {}
          }
        }
      } else {
        try {
          const created = await this.create(data);
          results.push(created);
        } catch (error) {}
      }
    }
    return results;
  }

  async findAll() {
    const suppliers = await this.prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { id: "desc" },
    });

    return suppliers.map((s) => ({
      ...s,
      outstandingBalance: Number(s.outstandingBalance || 0),
    }));
  }

  async findOne(id: number) {
    const item = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return {
      ...item,
      outstandingBalance: Number(item.outstandingBalance || 0),
    };
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    const item = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    if (updateSupplierDto.name && updateSupplierDto.name !== item.name) {
      const existing = await this.prisma.supplier.findFirst({
        where: { name: updateSupplierDto.name, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException("Supplier name already exists");
      }
    }

    await this.prisma.supplier.update({
      where: { id },
      data: {
        ...updateSupplierDto,
        version: { increment: 1 },
      },
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const item = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async recalculateBalance(supplierId: number, tx?: any): Promise<number> {
    return recalculateSupplierBalance(tx || this.prisma, supplierId);
  }
}
