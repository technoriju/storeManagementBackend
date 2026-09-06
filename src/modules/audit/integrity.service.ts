import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";

@Injectable()
export class IntegrityService {
  private readonly logger = new Logger(IntegrityService.name);

  constructor(private prisma: PrismaService) {}

  async checkDataIntegrity() {
    this.logger.log("Starting Data Integrity Check...");
    const issues = [];

    // Check Stock Balances
    const products = await this.prisma.product.findMany({
      include: { stockBalances: true, stockTransactions: true },
    });

    for (const product of products) {
      for (const balance of product.stockBalances) {
        const transactions = product.stockTransactions.filter(
          (t) => t.warehouseId === balance.warehouseId,
        );
        let expectedBalance = 0;
        for (const t of transactions) {
          if (
            ["PURCHASE", "SALE_RETURN", "STOCK_IN"].includes(t.transactionType)
          ) {
            expectedBalance += Number(t.baseQuantity);
          } else if (
            ["SALE", "PURCHASE_RETURN", "STOCK_OUT"].includes(t.transactionType)
          ) {
            expectedBalance -= Number(t.baseQuantity);
          }
        }
        if (Math.abs(expectedBalance - Number(balance.quantity)) > 0.01) {
          issues.push(
            `Stock mismatch for Product ${product.id} in Warehouse ${balance.warehouseId}. Expected: ${expectedBalance}, Found: ${balance.quantity}`,
          );
        }
      }
    }

    // Check Sales Total vs Payments
    const sales = await this.prisma.sale.findMany({
      include: { payments: { include: { payment: true } } },
    });

    for (const sale of sales) {
      const paid = sale.payments.reduce(
        (sum, p) => sum + Number(p.payment.amount),
        0,
      );
      if (paid > Number(sale.grandTotal)) {
        issues.push(
          `Overpayment for Sale ${sale.id}. Total: ${sale.grandTotal}, Paid: ${paid}`,
        );
      }
    }

    if (issues.length > 0) {
      this.logger.warn(`Data Integrity Issues Found: \n${issues.join("\n")}`);
    } else {
      this.logger.log("Data Integrity Check Passed: All consistent.");
    }

    return issues;
  }
}
