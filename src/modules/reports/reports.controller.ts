import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { Response } from "express";
import { ReportsService } from "./reports.service";
import { ExcelService } from "./excel.service";
import { ReportFiltersDto } from "./dto/report-filters.dto";

@ApiTags("reports")
@Controller("reports")
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly excelService: ExcelService,
  ) {}

  // ==========================================
  // EXCEL PRODUCT IMPORT & EXPORT
  // ==========================================

  @Get(["products/export", "export/products"])
  @ApiOperation({
    summary: "Export products catalogue with stock and prices to Excel",
  })
  async exportProducts(
    @Query() filters: ReportFiltersDto,
    @Res() res: Response,
  ) {
    const buffer = await this.excelService.exportProducts(filters);
    const filename = `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.end(buffer);
  }

  @Post(["products/import", "import/products"])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Import products catalogue from Excel file" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async importProducts(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Excel file is required in multipart form data under field "file"',
      );
    }
    return this.excelService.importProducts(file.buffer);
  }

  // ==========================================
  // 14 BUSINESS REPORTS
  // ==========================================

  @Get("sales")
  @ApiOperation({ summary: "1. Sales Report with aggregates and pagination" })
  async getSalesReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getSalesReport(filters);
  }

  @Get("purchases")
  @ApiOperation({
    summary: "2. Purchase Report with aggregates and pagination",
  })
  async getPurchaseReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getPurchaseReport(filters);
  }

  @Get("profit")
  @ApiOperation({
    summary: "3. Profit Report (Gross Profit, COGS, Net Profit, Margin)",
  })
  async getProfitReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getProfitReport(filters);
  }

  @Get("stock")
  @ApiOperation({
    summary: "4. Stock Report with warehouse breakdown and inventory valuation",
  })
  async getStockReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getStockReport(filters);
  }

  @Get("stock-ledger")
  @ApiOperation({
    summary: "5. Stock Ledger (movement history, IN/OUT, running balances)",
  })
  async getStockLedger(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getStockLedger(filters);
  }

  @Get("customer-outstanding")
  @ApiOperation({
    summary: "6. Customer Outstanding (receivables, credit limits, overdue)",
  })
  async getCustomerOutstanding(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getCustomerOutstanding(filters);
  }

  @Get("supplier-outstanding")
  @ApiOperation({
    summary: "7. Supplier Outstanding (payables, billed vs paid)",
  })
  async getSupplierOutstanding(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getSupplierOutstanding(filters);
  }

  @Get("payments")
  @ApiOperation({
    summary: "8. Payment Report (received and paid, payment methods breakdown)",
  })
  async getPaymentReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getPaymentReport(filters);
  }

  @Get("expenses")
  @ApiOperation({
    summary: "9. Expense Report with category breakdown and averages",
  })
  async getExpenseReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getExpenseReport(filters);
  }

  @Get("gst-summary")
  @ApiOperation({
    summary: "10. GST Summary (Output GST, Input Tax Credit, Net Liability)",
  })
  async getGstSummary(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getGstSummary(filters);
  }

  @Get("daily-sales")
  @ApiOperation({
    summary: "11. Daily Sales report with day-by-day revenue breakdown",
  })
  async getDailySalesReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getDailySalesReport(filters);
  }

  @Get("monthly-sales")
  @ApiOperation({
    summary: "12. Monthly Sales report with monthly trends and totals",
  })
  async getMonthlySalesReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getMonthlySalesReport(filters);
  }

  @Get("top-products")
  @ApiOperation({
    summary: "13. Top Products report by sales volume and revenue",
  })
  async getTopProductsReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getTopProductsReport(filters);
  }

  @Get("low-stock")
  @ApiOperation({
    summary: "14. Low Stock alert report with reorder thresholds",
  })
  async getLowStockReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getLowStockReport(filters);
  }

  // ==========================================
  // EXCEL EXPORT FOR ANY REPORT
  // ==========================================

  @Get("export/:reportType")
  @ApiOperation({
    summary: "Export any tabular report directly into an Excel spreadsheet",
  })
  async exportReportToExcel(
    @Param("reportType") reportType: string,
    @Query() filters: ReportFiltersDto,
    @Res() res: Response,
  ) {
    let title = reportType.toUpperCase();
    let columns: { header: string; key: string; width?: number }[] = [];
    let rows: any[] = [];

    // Fetch full data set (set higher limit for export)
    const exportFilters: ReportFiltersDto = {
      ...filters,
      page: 1,
      limit: 1000,
    };

    switch (reportType.toLowerCase()) {
      case "sales": {
        title = "Sales_Report";
        columns = [
          { header: "Invoice #", key: "invoiceNumber", width: 18 },
          { header: "Date", key: "saleDate", width: 22 },
          { header: "Customer", key: "customerName", width: 25 },
          { header: "Branch", key: "branchName", width: 18 },
          { header: "Sub Total", key: "subTotal", width: 14 },
          { header: "Tax Total", key: "taxTotal", width: 14 },
          { header: "Discount", key: "discountTotal", width: 14 },
          { header: "Grand Total", key: "grandTotal", width: 16 },
          { header: "Paid", key: "paidAmount", width: 14 },
          { header: "Due", key: "dueAmount", width: 14 },
        ];
        const result = await this.reportsService.getSalesReport(exportFilters);
        rows = result.data;
        break;
      }
      case "purchases": {
        title = "Purchase_Report";
        columns = [
          { header: "Invoice #", key: "invoiceNumber", width: 18 },
          { header: "Date", key: "purchaseDate", width: 22 },
          { header: "Supplier", key: "supplierName", width: 25 },
          { header: "Branch", key: "branchName", width: 18 },
          { header: "Sub Total", key: "subTotal", width: 14 },
          { header: "Tax Total", key: "taxTotal", width: 14 },
          { header: "Discount", key: "discountTotal", width: 14 },
          { header: "Grand Total", key: "grandTotal", width: 16 },
          { header: "Paid", key: "paidAmount", width: 14 },
          { header: "Due", key: "dueAmount", width: 14 },
        ];
        const result =
          await this.reportsService.getPurchaseReport(exportFilters);
        rows = result.data;
        break;
      }
      case "profit": {
        title = "Profit_Report";
        columns = [
          { header: "Invoice #", key: "invoiceNumber", width: 18 },
          { header: "Date", key: "saleDate", width: 22 },
          { header: "Customer", key: "customerName", width: 25 },
          { header: "Revenue", key: "revenue", width: 16 },
          { header: "Cost (COGS)", key: "estimatedCost", width: 16 },
          { header: "Gross Profit", key: "grossProfit", width: 16 },
          { header: "Margin %", key: "profitMargin", width: 14 },
        ];
        const result = await this.reportsService.getProfitReport(exportFilters);
        rows = result.data;
        break;
      }
      case "stock": {
        title = "Stock_Report";
        columns = [
          { header: "Code", key: "productCode", width: 16 },
          { header: "Product Name", key: "productName", width: 28 },
          { header: "SKU", key: "sku", width: 16 },
          { header: "Category", key: "category", width: 18 },
          { header: "Warehouse", key: "warehouseName", width: 18 },
          { header: "Quantity", key: "quantity", width: 14 },
          { header: "Unit", key: "unit", width: 10 },
          { header: "Unit Cost", key: "unitCost", width: 14 },
          { header: "Stock Value", key: "stockValue", width: 16 },
        ];
        const result = await this.reportsService.getStockReport(exportFilters);
        rows = result.data;
        break;
      }
      case "stock-ledger": {
        title = "Stock_Ledger";
        columns = [
          { header: "Date", key: "createdAt", width: 22 },
          { header: "Product", key: "productName", width: 25 },
          { header: "Warehouse", key: "warehouseName", width: 18 },
          { header: "Type", key: "transactionType", width: 16 },
          { header: "Direction", key: "direction", width: 12 },
          { header: "Quantity", key: "quantity", width: 14 },
          { header: "Unit", key: "unit", width: 10 },
          { header: "Reference ID", key: "referenceId", width: 24 },
        ];
        const result = await this.reportsService.getStockLedger(exportFilters);
        rows = result.data;
        break;
      }
      case "customer-outstanding": {
        title = "Customer_Outstanding";
        columns = [
          { header: "Customer Name", key: "name", width: 25 },
          { header: "Phone", key: "phone", width: 16 },
          { header: "GSTIN", key: "gstin", width: 18 },
          { header: "Credit Limit", key: "creditLimit", width: 14 },
          { header: "Total Billed", key: "totalBilled", width: 16 },
          { header: "Total Paid", key: "totalPaid", width: 16 },
          { header: "Outstanding", key: "outstandingBalance", width: 16 },
        ];
        const result =
          await this.reportsService.getCustomerOutstanding(exportFilters);
        rows = result.data;
        break;
      }
      case "supplier-outstanding": {
        title = "Supplier_Outstanding";
        columns = [
          { header: "Supplier Name", key: "name", width: 25 },
          { header: "Phone", key: "phone", width: 16 },
          { header: "GSTIN", key: "gstin", width: 18 },
          { header: "Total Purchased", key: "totalPurchased", width: 16 },
          { header: "Total Paid", key: "totalPaid", width: 16 },
          {
            header: "Outstanding Payable",
            key: "outstandingBalance",
            width: 18,
          },
        ];
        const result =
          await this.reportsService.getSupplierOutstanding(exportFilters);
        rows = result.data;
        break;
      }
      case "payments": {
        title = "Payment_Report";
        columns = [
          { header: "Date", key: "paymentDate", width: 22 },
          { header: "Type", key: "type", width: 12 },
          { header: "Party Name", key: "partyName", width: 25 },
          { header: "Invoice #", key: "invoiceNumber", width: 18 },
          { header: "Amount", key: "amount", width: 16 },
          { header: "Method", key: "paymentMethod", width: 16 },
          { header: "Reference #", key: "referenceNumber", width: 20 },
        ];
        const result =
          await this.reportsService.getPaymentReport(exportFilters);
        rows = result.data;
        break;
      }
      case "expenses": {
        title = "Expense_Report";
        columns = [
          { header: "Date", key: "expenseDate", width: 22 },
          { header: "Category", key: "category", width: 20 },
          { header: "Amount", key: "amount", width: 16 },
          { header: "Branch", key: "branchName", width: 18 },
          { header: "Created By", key: "userName", width: 20 },
          { header: "Description", key: "description", width: 30 },
        ];
        const result =
          await this.reportsService.getExpenseReport(exportFilters);
        rows = result.data;
        break;
      }
      case "gst-summary": {
        title = "GST_Summary";
        columns = [
          { header: "Invoice #", key: "invoiceNumber", width: 18 },
          { header: "Date", key: "date", width: 22 },
          { header: "Party Name", key: "partyName", width: 25 },
          { header: "GSTIN", key: "gstin", width: 18 },
          { header: "Taxable Value", key: "taxableValue", width: 16 },
          { header: "CGST", key: "cgst", width: 12 },
          { header: "SGST", key: "sgst", width: 12 },
          { header: "IGST", key: "igst", width: 12 },
          { header: "Total Tax", key: "totalTax", width: 14 },
          { header: "Invoice Total", key: "totalAmount", width: 16 },
        ];
        const result = await this.reportsService.getGstSummary(exportFilters);
        rows = result.data;
        break;
      }
      case "daily-sales": {
        title = "Daily_Sales";
        columns = [
          { header: "Date", key: "date", width: 16 },
          { header: "Invoices Count", key: "invoicesCount", width: 16 },
          { header: "Sub Total", key: "subTotal", width: 16 },
          { header: "Tax Total", key: "taxTotal", width: 16 },
          { header: "Discount Total", key: "discountTotal", width: 16 },
          { header: "Grand Total", key: "grandTotal", width: 18 },
        ];
        const result =
          await this.reportsService.getDailySalesReport(exportFilters);
        rows = result.data;
        break;
      }
      case "monthly-sales": {
        title = "Monthly_Sales";
        columns = [
          { header: "Month", key: "month", width: 16 },
          { header: "Invoices Count", key: "invoicesCount", width: 16 },
          { header: "Sub Total", key: "subTotal", width: 16 },
          { header: "Tax Total", key: "taxTotal", width: 16 },
          { header: "Discount Total", key: "discountTotal", width: 16 },
          { header: "Grand Total", key: "grandTotal", width: 18 },
        ];
        const result =
          await this.reportsService.getMonthlySalesReport(exportFilters);
        rows = result.data;
        break;
      }
      case "top-products": {
        title = "Top_Products";
        columns = [
          { header: "Rank", key: "rank", width: 10 },
          { header: "Code", key: "productCode", width: 16 },
          { header: "Product Name", key: "name", width: 28 },
          { header: "SKU", key: "sku", width: 16 },
          { header: "Category", key: "category", width: 18 },
          { header: "Quantity Sold", key: "totalQuantitySold", width: 16 },
          { header: "Total Revenue", key: "totalRevenue", width: 18 },
          { header: "Order Count", key: "orderCount", width: 14 },
        ];
        const result =
          await this.reportsService.getTopProductsReport(exportFilters);
        rows = result.data;
        break;
      }
      case "low-stock": {
        title = "Low_Stock_Report";
        columns = [
          { header: "Code", key: "productCode", width: 16 },
          { header: "Product Name", key: "name", width: 28 },
          { header: "SKU", key: "sku", width: 16 },
          { header: "Category", key: "category", width: 18 },
          { header: "Current Stock", key: "currentStock", width: 14 },
          { header: "Unit", key: "unit", width: 10 },
          { header: "Low Stock Alert", key: "lowStockLevel", width: 16 },
          { header: "Reorder Level", key: "reorderLevel", width: 14 },
          { header: "Status", key: "status", width: 14 },
        ];
        const result =
          await this.reportsService.getLowStockReport(exportFilters);
        rows = result.data;
        break;
      }
      default:
        throw new BadRequestException(`Unknown report type: "${reportType}"`);
    }

    const buffer = await this.excelService.exportReportToExcel(
      title,
      columns,
      rows,
    );
    const filename = `${title}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.end(buffer);
  }
}
