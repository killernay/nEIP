import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall } from '../api.js';

export function registerActionTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // Tool: post_invoice
  // ---------------------------------------------------------------------------

  server.tool(
    'post_invoice',
    'Post ใบแจ้งหนี้ (draft → posted) — Post an invoice, creating journal entries',
    {
      invoiceId: z.string().describe('Invoice ID to post'),
    },
    async ({ invoiceId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/invoices/${invoiceId}/post`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: void_invoice
  // ---------------------------------------------------------------------------

  server.tool(
    'void_invoice',
    'ยกเลิกใบแจ้งหนี้ — Void an invoice, preventing further payment',
    {
      invoiceId: z.string().describe('Invoice ID to void'),
    },
    async ({ invoiceId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/invoices/${invoiceId}/void`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: post_bill
  // ---------------------------------------------------------------------------

  server.tool(
    'post_bill',
    'Post บิล (draft → posted) — Post a bill, creating journal entries',
    {
      billId: z.string().describe('Bill ID to post'),
    },
    async ({ billId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/bills/${billId}/post`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: close_fiscal_period
  // ---------------------------------------------------------------------------

  server.tool(
    'close_fiscal_period',
    'ปิดงวดบัญชี — Close a fiscal period to prevent further postings',
    {
      periodId: z.string().describe('Fiscal period ID to close'),
    },
    async ({ periodId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/fiscal-periods/${periodId}/close`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
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
    async ({ fiscalYear, fiscalPeriod }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/month-end/close', {
          fiscalYear, fiscalPeriod,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: close_fiscal_year
  // ---------------------------------------------------------------------------

  server.tool(
    'close_fiscal_year',
    'ปิดปีบัญชี — Close a fiscal year (year-end close)',
    {
      fiscalYearId: z.string().describe('Fiscal year ID to close'),
    },
    async ({ fiscalYearId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/fiscal-years/${fiscalYearId}/close`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: reopen_fiscal_year
  // ---------------------------------------------------------------------------

  server.tool(
    'reopen_fiscal_year',
    'เปิดปีบัญชีอีกครั้ง — Reopen a closed fiscal year',
    {
      fiscalYearId: z.string().describe('Fiscal year ID to reopen'),
    },
    async ({ fiscalYearId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', `/fiscal-years/${fiscalYearId}/reopen`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
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
    async ({ asOfDate, customerId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/dunning/run', {
          asOfDate, customerId,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
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
    async ({ templateId, postingDate }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/recurring-journal-entries/run', {
          templateId, postingDate,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
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
}
