import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { name: createCustomerDto.name, deletedAt: null },
    });
    if (existing) {
      return existing;
    }

    const created = await this.prisma.customer.create({
      data: createCustomerDto,
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

  private calculateOutstanding(sales: any[], payments: any[]): number {
    const validSales = (sales || []).filter(
      (s) => !s.status || !["cancelled", "CANCELLED"].includes(s.status)
    );

    // Sort chronologically by date/createdAt/id
    const sortedSales = [...validSales].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.saleDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.saleDate || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return Number(a.id || 0) - Number(b.id || 0);
    });

    // Find the latest sale where showPreviousBalance was active
    let anchorIndex = -1;
    for (let i = sortedSales.length - 1; i >= 0; i--) {
      if (Boolean(sortedSales[i].showPreviousBalance)) {
        anchorIndex = i;
        break;
      }
    }

    if (anchorIndex >= 0) {
      const anchor = sortedSales[anchorIndex];
      const anchorPrev = Number(anchor.previousDue || 0) - Number(anchor.advancePayment || 0);
      const anchorTotal = Number(anchor.grandTotal || anchor.total || 0);
      let anchorReturns = 0;
      if (anchor.returns && Array.isArray(anchor.returns)) {
        anchorReturns = anchor.returns.reduce(
          (sum: number, r: any) => sum + Number(r.totalAmount || 0),
          0
        );
      }
      const anchorPaid = Number(anchor.paid || 0);
      let balance = anchorPrev + (anchorTotal - anchorReturns) - anchorPaid;

      // Add subsequent sales after anchor
      const anchorTime = new Date(anchor.createdAt || anchor.saleDate || 0).getTime();
      const subsequentInvoiceNumbers = new Set<string>();

      for (let i = anchorIndex + 1; i < sortedSales.length; i++) {
        const s = sortedSales[i];
        if (s.invoiceNumber) subsequentInvoiceNumbers.add(String(s.invoiceNumber));
        const gt = Number(s.grandTotal || s.total || 0);
        let ret = 0;
        if (s.returns && Array.isArray(s.returns)) {
          ret = s.returns.reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0);
        }
        const pd = Number(s.paid || 0);
        balance += (gt - ret) - pd;
      }

      // Standalone payments received after anchor sale
      const anchorInvoiceNumber = anchor.invoiceNumber ? String(anchor.invoiceNumber) : null;
      (payments || []).forEach((p) => {
        const pTime = new Date(p.createdAt || p.paymentDate || 0).getTime();
        const pRef = p.referenceNumber || p.reference ? String(p.referenceNumber || p.reference) : null;

        if (pRef && (pRef === anchorInvoiceNumber || subsequentInvoiceNumbers.has(pRef))) {
          return;
        }

        if (pTime > anchorTime) {
          const amt = Number(p.amount || 0);
          const t = (p.type || "receive").toLowerCase();
          if (t === "receive" || t === "received") {
            balance -= amt;
          } else if (t === "pay" || t === "paid") {
            balance += amt;
          }
        }
      });

      return Number(balance.toFixed(2));
    }

    const totalBilled = (sortedSales || []).reduce((sum, s) => {
      const gt = Number(s.grandTotal || s.total || 0);
      let returned = 0;
      if (s.returns && Array.isArray(s.returns)) {
        returned = s.returns.reduce(
          (rSum: number, r: any) => rSum + Number(r.totalAmount || 0),
          0
        );
      }
      return sum + (gt - returned);
    }, 0);

    let totalReceived = 0;
    let totalRefunded = 0;
    (payments || []).forEach((p) => {
      const amt = Number(p.amount || 0);
      const t = (p.type || "receive").toLowerCase();
      if (t === "receive" || t === "received") {
        totalReceived += amt;
      } else if (t === "pay" || t === "paid") {
        totalRefunded += amt;
      }
    });

    return Number(((totalBilled + totalRefunded) - totalReceived).toFixed(2));
  }

  async findAll() {
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null },
      include: {
        payments: {
          where: {
            deletedAt: null,
          },
          select: { id: true, amount: true, type: true, referenceNumber: true, paymentDate: true, createdAt: true },
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
      orderBy: { id: "desc" },
    });

    return customers.map((c) => {
      const { sales, payments, ...rest } = c;
      return {
        ...rest,
        outstandingBalance: this.calculateOutstanding(sales, payments),
      };
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        payments: {
          where: {
            deletedAt: null,
          },
          select: { id: true, amount: true, type: true, referenceNumber: true, paymentDate: true, createdAt: true },
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

    if (!item) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const { sales, payments, ...rest } = item;
    return {
      ...rest,
      outstandingBalance: this.calculateOutstanding(sales, payments),
    };
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
