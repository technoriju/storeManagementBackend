import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PERMISSIONS_CATALOG = [
  // Dashboard
  { action: 'dashboard:view', description: 'View dashboard and overview analytics', module: 'Dashboard' },

  // Inventory & Stock
  { action: 'inventory:view', description: 'View inventory and stock levels', module: 'Inventory' },
  { action: 'products:create', description: 'Create new products', module: 'Inventory' },
  { action: 'products:edit', description: 'Edit existing products', module: 'Inventory' },
  { action: 'products:delete', description: 'Delete or archive products', module: 'Inventory' },
  { action: 'stock:manage', description: 'Manage stock levels and warehouses', module: 'Inventory' },
  { action: 'stock:adjustment', description: 'Perform stock adjustments and reconciliations', module: 'Inventory' },
  { action: 'stock:transfer', description: 'Transfer stock between branches or warehouses', module: 'Inventory' },
  { action: 'barcode:print', description: 'Generate and print product barcodes/labels', module: 'Inventory' },

  // Sales & POS
  { action: 'sales:view', description: 'View sales history, receipts, and order lists', module: 'Sales' },
  { action: 'pos:create', description: 'Access Point of Sale and create sales transactions', module: 'Sales' },
  { action: 'invoices:view', description: 'View and print sales invoices', module: 'Sales' },
  { action: 'sales:return', description: 'Process customer sales returns and credit notes', module: 'Sales' },
  { action: 'quotations:view', description: 'View and manage price quotations/estimates', module: 'Sales' },
  { action: 'discounts:apply', description: 'Apply custom discounts to sales orders', module: 'Sales' },

  // Purchases
  { action: 'purchases:view', description: 'View purchase orders and vendor bills', module: 'Purchases' },
  { action: 'purchases:create', description: 'Create purchases and receive goods', module: 'Purchases' },
  { action: 'purchase_orders:manage', description: 'Create and manage purchase orders', module: 'Purchases' },
  { action: 'purchases:return', description: 'Process debit notes and purchase returns', module: 'Purchases' },

  // Finance & Banking
  { action: 'finance:view', description: 'View financial overview and accounts', module: 'Finance' },
  { action: 'expenses:manage', description: 'Record, edit, and approve expenses', module: 'Finance' },
  { action: 'income:manage', description: 'Record and track additional income', module: 'Finance' },
  { action: 'banking:manage', description: 'Manage bank accounts, transfers, and balances', module: 'Finance' },
  { action: 'reports:financial', description: 'View financial statements and P&L reports', module: 'Finance' },

  // HRM
  { action: 'hrm:view', description: 'View human resource management dashboard', module: 'HRM' },
  { action: 'employees:manage', description: 'Manage employee profiles and records', module: 'HRM' },
  { action: 'departments:manage', description: 'Manage company departments', module: 'HRM' },
  { action: 'designations:manage', description: 'Manage job designations and grades', module: 'HRM' },
  { action: 'shifts:manage', description: 'Manage work shifts and work schedules', module: 'HRM' },
  { action: 'attendance:manage', description: 'Track, log, and approve employee attendance', module: 'HRM' },
  { action: 'leaves:manage', description: 'Manage leave requests and leave policies', module: 'HRM' },
  { action: 'payroll:manage', description: 'Process payroll, salaries, and payslips', module: 'HRM' },

  // Customers & Suppliers
  { action: 'customers:manage', description: 'Create, update, and manage customer records', module: 'Parties' },
  { action: 'suppliers:manage', description: 'Create, update, and manage supplier accounts', module: 'Parties' },

  // Reports
  { action: 'reports:view', description: 'Access business reports and summaries', module: 'Reports' },
  { action: 'reports:export', description: 'Export reports to Excel, PDF, or CSV', module: 'Reports' },

  // Users & Access Control
  { action: 'users:view', description: 'View system users and login history', module: 'Users' },
  { action: 'users:manage', description: 'Create, edit, and manage user accounts', module: 'Users' },
  { action: 'roles:view', description: 'View role configurations', module: 'Users' },
  { action: 'roles:manage', description: 'Create and modify roles and permissions', module: 'Users' },
  { action: 'permissions:manage', description: 'Manage system-wide permissions catalog', module: 'Users' },

  // Settings & System
  { action: 'settings:general', description: 'Access and modify general store settings', module: 'Settings' },
  { action: 'branches:manage', description: 'Create and configure store branches', module: 'Settings' },
  { action: 'warehouses:manage', description: 'Manage storage warehouses and locations', module: 'Settings' },
  { action: 'printers:manage', description: 'Configure thermal receipt and barcode printers', module: 'Settings' },
  { action: 'sync:manage', description: 'Manage offline database synchronization', module: 'Settings' },

  // Wildcard
  { action: '*', description: 'Super Admin wildcard - unrestricted access to all endpoints', module: 'Wildcard' },
];

