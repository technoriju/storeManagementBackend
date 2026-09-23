const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const products = await prisma.$queryRaw`
      SELECT p.id, p.defaultPurchaseUnitId
      FROM Product p
      LEFT JOIN ProductUnit pu ON p.defaultPurchaseUnitId = pu.id
      WHERE p.defaultPurchaseUnitId IS NOT NULL AND pu.id IS NULL
    `;
    console.log("Invalid defaultPurchaseUnitIds:", products);
    
    const products2 = await prisma.$queryRaw`
      SELECT p.id, p.defaultSalesUnitId
      FROM Product p
      LEFT JOIN ProductUnit pu ON p.defaultSalesUnitId = pu.id
      WHERE p.defaultSalesUnitId IS NOT NULL AND pu.id IS NULL
    `;
    console.log("Invalid defaultSalesUnitIds:", products2);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
