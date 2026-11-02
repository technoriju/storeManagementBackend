import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";

export interface PermissionModuleGroup {
  code: string;
  name: string;
  permissions: {
    id: number;
    action: string;
    description: string | null;
  }[];
}

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  getModuleInfo(action: string): { code: string; name: string } {
    if (action === "*") {
      return { code: "wildcard", name: "Super Admin (All Access)" };
    }
    if (action.startsWith("dashboard:")) {
      return { code: "dashboard", name: "Dashboard" };
    }
    if (
      action.startsWith("inventory:") ||
      action.startsWith("products:") ||
      action.startsWith("stock:") ||
      action.startsWith("barcode:")
    ) {
      return { code: "inventory", name: "Inventory & Products" };
    }
    if (
      action.startsWith("sales:") ||
      action.startsWith("pos:") ||
      action.startsWith("invoices:") ||
      action.startsWith("quotations:") ||
      action.startsWith("discounts:")
    ) {
      return { code: "sales", name: "Sales & POS" };
    }
    if (
      action.startsWith("purchases:") ||
      action.startsWith("purchase_orders:")
    ) {
      return { code: "purchases", name: "Purchases & Vendors" };
    }
    if (
      action.startsWith("finance:") ||
      action.startsWith("expenses:") ||
      action.startsWith("income:") ||
      action.startsWith("banking:")
    ) {
      return { code: "finance", name: "Finance & Accounts" };
    }
    if (
      action.startsWith("hrm:") ||
      action.startsWith("employees:") ||
      action.startsWith("departments:") ||
      action.startsWith("designations:") ||
      action.startsWith("shifts:") ||
      action.startsWith("attendance:") ||
      action.startsWith("leaves:") ||
      action.startsWith("payroll:")
    ) {
      return { code: "hrm", name: "HRM & Payroll" };
    }
    if (action.startsWith("customers:") || action.startsWith("suppliers:")) {
      return { code: "parties", name: "Customers & Suppliers" };
    }
    if (action.startsWith("reports:")) {
      return { code: "reports", name: "Reports & Analytics" };
    }
    if (
      action.startsWith("users:") ||
      action.startsWith("roles:") ||
      action.startsWith("permissions:")
    ) {
      return { code: "users", name: "User & Role Management" };
    }
    if (
      action.startsWith("settings:") ||
      action.startsWith("branches:") ||
      action.startsWith("warehouses:") ||
      action.startsWith("printers:") ||
      action.startsWith("sync:")
    ) {
      return { code: "settings", name: "Settings & Administration" };
    }

    const prefix = action.includes(":") ? action.split(":")[0] : action;
    return {
      code: prefix,
      name: prefix.charAt(0).toUpperCase() + prefix.slice(1),
    };
  }

  async findAll() {
    const permissions = await this.prisma.permission.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        id: "asc",
      },
    });

    return permissions.map((p) => {
      const moduleInfo = this.getModuleInfo(p.action);
      return {
        id: p.id,
        action: p.action,
        description: p.description,
        module: moduleInfo.name,
        moduleCode: moduleInfo.code,
        status: p.status,
        createdAt: p.createdAt,
      };
    });
  }

  async findModules(): Promise<PermissionModuleGroup[]> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        id: "asc",
      },
    });

    const moduleOrder = [
      "dashboard",
      "inventory",
      "sales",
      "purchases",
      "finance",
      "hrm",
      "parties",
      "reports",
      "users",
      "settings",
      "wildcard",
    ];

    const groupMap = new Map<string, PermissionModuleGroup>();

    for (const p of permissions) {
      const mod = this.getModuleInfo(p.action);
      if (!groupMap.has(mod.code)) {
        groupMap.set(mod.code, {
          code: mod.code,
          name: mod.name,
          permissions: [],
        });
      }
      groupMap.get(mod.code)!.permissions.push({
        id: p.id,
        action: p.action,
        description: p.description,
      });
    }

    // Sort according to standard workflow order
    return Array.from(groupMap.values()).sort((a, b) => {
      const indexA = moduleOrder.indexOf(a.code);
      const indexB = moduleOrder.indexOf(b.code);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }
}
