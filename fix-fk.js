const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRaw`
      UPDATE Product 
      SET defaultPurchaseUnitId = NULL 
      WHERE defaultPurchaseUnitId NOT IN (SELECT id FROM ProductUnit)
    `;
    console.log("Fixed defaultPurchaseUnitId");
    
    await prisma.$executeRaw`
      UPDATE Product 
      SET defaultSalesUnitId = NULL 
      WHERE defaultSalesUnitId NOT IN (SELECT id FROM ProductUnit)
    `;
    console.log("Fixed defaultSalesUnitId");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
