/**
 * Automated Accounting & Verification Test Agent
 * Tests Balance Sheet, Purchase, Sale, Previous Due Persistence, Payment In/Out, and Ledgers
 */

const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3000/api/v1';
const AUTH_TOKEN = jwt.sign({ sub: 1, username: 'admin' }, 'super-secret', { expiresIn: '2h' });

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    ...options,
    headers,
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!res.ok) {
      throw new Error(`[${res.status}] ${path}: ${JSON.stringify(json)}`);
    }
    // Unwrap standard NestJS TransformInterceptor response if present
    if (json && typeof json === 'object' && json.statusCode !== undefined && json.data !== undefined) {
      return json.data;
    }
    return json;
  } catch (e) {
    if (!res.ok) throw new Error(`[${res.status}] ${path}: ${text}`);
    return text;
  }
}

async function runTestAgent() {
  console.log('====================================================');
  console.log('🤖 STARTING ACCOUNTING VERIFICATION TEST AGENT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1: Health & Base Connectivity
    // -----------------------------------------------------------------
    console.log('👉 [Test 1] Verifying Backend Server Health...');
    const health = await request('/health');
    assert(health.status === 'ok' || health.db === 'healthy', 'Backend is healthy and database connected');

    // -----------------------------------------------------------------
    // TEST 2: Create Test Parties (Customer & Supplier)
    // -----------------------------------------------------------------
    console.log('\n👉 [Test 2] Setting up Customer & Supplier for Testing...');
    const testTimestamp = Date.now().toString().slice(-5);
    const customerName = `Test Customer ${testTimestamp}`;
    const supplierName = `Test Supplier ${testTimestamp}`;

    const customerRes = await request('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: customerName,
        phone: '9876543210',
        email: `cust${testTimestamp}@test.com`,
        address: '123 Market Road',
        gstin: '29ABCDE1234F1Z5',
      }),
    });
    const customerId = Number(customerRes.id || customerRes.data?.id);
    assert(customerId > 0, `Created customer: "${customerName}" (ID: ${customerId})`);

    const supplierRes = await request('/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: supplierName,
        phone: '9123456780',
        email: `supp${testTimestamp}@test.com`,
        address: '456 Industrial Area',
        gstin: '29XYZAB5678C1Z2',
      }),
    });
    const supplierId = Number(supplierRes.id || supplierRes.data?.id);
    assert(supplierId > 0, `Created supplier: "${supplierName}" (ID: ${supplierId})`);

    // -----------------------------------------------------------------
    // TEST 3: Create Test Product
    // -----------------------------------------------------------------
    console.log('\n👉 [Test 3] Setting up Product with Unit & Pricing...');
    const productCode = `PRD-${testTimestamp}`;
    const productRes = await request('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: `Automated Test Item ${testTimestamp}`,
        productCode: productCode,
        sku: `SKU-${testTimestamp}`,
        baseUnitId: 1, // Default Unit
        purchasePrice: 200,
        retailPrice: 300,
        wholesalePrice: 280,
      }),
    });
    const productId = Number(productRes.id || productRes.data?.id);
    assert(productId > 0, `Created product "${productCode}" (ID: ${productId}, Purchase: Rs.200, Retail: Rs.300)`);

    // -----------------------------------------------------------------
    // TEST 4: Purchase Workflow & Stock In Tracking
    // -----------------------------------------------------------------
    console.log('\n👉 [Test 4] Executing Purchase Order (Stock In, Supplier Debt)...');
    const poNumber = `PO-${testTimestamp}`;
    const purchaseQty = 50;
    const purchaseUnitPrice = 200;
    const purchaseGrandTotal = purchaseQty * purchaseUnitPrice; // Rs. 10,000
    const purchasePaidAmount = 4000;
    const purchaseDueAmount = purchaseGrandTotal - purchasePaidAmount; // Rs. 6,000

    const purchaseRes = await request('/purchases', {
      method: 'POST',
      body: JSON.stringify({
        supplierId,
        warehouseId: 1,
        branchId: 1,
        invoiceNumber: poNumber,
        purchaseDate: new Date().toISOString(),
        status: 'COMPLETED',
        subTotal: purchaseGrandTotal,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: purchaseGrandTotal,
        paid: purchasePaidAmount,
        due: purchaseDueAmount,
        paymentAmount: purchasePaidAmount,
        paymentMethod: 'CASH',
        items: [
          {
            productId,
            quantity: purchaseQty,
            unitPrice: purchaseUnitPrice,
            discount: 0,
            taxAmount: 0,
            total: purchaseGrandTotal,
          },
        ],
      }),
    });
    const purchaseId = Number(purchaseRes.id || purchaseRes.data?.id);
    assert(purchaseId > 0, `Created Purchase invoice ${poNumber} for Rs.${purchaseGrandTotal} (Paid: Rs.${purchasePaidAmount}, Due: Rs.${purchaseDueAmount})`);

    // Check Supplier Outstanding report
    const supplierOutReport = await request(`/reports/supplier-outstanding?supplierId=${supplierId}`);
    const suppRow = supplierOutReport.data?.find((s) => Number(s.supplierId) === supplierId);
    assert(
      suppRow && Math.abs(Number(suppRow.outstandingBalance) - purchaseDueAmount) < 0.01,
      `Supplier Outstanding correctly shows Rs.${suppRow?.outstandingBalance} due to supplier`
    );

    // -----------------------------------------------------------------
    // TEST 5: Sales Workflow with Previous Due & Sell Table Recheck
    // -----------------------------------------------------------------
    console.log('\n👉 [Test 5] Executing Sale with Previous Due (Stock Out, Customer Debt)...');
    const invNumber = `INV-${testTimestamp}`;
    const saleQty = 10;
    const saleUnitPrice = 300;
    const saleGrandTotal = saleQty * saleUnitPrice; // Rs. 3,000
    const initialPrevDue = 1200; // Customer had previous due of Rs. 1,200
    const salePaid = 1000;
    const saleDue = saleGrandTotal - salePaid; // Rs. 2,000

    const saleRes = await request('/sales', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        warehouseId: 1,
        branchId: 1,
        invoiceNumber: invNumber,
        saleDate: new Date().toISOString(),
        status: 'COMPLETED',
        subTotal: saleGrandTotal,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: saleGrandTotal,
        paid: salePaid,
        due: saleDue,
        paymentAmount: salePaid,
        paymentMethod: 'CASH',
        previousDue: initialPrevDue,
        advancePayment: 0,
        showPreviousBalance: true,
        items: [
          {
            productId,
            quantity: saleQty,
            unitPrice: saleUnitPrice,
            discount: 0,
            taxAmount: 0,
            total: saleGrandTotal,
          },
        ],
      }),
    });
    const saleId = Number(saleRes.id || saleRes.data?.id);
    assert(saleId > 0, `Created Sale invoice ${invNumber} for Rs.${saleGrandTotal} with Previous Due Rs.${initialPrevDue}`);

    // VERIFY PREVIEW PERSISTENCE FROM SELL TABLE / INVOICES API
    console.log('\n👉 [Test 6] Rechecking Invoice from Sell Table / Database (Previous Due Persistence)...');
    const allSalesRes = await request('/sales');
    const salesList = Array.isArray(allSalesRes) ? allSalesRes : allSalesRes.data || [];
    const recheckedSale = salesList.find((s) => Number(s.id) === saleId || s.invoiceNumber === invNumber);

    assert(recheckedSale !== undefined, `Found invoice ${invNumber} in sales list`);
    assert(
      recheckedSale && Number(recheckedSale.previousDue) === initialPrevDue,
      `Previous Due persisted on Sell Table: Expected Rs.${initialPrevDue}, Got Rs.${recheckedSale?.previousDue}`
    );
    assert(
      recheckedSale && Boolean(recheckedSale.showPreviousBalance) === true,
      `showPreviousBalance flag persisted: Expected true, Got ${recheckedSale?.showPreviousBalance}`
    );
    assert(
      recheckedSale && Number(recheckedSale.paid) === salePaid,
      `Paid amount persisted: Expected Rs.${salePaid}, Got Rs.${recheckedSale?.paid}`
    );

    // -----------------------------------------------------------------
    // TEST 7: Customer & Supplier Outstanding Reports
    // -----------------------------------------------------------------
    console.log('\n👉 [Test 7] Verifying Customer Outstanding Report & Ledgers...');
    const custOutReport = await request(`/reports/customer-outstanding?customerId=${customerId}`);
    const custRow = custOutReport.data?.find((c) => Number(c.customerId) === customerId);
    assert(
      custRow && Math.abs(Number(custRow.outstandingBalance) - saleDue) < 0.01,
      `Customer Outstanding correctly reflects unpaid sale: Rs.${custRow?.outstandingBalance} (Billed Rs.${custRow?.totalBilled}, Paid Rs.${custRow?.totalPaid})`
    );

    // -----------------------------------------------------------------
    // TEST 8: Standalone Payment In & Payment Out Tracking
    // -----------------------------------------------------------------
    console.log('\n👉 [Test 8] Executing Direct Payments (Payment In & Payment Out)...');
    const payInAmount = 500;
    const payInRes = await request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        amount: payInAmount,
        paymentMethod: 'UPI',
        type: 'receive',
        customerId,
        notes: 'Customer debt clearance payment',
      }),
    });
    assert(Number(payInRes.amount) === payInAmount, `Payment In recorded: Rs.${payInAmount} from customer`);

    const payOutAmount = 1000;
    const payOutRes = await request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        amount: payOutAmount,
        paymentMethod: 'NEFT',
        type: 'pay',
        supplierId,
        notes: 'Supplier bill payment',
      }),
    });
    assert(Number(payOutRes.amount) === payOutAmount, `Payment Out recorded: Rs.${payOutAmount} to supplier`);

    // Verify Customer Outstanding decreased after payment
    const custOutReportAfter = await request(`/reports/customer-outstanding?customerId=${customerId}`);
    const custRowAfter = custOutReportAfter.data?.find((c) => Number(c.customerId) === customerId);
    const expectedCustDue = saleDue - payInAmount; // 2000 - 500 = 1500
    assert(
      custRowAfter && Math.abs(Number(custRowAfter.outstandingBalance) - expectedCustDue) < 0.01,
      `Customer Outstanding decreased after payment: Expected Rs.${expectedCustDue}, Got Rs.${custRowAfter?.outstandingBalance}`
    );

    // Verify Supplier Outstanding decreased after payment
    const suppOutReportAfter = await request(`/reports/supplier-outstanding?supplierId=${supplierId}`);
    const suppRowAfter = suppOutReportAfter.data?.find((s) => Number(s.supplierId) === supplierId);
    const expectedSuppDue = purchaseDueAmount - payOutAmount; // 6000 - 1000 = 5000
    assert(
      suppRowAfter && Math.abs(Number(suppRowAfter.outstandingBalance) - expectedSuppDue) < 0.01,
      `Supplier Outstanding decreased after payment: Expected Rs.${expectedSuppDue}, Got Rs.${suppRowAfter?.outstandingBalance}`
    );

    // -----------------------------------------------------------------
    // TEST 9: Payments In/Out Report
    // -----------------------------------------------------------------
    console.log('\n👉 [Test 9] Checking Payments Log Report...');
    const paymentReport = await request('/reports/payments');
    assert(paymentReport.summary?.totalPaymentsCount >= 2, `Payments report recorded all transactions (Count: ${paymentReport.summary?.totalPaymentsCount})`);

    // -----------------------------------------------------------------
    // TEST 10: Balance Sheet Verification
    // -----------------------------------------------------------------
    console.log('\n👉 [Test 10] Checking Balance Sheet Report...');
    const balanceSheet = await request('/reports/balance-sheet');

    assert(balanceSheet.summary !== undefined, 'Balance Sheet summary returned');
    assert(balanceSheet.summary.totalAssets >= 0, `Total Assets calculated: Rs.${balanceSheet.summary.totalAssets}`);
    assert(balanceSheet.summary.totalLiabilities >= 0, `Total Liabilities calculated: Rs.${balanceSheet.summary.totalLiabilities}`);

    const expectedEquity = Number((balanceSheet.summary.totalAssets - balanceSheet.summary.totalLiabilities).toFixed(2));
    assert(
      Math.abs(balanceSheet.summary.netEquity - expectedEquity) < 0.01,
      `Balance Sheet Equation holds: Net Equity (Rs.${balanceSheet.summary.netEquity}) = Assets (Rs.${balanceSheet.summary.totalAssets}) - Liabilities (Rs.${balanceSheet.summary.totalLiabilities})`
    );

    console.log('\n====================================================');
    console.log(`📊 AGENT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed === 0) {
      console.log('🎉 ALL ACCOUNTING AND BILLING TESTS PASSED PERFECTLY!\n');
      process.exit(0);
    } else {
      console.error(`⚠️ ${failed} test(s) failed. Please review.\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Fatal Test Error:', err.message);
    process.exit(1);
  }
}

runTestAgent();