export const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    description: 'System owner with full unconstrained permissions including wildcard access',
    actions: ['*'], // Will also include all catalog permissions
  },
  {
    name: 'Admin',
    description: 'Full business administrator for all operational modules',
    actions: PERMISSIONS_CATALOG.map((p) => p.action).filter((act) => act !== '*'),
  },
  {
    name: 'Manager',
    description: 'Store manager with inventory, sales, purchases, contacts, and reports access',
    actions: [
      'dashboard:view',
      'inventory:view',
      'products:create',
      'products:edit',
      'products:delete',
      'stock:manage',
      'stock:adjustment',
      'stock:transfer',
      'barcode:print',
      'sales:view',
      'pos:create',
      'invoices:view',
      'sales:return',
      'quotations:view',
      'discounts:apply',
      'purchases:view',
      'purchases:create',
      'purchase_orders:manage',
      'purchases:return',
      'customers:manage',
      'suppliers:manage',
      'reports:view',
      'reports:export',
    ],
  },
  {
    name: 'Cashier',
    description: 'Point of Sale operator and frontline customer billing',
    actions: [
      'dashboard:view',
      'pos:create',
      'sales:view',
      'invoices:view',
      'customers:manage',
    ],
  },
  {
    name: 'Accountant',
    description: 'Financial accountant managing expenses, incomes, bank accounts, and balance sheets',
    actions: [
      'dashboard:view',
      'finance:view',
      'expenses:manage',
      'income:manage',
      'banking:manage',
      'reports:financial',
      'reports:view',
      'reports:export',
    ],
  },
  {
    name: 'HR Manager',
    description: 'Human resources manager overseeing staff, departments, attendance, and payroll',
    actions: [
      'dashboard:view',
      'hrm:view',
      'employees:manage',
      'departments:manage',
      'designations:manage',
      'shifts:manage',
      'attendance:manage',
      'leaves:manage',
      'payroll:manage',
      'reports:view',
    ],
  },
];

async function main() {
  console.log('Seeding Permissions Catalog...');

  const permissionMap = new Map<string, number>();

  for (const perm of PERMISSIONS_CATALOG) {
    let existing = await prisma.permission.findFirst({
      where: { action: perm.action },
    });

    if (existing) {
      existing = await prisma.permission.update({
        where: { id: existing.id },
        data: {
          description: perm.description,
          status: 'ACTIVE',
        },
      });
      permissionMap.set(perm.action, existing.id);
    } else {
      const created = await prisma.permission.create({
        data: {
          action: perm.action,
          description: perm.description,
          status: 'ACTIVE',
        },
      });
      permissionMap.set(perm.action, created.id);
    }
  }

  console.log(`Seeded ${permissionMap.size} permissions into catalog.`);

  console.log('Seeding Default Roles & Permissions...');

  for (const roleDef of DEFAULT_ROLES) {
    let role = await prisma.role.findFirst({
      where: { name: roleDef.name },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleDef.name,
          description: roleDef.description,
          status: 'ACTIVE',
        },
      });
      console.log(`Created role: ${role.name} (id: ${role.id})`);
    } else {
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          description: roleDef.description,
          status: 'ACTIVE',
        },
      });
      console.log(`Updated role: ${role.name} (id: ${role.id})`);
    }

    // Determine permissions to assign
    const actionsToAssign = roleDef.name === 'Super Admin'
      ? Array.from(permissionMap.keys()) // Super Admin gets all catalog actions including '*'
      : roleDef.actions;

    // Clear existing permissions for this role to make seeding idempotent
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Create role-permission mappings
    const rolePermissionsData = actionsToAssign
      .map((action) => {
        const permId = permissionMap.get(action);
        if (!permId) return null;
        return {
          roleId: role.id,
          permissionId: permId,
          status: 'ACTIVE',
        };
      })
      .filter((rp): rp is { roleId: number; permissionId: number; status: string } => rp !== null);

    if (rolePermissionsData.length > 0) {
      await prisma.rolePermission.createMany({
        data: rolePermissionsData,
        skipDuplicates: true,
      });
    }

    console.log(`Assigned ${rolePermissionsData.length} permissions to role '${role.name}'.`);
  }

  // Ensure Admin user has role 'Admin' or 'Super Admin'
  const adminUser = await prisma.user.findFirst({
    where: { username: 'admin' },
  });

  if (adminUser) {
    // If Admin role exists, ensure admin user is linked
    const adminRole = await prisma.role.findFirst({
      where: { name: 'Admin' },
    });
    if (adminRole && adminUser.roleId !== adminRole.id) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { roleId: adminRole.id },
      });
      console.log(`Updated user '${adminUser.username}' with role 'Admin' (id: ${adminRole.id}).`);
    } else {
      console.log(`User '${adminUser.username}' is assigned to role id ${adminUser.roleId}.`);
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
