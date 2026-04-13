import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall } from '../api.js';
import { wrapTool } from './wrap-tool.js';

export function registerActionTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // Tool: post_invoice
  // ---------------------------------------------------------------------------

  server.tool(
    'post_invoice',
    'Post ใบแจ้งหนี้ (draft → posted) — Post an invoice, creating journal entries',
    { invoiceId: z.string().describe('Invoice ID to post') },
    wrapTool(({ invoiceId }) => apiCall('POST', `/invoices/${invoiceId}/post`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: void_invoice
  // ---------------------------------------------------------------------------

  server.tool(
    'void_invoice',
    'ยกเลิกใบแจ้งหนี้ — Void an invoice, preventing further payment',
    { invoiceId: z.string().describe('Invoice ID to void') },
    wrapTool(({ invoiceId }) => apiCall('POST', `/invoices/${invoiceId}/void`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: post_bill
  // ---------------------------------------------------------------------------

  server.tool(
    'post_bill',
    'Post บิล (draft → posted) — Post a bill, creating journal entries',
    { billId: z.string().describe('Bill ID to post') },
    wrapTool(({ billId }) => apiCall('POST', `/bills/${billId}/post`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: close_fiscal_period
  // ---------------------------------------------------------------------------

  server.tool(
    'close_fiscal_period',
    'ปิดงวดบัญชี — Close a fiscal period to prevent further postings',
    { periodId: z.string().describe('Fiscal period ID to close') },
    wrapTool(({ periodId }) => apiCall('POST', `/fiscal-periods/${periodId}/close`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: month_end_close
  // ---------------------------------------------------------------------------

  server.tool(
    'month_end_close',
    'ปิดงวดสิ้นเดือน (month-end close) — Run month-end closing procedures',
    {
      fiscalYear: z.number().describe('Fiscal year (e.g. 2026)'),
      fiscalPeriod: z.number().describe('Fiscal period number (1-12)'),
    },
    wrapTool(({ fiscalYear, fiscalPeriod }) =>
      apiCall('POST', '/month-end/close', { fiscalYear, fiscalPeriod }),
    ),
  );

  // ---------------------------------------------------------------------------
  // Tool: close_fiscal_year
  // ---------------------------------------------------------------------------

  server.tool(
    'close_fiscal_year',
    'ปิดปีบัญชี — Close a fiscal year (year-end close)',
    { fiscalYearId: z.string().describe('Fiscal year ID to close') },
    wrapTool(({ fiscalYearId }) => apiCall('POST', `/fiscal-years/${fiscalYearId}/close`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: reopen_fiscal_year
  // ---------------------------------------------------------------------------

  server.tool(
    'reopen_fiscal_year',
    'เปิดปีบัญชีอีกครั้ง — Reopen a closed fiscal year',
    { fiscalYearId: z.string().describe('Fiscal year ID to reopen') },
    wrapTool(({ fiscalYearId }) => apiCall('POST', `/fiscal-years/${fiscalYearId}/reopen`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: run_dunning
  // ---------------------------------------------------------------------------

  server.tool(
    'run_dunning',
    'รันกระบวนการทวงถาม — Run dunning process for overdue invoices',
    {
      asOfDate: z.string().optional().describe('As-of date (YYYY-MM-DD), defaults to today'),
      customerId: z.string().optional().describe('Run for specific customer only'),
    },
    wrapTool(({ asOfDate, customerId }) =>
      apiCall('POST', '/dunning/run', { asOfDate, customerId }),
    ),
  );

  // ---------------------------------------------------------------------------
  // Tool: run_recurring_je
  // ---------------------------------------------------------------------------

  server.tool(
    'run_recurring_je',
    'รันรายการบัญชีรายงวด — Execute recurring journal entry templates',
    {
      templateId: z.string().optional().describe('Specific template ID (omit to run all due)'),
      postingDate: z.string().optional().describe('Posting date (YYYY-MM-DD), defaults to today'),
    },
    wrapTool(({ templateId, postingDate }) =>
      apiCall('POST', '/recurring-journal-entries/run', { templateId, postingDate }),
    ),
  );

  // ---------------------------------------------------------------------------
  // Tool: check_credit
  // ---------------------------------------------------------------------------

  server.tool(
    'check_credit',
    'ตรวจสอบวงเงินลูกค้า — Check customer credit limit and exposure',
    {
      customerId: z.string().describe('Customer ID to check'),
      orderAmountSatang: z.string().optional().describe('Proposed order amount in satang'),
    },
    async ({ customerId, orderAmountSatang }) => {
      try {
        let path = `/credit/check?customerId=${customerId}`;
        if (orderAmountSatang) path += `&amount=${orderAmountSatang}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: approve_pr
  // ---------------------------------------------------------------------------

  server.tool(
    'approve_pr',
    'อนุมัติใบขอซื้อ — Approve a purchase requisition',
    {
      purchaseRequisitionId: z.string().describe('Purchase requisition ID'),
      notes: z.string().optional().describe('Approval notes'),
    },
    async ({ purchaseRequisitionId, notes }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/purchase-requisitions/${purchaseRequisitionId}/approve`, {
          notes,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: submit_rfq
  // ---------------------------------------------------------------------------

  server.tool(
    'submit_rfq',
    'ส่ง RFQ ให้ผู้ขาย — Submit RFQ to vendors',
    {
      rfqId: z.string().describe('RFQ ID to submit'),
    },
    async ({ rfqId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/rfqs/${rfqId}/submit`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: post_stock_count
  // ---------------------------------------------------------------------------

  server.tool(
    'post_stock_count',
    'ยืนยันผลตรวจนับสต็อก — Post stock count adjustments to inventory',
    {
      stockCountId: z.string().describe('Stock count session ID'),
    },
    async ({ stockCountId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/stock-counts/${stockCountId}/post`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: auto_reconcile_bank
  // ---------------------------------------------------------------------------

  server.tool(
    'auto_reconcile_bank',
    'จับคู่ธนาคารอัตโนมัติ — Auto-reconcile bank transactions',
    {
      bankAccountId: z.string().describe('Bank account ID'),
      statementDate: z.string().optional().describe('Statement date (YYYY-MM-DD)'),
    },
    async ({ bankAccountId, statementDate }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/bank-matching/auto-reconcile', {
          bankAccountId, statementDate,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: submit_for_approval
  // ---------------------------------------------------------------------------

  server.tool(
    'submit_for_approval',
    'ส่งเอกสารเพื่อขออนุมัติ — Submit a document for approval',
    {
      documentType: z.string().describe('Document type (e.g. purchase_requisition, bill, journal_entry)'),
      documentId: z.string().describe('Document ID'),
      notes: z.string().optional().describe('Submission notes'),
    },
    async ({ documentType, documentId, notes }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/approvals/submit', {
          documentType, documentId, notes,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: approve_request
  // ---------------------------------------------------------------------------

  server.tool(
    'approve_request',
    'อนุมัติคำขอ — Approve an approval request',
    {
      requestId: z.string().describe('Approval request ID'),
      notes: z.string().optional().describe('Approval notes'),
    },
    async ({ requestId, notes }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/approvals/requests/${requestId}/approve`, {
          notes,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: reject_request
  // ---------------------------------------------------------------------------

  server.tool(
    'reject_request',
    'ปฏิเสธคำขอ — Reject an approval request',
    {
      requestId: z.string().describe('Approval request ID'),
      reason: z.string().describe('Rejection reason'),
    },
    async ({ requestId, reason }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/approvals/requests/${requestId}/reject`, {
          reason,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: delegate_approval
  // ---------------------------------------------------------------------------

  server.tool(
    'delegate_approval',
    'มอบหมายอนุมัติ — Delegate an approval request to another user',
    {
      requestId: z.string().describe('Approval request ID'),
      delegateToUserId: z.string().describe('User ID to delegate to'),
      reason: z.string().optional().describe('Delegation reason'),
    },
    async ({ requestId, delegateToUserId, reason }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/approvals/requests/${requestId}/delegate`, {
          delegateToUserId, reason,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: fx_revaluation
  // ---------------------------------------------------------------------------

  server.tool(
    'fx_revaluation',
    'ปรับปรุงอัตราแลกเปลี่ยน — Run foreign currency revaluation (FI-FX)',
    {
      asOfDate: z.string().describe('Revaluation date (YYYY-MM-DD)'),
      currencyCode: z.string().optional().describe('Specific currency (omit for all)'),
    },
    async ({ asOfDate, currencyCode }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/currencies/fx-revaluation', {
          asOfDate, currencyCode,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: resolve_price
  // ---------------------------------------------------------------------------

  server.tool(
    'resolve_price',
    'คำนวณราคา — Resolve price from price lists and conditions (SD-Pricing)',
    {
      productId: z.string().describe('Product ID'),
      customerId: z.string().optional().describe('Customer ID for customer-specific pricing'),
      quantity: z.number().optional().default(1).describe('Quantity for volume discounts'),
      date: z.string().optional().describe('Pricing date (YYYY-MM-DD)'),
    },
    async ({ productId, customerId, quantity, date }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/pricing/resolve', {
          productId, customerId, quantity, date,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ===========================================================================
  // SAP-Parity Module Action Tools
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Tool: release_production_order
  // ---------------------------------------------------------------------------

  server.tool(
    'release_production_order',
    'ปล่อยใบสั่งผลิต — Release a production order (PP-SFC)',
    { productionOrderId: z.string().describe('Production order ID') },
    wrapTool(({ productionOrderId }) => apiCall('POST', `/production-orders/${productionOrderId}/release`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: confirm_production
  // ---------------------------------------------------------------------------

  server.tool(
    'confirm_production',
    'ยืนยันผลผลิต — Confirm production output (PP-SFC)',
    {
      productionOrderId: z.string().describe('Production order ID'),
      quantityProduced: z.number().describe('Quantity produced'),
      scrapQuantity: z.number().optional().default(0).describe('Scrap quantity'),
    },
    wrapTool(({ productionOrderId, quantityProduced, scrapQuantity }) =>
      apiCall('POST', `/production-orders/${productionOrderId}/confirm`, { quantityProduced, scrapQuantity }),
    ),
  );

  // ---------------------------------------------------------------------------
  // Tool: run_mrp
  // ---------------------------------------------------------------------------

  server.tool(
    'run_mrp',
    'รัน MRP — Run material requirements planning (PP-MRP)',
    {
      plantId: z.string().optional().describe('Plant/warehouse ID (omit for all)'),
      productId: z.string().optional().describe('Specific product ID (omit for all)'),
    },
    wrapTool(({ plantId, productId }) =>
      apiCall('POST', '/mrp/run', { plantId, productId }),
    ),
  );

  // ---------------------------------------------------------------------------
  // Tool: activate_lease
  // ---------------------------------------------------------------------------

  server.tool(
    'activate_lease',
    'เปิดใช้สัญญาเช่า — Activate a lease contract (RE-FX)',
    { leaseContractId: z.string().describe('Lease contract ID') },
    wrapTool(({ leaseContractId }) => apiCall('POST', `/lease-contracts/${leaseContractId}/activate`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: post_lease_monthly
  // ---------------------------------------------------------------------------

  server.tool(
    'post_lease_monthly',
    'บันทึกค่าเช่ารายเดือน — Post monthly lease entries (RE-FX / IFRS 16)',
    {
      leaseContractId: z.string().describe('Lease contract ID'),
      postingDate: z.string().optional().describe('Posting date (YYYY-MM-DD), defaults to today'),
    },
    wrapTool(({ leaseContractId, postingDate }) =>
      apiCall('POST', `/lease-contracts/${leaseContractId}/post-monthly`, { postingDate }),
    ),
  );

  // ---------------------------------------------------------------------------
  // Tool: recognize_revenue
  // ---------------------------------------------------------------------------

  server.tool(
    'recognize_revenue',
    'รับรู้รายได้ — Recognize revenue for obligation (RA / IFRS 15)',
    {
      revenueContractId: z.string().describe('Revenue contract ID'),
      obligationId: z.string().describe('Performance obligation ID'),
      amountSatang: z.string().optional().describe('Amount to recognize in satang (omit for full)'),
      recognitionDate: z.string().optional().describe('Recognition date (YYYY-MM-DD)'),
    },
    async ({ revenueContractId, obligationId, amountSatang, recognitionDate }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/revenue-contracts/${revenueContractId}/recognize`, {
          obligationId, amountSatang, recognitionDate,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: submit_declaration
  // ---------------------------------------------------------------------------

  server.tool(
    'submit_declaration',
    'ยื่นใบขนศุลกากร — Submit a trade declaration to customs (FT)',
    { declarationId: z.string().describe('Trade declaration ID') },
    wrapTool(({ declarationId }) => apiCall('POST', `/trade-declarations/${declarationId}/submit`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: clear_declaration
  // ---------------------------------------------------------------------------

  server.tool(
    'clear_declaration',
    'ผ่านพิธีการศุลกากร — Clear a customs declaration (FT)',
    { declarationId: z.string().describe('Trade declaration ID') },
    wrapTool(({ declarationId }) => apiCall('POST', `/trade-declarations/${declarationId}/clear`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: issue_lc
  // ---------------------------------------------------------------------------

  server.tool(
    'issue_lc',
    'ออก L/C — Issue a letter of credit (FT-LC)',
    { lcId: z.string().describe('Letter of credit ID') },
    wrapTool(({ lcId }) => apiCall('POST', `/letters-of-credit/${lcId}/issue`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: settle_lc
  // ---------------------------------------------------------------------------

  server.tool(
    'settle_lc',
    'ชำระ L/C — Settle a letter of credit (FT-LC)',
    { lcId: z.string().describe('Letter of credit ID') },
    wrapTool(({ lcId }) => apiCall('POST', `/letters-of-credit/${lcId}/settle`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: propose_batch_payment
  // ---------------------------------------------------------------------------

  server.tool(
    'propose_batch_payment',
    'เสนอจ่ายชำระกลุ่ม — Propose a batch payment run (FI-AP)',
    {
      paymentDate: z.string().describe('Payment date (YYYY-MM-DD)'),
      vendorIds: z.array(z.string()).optional().describe('Specific vendor IDs (omit for all due)'),
      bankAccountId: z.string().optional().describe('Bank account to pay from'),
    },
    async ({ paymentDate, vendorIds, bankAccountId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/batch-payments/propose', {
          paymentDate, vendorIds, bankAccountId,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: execute_batch_payment
  // ---------------------------------------------------------------------------

  server.tool(
    'execute_batch_payment',
    'ดำเนินการจ่ายชำระกลุ่ม — Execute a batch payment run (FI-AP)',
    { batchPaymentId: z.string().describe('Batch payment proposal ID') },
    wrapTool(({ batchPaymentId }) => apiCall('POST', `/batch-payments/${batchPaymentId}/execute`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: approve_service_entry
  // ---------------------------------------------------------------------------

  server.tool(
    'approve_service_entry',
    'อนุมัติใบรับบริการ — Approve a service entry sheet (MM-SRV)',
    {
      serviceEntryId: z.string().describe('Service entry ID'),
      notes: z.string().optional().describe('Approval notes'),
    },
    async ({ serviceEntryId, notes }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/service-entries/${serviceEntryId}/approve`, { notes });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: generate_maintenance_orders
  // ---------------------------------------------------------------------------

  server.tool(
    'generate_maintenance_orders',
    'สร้างใบสั่งซ่อมจากแผน — Generate maintenance orders from plans (PM-PRM)',
    {
      asOfDate: z.string().optional().describe('As-of date (YYYY-MM-DD), defaults to today'),
      equipmentId: z.string().optional().describe('Specific equipment ID'),
    },
    async ({ asOfDate, equipmentId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/maintenance-plans/generate-orders', {
          asOfDate, equipmentId,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: run_sod_check
  // ---------------------------------------------------------------------------

  server.tool(
    'run_sod_check',
    'ตรวจสอบ SoD — Run segregation of duties check (GRC)',
    {
      userId: z.string().optional().describe('Check specific user (omit for all)'),
      roleId: z.string().optional().describe('Check specific role (omit for all)'),
    },
    async ({ userId, roleId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/sod-rules/check', { userId, roleId });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
