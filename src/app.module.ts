import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import { PrismaModule } from "./infrastructure/data-access/prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { PermissionsModule } from "./modules/permissions/permissions.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { WarehousesModule } from "./modules/warehouses/warehouses.module";
import { ProductsModule } from "./modules/products/products.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { UnitsModule } from "./modules/units/units.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { PurchasesModule } from "./modules/purchases/purchases.module";
import { SalesModule } from "./modules/sales/sales.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { BillingModule } from "./modules/billing/billing.module";
import { SyncModule } from "./modules/sync/sync.module";
import { AuditModule } from "./modules/audit/audit.module";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { SubCategoriesModule } from "./modules/subcategories/subcategories.module";

// We will import feature modules here

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      load: [appConfig, databaseConfig],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    DevicesModule,
    CompaniesModule,
    BranchesModule,
    WarehousesModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    UnitsModule,
    CustomersModule,
    SuppliersModule,
    PurchasesModule,
    SalesModule,
    InventoryModule,
    PaymentsModule,
    ExpensesModule,
    ReportsModule,
    BillingModule,
    SyncModule,
    AuditModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    SubCategoriesModule,
    // Add other feature modules here as they are developed
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
