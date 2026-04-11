import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall } from '../api.js';

export function registerCreateTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // Tool: create_invoice
  // ---------------------------------------------------------------------------

  server.tool(
    'create_invoice',
    'สร้างใบแจ้งหนี้ — Create a new invoice',
    {
      customerId: z.string().describe('Customer ID'),
      dueDate: z.string().describe('Due date (YYYY-MM-DD)'),
      lines: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        unitPriceSatang: z.string().describe('Unit price in satang'),
        accountId: z.string(),
      })).describe('Invoice line items'),
    },
    async ({ customerId, dueDate, lines }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/invoices', { customerId, dueDate, lines });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_journal_entry
  // ---------------------------------------------------------------------------

  server.tool(
    'create_journal_entry',
    'สร้างรายการบัญชี — Create a journal entry',
    {
      description: z.string().describe('Journal entry description'),
      fiscalYear: z.number().describe('Fiscal year'),
      fiscalPeriod: z.number().describe('Fiscal period (1-12)'),
      lines: z.array(z.object({
        accountId: z.string(),
        description: z.string(),
        debitSatang: z.string().describe('Debit amount in satang (0 if credit)'),
        creditSatang: z.string().describe('Credit amount in satang (0 if debit)'),
      })).describe('Journal entry lines (must balance)'),
    },
    async ({ description, fiscalYear, fiscalPeriod, lines }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/journal-entries', { description, fiscalYear, fiscalPeriod, lines });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_quotation
  // ---------------------------------------------------------------------------

  server.tool(
    'create_quotation',
    'สร้างใบเสนอราคา — Create a new quotation (ใบเสนอราคา)',
    {
      customerId: z.string().describe('Customer ID'),
      customerName: z.string().describe('Customer name'),
      subject: z.string().describe('Quotation subject/title'),
      validUntil: z.string().describe('Validity date (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Optional notes'),
      lines: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        unitPriceSatang: z.string().describe('Unit price in satang (1 THB = 100 satang)'),
      })).describe('Line items'),
    },
    async ({ customerId, customerName, subject, validUntil, notes, lines }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/quotations', {
          customerId, customerName, subject, validUntil, notes, lines,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_sales_order
  // ---------------------------------------------------------------------------

  server.tool(
    'create_sales_order',
    'สร้างใบสั่งขาย — Create a new sales order (ใบสั่งขาย)',
    {
      customerId: z.string().describe('Customer ID'),
      customerName: z.string().describe('Customer name'),
      orderDate: z.string().describe('Order date (YYYY-MM-DD)'),
      expectedDeliveryDate: z.string().optional().describe('Expected delivery date (YYYY-MM-DD)'),
      quotationId: z.string().optional().describe('Source quotation ID'),
      notes: z.string().optional().describe('Optional notes'),
      lines: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        unitPriceSatang: z.string().describe('Unit price in satang'),
      })).describe('Line items'),
    },
    async ({ customerId, customerName, orderDate, expectedDeliveryDate, quotationId, notes, lines }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/sales-orders', {
          customerId, customerName, orderDate, expectedDeliveryDate, quotationId, notes, lines,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_bill
  // ---------------------------------------------------------------------------

  server.tool(
    'create_bill',
    'สร้างบิลค่าใช้จ่าย (AP) — Create a new bill (Accounts Payable)',
    {
      vendorId: z.string().describe('Vendor ID'),
      billDate: z.string().describe('Bill date (YYYY-MM-DD)'),
      dueDate: z.string().describe('Due date (YYYY-MM-DD)'),
      reference: z.string().optional().describe('Vendor reference or PO number'),
      notes: z.string().optional().describe('Optional notes'),
      lines: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number().describe('Unit price in THB'),
        accountId: z.string().describe('Expense account ID'),
      })).describe('Bill line items'),
    },
    async ({ vendorId, billDate, dueDate, reference, notes, lines }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/bills', {
          vendorId, billDate, dueDate, reference, notes, lines,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_purchase_order
  // ---------------------------------------------------------------------------

  server.tool(
    'create_purchase_order',
    'สร้างใบสั่งซื้อ — Create a new purchase order (ใบสั่งซื้อ)',
    {
      vendorId: z.string().describe('Vendor ID'),
      orderDate: z.string().describe('Order date (YYYY-MM-DD)'),
      expectedDate: z.string().optional().describe('Expected delivery date (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Optional notes'),
      lines: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        unitPriceSatang: z.string().describe('Unit price in satang'),
      })).describe('Line items'),
    },
    async ({ vendorId, orderDate, expectedDate, notes, lines }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/purchase-orders', {
          vendorId, orderDate, expectedDate, notes, lines,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_contact
  // ---------------------------------------------------------------------------

  server.tool(
    'create_contact',
    'สร้าง contact ลูกค้า/ผู้ขาย — Create a new contact (customer or vendor)',
    {
      contactType: z.enum(['customer', 'vendor', 'both']).describe('Contact type'),
      companyName: z.string().describe('Company name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      taxId: z.string().optional().describe('Tax ID (13 digits)'),
      province: z.string().optional().describe('Province'),
    },
    async ({ contactType, companyName, email, phone, taxId, province }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/contacts', {
          contactType, companyName, email, phone, taxId, province,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_product
  // ---------------------------------------------------------------------------

  server.tool(
    'create_product',
    'สร้างสินค้าใหม่ — Create a new product',
    {
      sku: z.string().describe('Product SKU code'),
      nameTh: z.string().describe('Product name in Thai'),
      nameEn: z.string().describe('Product name in English'),
      unit: z.string().optional().default('ชิ้น').describe('Unit of measure'),
      costPriceSatang: z.number().optional().default(0).describe('Cost price in satang'),
      sellingPriceSatang: z.number().optional().default(0).describe('Selling price in satang'),
      minStockLevel: z.number().optional().default(0).describe('Minimum stock level'),
    },
    async ({ sku, nameTh, nameEn, unit, costPriceSatang, sellingPriceSatang, minStockLevel }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/products', {
          sku, nameTh, nameEn, unit, costPriceSatang, sellingPriceSatang, minStockLevel,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_employee
  // ---------------------------------------------------------------------------

  server.tool(
    'create_employee',
    'เพิ่มพนักงานใหม่ — Create a new employee record',
    {
      employeeCode: z.string().describe('Employee code (e.g. EMP-001)'),
      firstNameTh: z.string().describe('First name in Thai'),
      lastNameTh: z.string().describe('Last name in Thai'),
      hireDate: z.string().describe('Hire date (YYYY-MM-DD)'),
      position: z.string().optional().describe('Job position/title'),
      salarySatang: z.number().optional().default(0).describe('Monthly salary in satang'),
      departmentId: z.string().optional().describe('Department ID'),
    },
    async ({ employeeCode, firstNameTh, lastNameTh, hireDate, position, salarySatang, departmentId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/employees', {
          employeeCode, firstNameTh, lastNameTh, hireDate, position, salarySatang, departmentId,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_price_list
  // ---------------------------------------------------------------------------

  server.tool(
    'create_price_list',
    'สร้างรายการราคา — Create a new price list (SD-Pricing)',
    {
      name: z.string().describe('Price list name'),
      currency: z.string().optional().default('THB').describe('Currency code'),
      validFrom: z.string().describe('Valid from date (YYYY-MM-DD)'),
      validTo: z.string().optional().describe('Valid to date (YYYY-MM-DD)'),
      items: z.array(z.object({
        productId: z.string(),
        unitPriceSatang: z.string().describe('Unit price in satang'),
      })).describe('Price list items'),
    },
    async ({ name, currency, validFrom, validTo, items }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/pricing/price-lists', {
          name, currency, validFrom, validTo, items,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_payment_term
  // ---------------------------------------------------------------------------

  server.tool(
    'create_payment_term',
    'สร้างเงื่อนไขการชำระเงิน — Create a payment term',
    {
      code: z.string().describe('Payment term code (e.g. NET30)'),
      description: z.string().describe('Description'),
      dueDays: z.number().describe('Number of days until due'),
      discountPercent: z.number().optional().default(0).describe('Early payment discount %'),
      discountDays: z.number().optional().default(0).describe('Days for early payment discount'),
    },
    async ({ code, description, dueDays, discountPercent, discountDays }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/payment-terms', {
          code, description, dueDays, discountPercent, discountDays,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_recurring_je_template
  // ---------------------------------------------------------------------------

  server.tool(
    'create_recurring_je_template',
    'สร้างแม่แบบรายการบัญชีรายงวด — Create a recurring journal entry template',
    {
      name: z.string().describe('Template name'),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).describe('Recurrence frequency'),
      startDate: z.string().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
      lines: z.array(z.object({
        accountId: z.string(),
        description: z.string(),
        debitSatang: z.string().describe('Debit amount in satang'),
        creditSatang: z.string().describe('Credit amount in satang'),
      })).describe('Journal entry lines (must balance)'),
    },
    async ({ name, frequency, startDate, endDate, lines }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/recurring-journal-entries', {
          name, frequency, startDate, endDate, lines,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_purchase_requisition
  // ---------------------------------------------------------------------------

  server.tool(
    'create_purchase_requisition',
    'สร้างใบขอซื้อ — Create a purchase requisition (MM-PR)',
    {
      requestedBy: z.string().describe('Requester employee ID'),
      requiredDate: z.string().describe('Required date (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Optional notes'),
      lines: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        estimatedUnitPriceSatang: z.string().describe('Estimated unit price in satang'),
        productId: z.string().optional(),
      })).describe('Requisition line items'),
    },
    async ({ requestedBy, requiredDate, notes, lines }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/purchase-requisitions', {
          requestedBy, requiredDate, notes, lines,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_rfq
  // ---------------------------------------------------------------------------

  server.tool(
    'create_rfq',
    'สร้างใบขอใบเสนอราคา — Create a request for quotation (RFQ)',
    {
      vendorIds: z.array(z.string()).describe('Vendor IDs to send RFQ to'),
      requiredDate: z.string().describe('Required date (YYYY-MM-DD)'),
      purchaseRequisitionId: z.string().optional().describe('Source PR ID'),
      lines: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        productId: z.string().optional(),
      })).describe('RFQ line items'),
    },
    async ({ vendorIds, requiredDate, purchaseRequisitionId, lines }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/rfqs', {
          vendorIds, requiredDate, purchaseRequisitionId, lines,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_stock_count
  // ---------------------------------------------------------------------------

  server.tool(
    'create_stock_count',
    'สร้างรายการตรวจนับสต็อก — Create a stock count session (MM-IM)',
    {
      countDate: z.string().describe('Count date (YYYY-MM-DD)'),
      warehouseId: z.string().optional().describe('Warehouse/location ID'),
      notes: z.string().optional().describe('Optional notes'),
      items: z.array(z.object({
        productId: z.string(),
        countedQty: z.number().describe('Physically counted quantity'),
      })).describe('Items counted'),
    },
    async ({ countDate, warehouseId, notes, items }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/stock-counts', {
          countDate, warehouseId, notes, items,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_position
  // ---------------------------------------------------------------------------

  server.tool(
    'create_position',
    'สร้างตำแหน่งงาน — Create a position (HR-OM)',
    {
      title: z.string().describe('Position title'),
      departmentId: z.string().describe('Department ID'),
      headcount: z.number().optional().default(1).describe('Number of headcount slots'),
      level: z.string().optional().describe('Job level (e.g. junior, mid, senior, manager)'),
    },
    async ({ title, departmentId, headcount, level }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/positions', {
          title, departmentId, headcount, level,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: record_attendance
  // ---------------------------------------------------------------------------

  server.tool(
    'record_attendance',
    'บันทึกการเข้างาน — Record attendance (HR-TM)',
    {
      employeeId: z.string().describe('Employee ID'),
      date: z.string().describe('Date (YYYY-MM-DD)'),
      clockIn: z.string().describe('Clock-in time (HH:mm)'),
      clockOut: z.string().optional().describe('Clock-out time (HH:mm)'),
      type: z.enum(['normal', 'overtime', 'remote']).optional().default('normal').describe('Attendance type'),
    },
    async ({ employeeId, date, clockIn, clockOut, type }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/attendance', {
          employeeId, date, clockIn, clockOut, type,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_currency
  // ---------------------------------------------------------------------------

  server.tool(
    'create_currency',
    'เพิ่มสกุลเงิน — Create a currency',
    {
      code: z.string().describe('Currency code (ISO 4217, e.g. USD)'),
      name: z.string().describe('Currency name'),
      symbol: z.string().describe('Currency symbol (e.g. $)'),
      decimalPlaces: z.number().optional().default(2).describe('Decimal places'),
    },
    async ({ code, name, symbol, decimalPlaces }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/currencies', {
          code, name, symbol, decimalPlaces,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_company
  // ---------------------------------------------------------------------------

  server.tool(
    'create_company',
    'สร้างบริษัท — Create a new company (multi-company)',
    {
      name: z.string().describe('Company name'),
      taxId: z.string().describe('Tax ID (13 digits)'),
      currency: z.string().optional().default('THB').describe('Base currency'),
      address: z.string().optional().describe('Company address'),
    },
    async ({ name, taxId, currency, address }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/companies', {
          name, taxId, currency, address,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_approval_workflow
  // ---------------------------------------------------------------------------

  server.tool(
    'create_approval_workflow',
    'สร้าง workflow อนุมัติ — Create an approval workflow',
    {
      name: z.string().describe('Workflow name'),
      documentType: z.string().describe('Document type (e.g. purchase_requisition, bill, journal_entry)'),
      steps: z.array(z.object({
        order: z.number(),
        approverRoleId: z.string().optional().describe('Role ID of approver'),
        approverUserId: z.string().optional().describe('User ID of approver'),
        condition: z.string().optional().describe('Condition expression (e.g. amount > 100000)'),
      })).describe('Approval steps in order'),
    },
    async ({ name, documentType, steps }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/approvals/workflows', {
          name, documentType, steps,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_vendor_return
  // ---------------------------------------------------------------------------

  server.tool(
    'create_vendor_return',
    'สร้างใบส่งคืนสินค้า — Create a vendor return (MM-RET)',
    {
      vendorId: z.string().describe('Vendor ID'),
      billId: z.string().optional().describe('Original bill ID'),
      reason: z.string().describe('Return reason'),
      lines: z.array(z.object({
        productId: z.string(),
        quantity: z.number(),
        unitPriceSatang: z.string().describe('Unit price in satang'),
      })).describe('Return line items'),
    },
    async ({ vendorId, billId, reason, lines }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/vendor-returns', {
          vendorId, billId, reason, lines,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_batch
  // ---------------------------------------------------------------------------

  server.tool(
    'create_batch',
    'สร้าง Batch/Lot — Create a batch or lot number (MM-BT)',
    {
      productId: z.string().describe('Product ID'),
      batchNumber: z.string().describe('Batch/lot number'),
      manufactureDate: z.string().optional().describe('Manufacture date (YYYY-MM-DD)'),
      expiryDate: z.string().optional().describe('Expiry date (YYYY-MM-DD)'),
      quantity: z.number().describe('Initial quantity'),
    },
    async ({ productId, batchNumber, manufactureDate, expiryDate, quantity }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/batches', {
          productId, batchNumber, manufactureDate, expiryDate, quantity,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: create_bank_matching_rule
  // ---------------------------------------------------------------------------

  server.tool(
    'create_bank_matching_rule',
    'สร้างกฎจับคู่ธนาคาร — Create a bank matching rule (FI-BL)',
    {
      name: z.string().describe('Rule name'),
      bankAccountId: z.string().describe('Bank account ID'),
      matchField: z.enum(['description', 'amount', 'reference']).describe('Field to match on'),
      matchPattern: z.string().describe('Match pattern (regex or exact)'),
      targetAccountId: z.string().describe('Target GL account ID'),
      priority: z.number().optional().default(10).describe('Rule priority (lower = higher priority)'),
    },
    async ({ name, bankAccountId, matchField, matchPattern, targetAccountId, priority }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/bank-matching/rules', {
          name, bankAccountId, matchField, matchPattern, targetAccountId, priority,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
