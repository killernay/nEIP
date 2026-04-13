import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall } from '../api.js';

export function registerListTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // Tool: list_accounts
  // ---------------------------------------------------------------------------

  server.tool(
    'list_accounts',
    'ดูผังบัญชี — List chart of accounts',
    {
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/accounts?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_invoices
  // ---------------------------------------------------------------------------

  server.tool(
    'list_invoices',
    'ดูรายการใบแจ้งหนี้ — List invoices',
    {
      status: z.string().optional().describe('Filter by status: draft, posted, paid, voided'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/invoices?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_bills
  // ---------------------------------------------------------------------------

  server.tool(
    'list_bills',
    'ดูรายการบิล — List bills (AP)',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/bills?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_contacts
  // ---------------------------------------------------------------------------

  server.tool(
    'list_contacts',
    'ดูทะเบียนลูกค้า/ผู้ขาย — List contacts (CRM)',
    {
      type: z.enum(['customer', 'vendor', 'both']).optional().describe('Contact type filter'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ type, limit }) => {
      try {
        let path = `/contacts?limit=${limit}`;
        if (type) path += `&type=${type}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_products
  // ---------------------------------------------------------------------------

  server.tool(
    'list_products',
    'ดูสินค้า — List products',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/products?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_employees
  // ---------------------------------------------------------------------------

  server.tool(
    'list_employees',
    'ดูพนักงาน — List employees',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/employees?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_journal_entries
  // ---------------------------------------------------------------------------

  server.tool(
    'list_journal_entries',
    'ดูรายการบัญชี — List journal entries',
    {
      status: z.string().optional().describe('Filter by status: draft, posted, voided'),
      limit: z.number().optional().default(20).describe('Max items'),
      offset: z.number().optional().default(0).describe('Offset for pagination'),
    },
    async ({ status, limit, offset }) => {
      try {
        let path = `/journal-entries?limit=${limit}&offset=${offset}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_payments
  // ---------------------------------------------------------------------------

  server.tool(
    'list_payments',
    'ดูรายการรับชำระเงิน (AR) — List AR payments',
    {
      customerId: z.string().optional().describe('Filter by customer ID'),
      status: z.string().optional().describe('Filter by status'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ customerId, status, limit }) => {
      try {
        let path = `/payments?limit=${limit}`;
        if (customerId) path += `&customerId=${customerId}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_quotations
  // ---------------------------------------------------------------------------

  server.tool(
    'list_quotations',
    'ดูรายการใบเสนอราคา — List quotations',
    {
      status: z.string().optional().describe('Filter by status: draft, sent, approved, rejected, converted, expired'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, customerId, limit }) => {
      try {
        let path = `/quotations?limit=${limit}`;
        if (status) path += `&status=${status}`;
        if (customerId) path += `&customerId=${customerId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_sales_orders
  // ---------------------------------------------------------------------------

  server.tool(
    'list_sales_orders',
    'ดูรายการใบสั่งขาย — List sales orders (ใบสั่งขาย)',
    {
      status: z.string().optional().describe('Filter by status: draft, confirmed, delivered, cancelled'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, customerId, limit }) => {
      try {
        let path = `/sales-orders?limit=${limit}`;
        if (status) path += `&status=${status}`;
        if (customerId) path += `&customerId=${customerId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_delivery_notes
  // ---------------------------------------------------------------------------

  server.tool(
    'list_delivery_notes',
    'ดูรายการใบส่งของ — List delivery notes (ใบส่งของ)',
    {
      status: z.string().optional().describe('Filter by status'),
      salesOrderId: z.string().optional().describe('Filter by sales order ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, salesOrderId, limit }) => {
      try {
        let path = `/delivery-notes?limit=${limit}`;
        if (status) path += `&status=${status}`;
        if (salesOrderId) path += `&salesOrderId=${salesOrderId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_receipts
  // ---------------------------------------------------------------------------

  server.tool(
    'list_receipts',
    'ดูรายการใบเสร็จรับเงิน — List receipts (ใบเสร็จรับเงิน)',
    {
      status: z.string().optional().describe('Filter by status: issued, voided'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, customerId, limit }) => {
      try {
        let path = `/receipts?limit=${limit}`;
        if (status) path += `&status=${status}`;
        if (customerId) path += `&customerId=${customerId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_credit_notes
  // ---------------------------------------------------------------------------

  server.tool(
    'list_credit_notes',
    'ดูรายการใบลดหนี้ — List credit notes (ใบลดหนี้)',
    {
      status: z.string().optional().describe('Filter by status: draft, issued, voided'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, customerId, limit }) => {
      try {
        let path = `/credit-notes?limit=${limit}`;
        if (status) path += `&status=${status}`;
        if (customerId) path += `&customerId=${customerId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_purchase_orders
  // ---------------------------------------------------------------------------

  server.tool(
    'list_purchase_orders',
    'ดูรายการใบสั่งซื้อ — List purchase orders (ใบสั่งซื้อ)',
    {
      status: z.string().optional().describe('Filter by status: draft, sent, received, cancelled'),
      vendorId: z.string().optional().describe('Filter by vendor ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, vendorId, limit }) => {
      try {
        let path = `/purchase-orders?limit=${limit}`;
        if (status) path += `&status=${status}`;
        if (vendorId) path += `&vendorId=${vendorId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_vendors
  // ---------------------------------------------------------------------------

  server.tool(
    'list_vendors',
    'ดูรายการผู้ขาย — List vendors',
    {
      search: z.string().optional().describe('Search by name or tax ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ search, limit }) => {
      try {
        let path = `/vendors?limit=${limit}`;
        if (search) path += `&search=${encodeURIComponent(search)}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_departments
  // ---------------------------------------------------------------------------

  server.tool(
    'list_departments',
    'ดูรายการแผนก — List departments (HR)',
    {},
    async () => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', '/departments');
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_payroll
  // ---------------------------------------------------------------------------

  server.tool(
    'list_payroll',
    'ดูรายการเงินเดือน — List payroll runs',
    {
      status: z.string().optional().describe('Filter by status: draft, calculated, approved, paid'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/payroll?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_leave_requests
  // ---------------------------------------------------------------------------

  server.tool(
    'list_leave_requests',
    'ดูรายการคำขอลา — List leave requests',
    {
      status: z.string().optional().describe('Filter by status: pending, approved, rejected'),
      employeeId: z.string().optional().describe('Filter by employee ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, employeeId, limit }) => {
      try {
        let path = `/leave-requests?limit=${limit}`;
        if (status) path += `&status=${status}`;
        if (employeeId) path += `&employeeId=${employeeId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_fixed_assets
  // ---------------------------------------------------------------------------

  server.tool(
    'list_fixed_assets',
    'ดูรายการสินทรัพย์ถาวร — List fixed assets (FI-AA)',
    {
      category: z.string().optional().describe('Filter by category: equipment, vehicle, building, land, furniture, it_equipment, other'),
      status: z.string().optional().describe('Filter by status: active, disposed, written_off'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ category, status, limit }) => {
      try {
        let path = `/fixed-assets?limit=${limit}`;
        if (category) path += `&category=${category}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_bank_accounts
  // ---------------------------------------------------------------------------

  server.tool(
    'list_bank_accounts',
    'ดูรายการบัญชีธนาคาร — List bank accounts (FI-BL)',
    {},
    async () => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', '/bank-accounts');
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_wht_certificates
  // ---------------------------------------------------------------------------

  server.tool(
    'list_wht_certificates',
    'ดูรายการใบหัก ณ ที่จ่าย — List WHT certificates (ภ.ง.ด.3/53)',
    {
      status: z.string().optional().describe('Filter by status: draft, issued, filed, voided'),
      taxYear: z.number().optional().describe('Filter by tax year'),
      taxMonth: z.number().optional().describe('Filter by tax month (1-12)'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, taxYear, taxMonth, limit }) => {
      try {
        let path = `/wht-certificates?limit=${limit}`;
        if (status) path += `&status=${status}`;
        if (taxYear) path += `&taxYear=${taxYear}`;
        if (taxMonth) path += `&taxMonth=${taxMonth}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_tax_rates
  // ---------------------------------------------------------------------------

  server.tool(
    'list_tax_rates',
    'ดูรายการอัตราภาษี — List tax rates (VAT, WHT)',
    {
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/tax-rates?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_cost_centers
  // ---------------------------------------------------------------------------

  server.tool(
    'list_cost_centers',
    'ดูรายการศูนย์ต้นทุน — List cost centers (CO-CCA)',
    {},
    async () => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', '/cost-centers');
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_profit_centers
  // ---------------------------------------------------------------------------

  server.tool(
    'list_profit_centers',
    'ดูรายการศูนย์กำไร — List profit centers (CO-PCA)',
    {},
    async () => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', '/profit-centers');
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_budgets
  // ---------------------------------------------------------------------------

  server.tool(
    'list_budgets',
    'ดูรายการงบประมาณ — List budgets',
    {
      year: z.number().optional().describe('Filter by fiscal year'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ year, limit }) => {
      try {
        let path = `/budgets?limit=${limit}`;
        if (year) path += `&year=${year}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_roles
  // ---------------------------------------------------------------------------

  server.tool(
    'list_roles',
    'ดูรายการ roles — List roles and permissions',
    {
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/roles?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_webhooks
  // ---------------------------------------------------------------------------

  server.tool(
    'list_webhooks',
    'ดูรายการ webhooks — List webhook subscriptions',
    {
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/webhooks?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_fiscal_years
  // ---------------------------------------------------------------------------

  server.tool(
    'list_fiscal_years',
    'ดูรายการปีบัญชี — List fiscal years',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/fiscal-years?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_stock_levels
  // ---------------------------------------------------------------------------

  server.tool(
    'list_stock_levels',
    'ดูระดับสต็อกสินค้า — List current stock levels',
    {
      productId: z.string().optional().describe('Filter by product ID'),
    },
    async ({ productId }) => {
      try {
        let path = '/stock-levels';
        if (productId) path += `?productId=${productId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: get_organization
  // ---------------------------------------------------------------------------

  server.tool(
    'get_organization',
    'ดูข้อมูลองค์กร — Get organization settings and details',
    {
      organizationId: z.string().describe('Organization ID (tenantId from JWT)'),
    },
    async ({ organizationId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/organizations/${organizationId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_price_lists
  // ---------------------------------------------------------------------------

  server.tool(
    'list_price_lists',
    'ดูรายการราคา — List price lists (SD-Pricing)',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/pricing/price-lists?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_payment_terms
  // ---------------------------------------------------------------------------

  server.tool(
    'list_payment_terms',
    'ดูเงื่อนไขการชำระเงิน — List payment terms',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/payment-terms?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_dunning_cases
  // ---------------------------------------------------------------------------

  server.tool(
    'list_dunning_cases',
    'ดูรายการทวงถาม — List dunning cases (AR-Dunning)',
    {
      status: z.string().optional().describe('Filter by status: open, closed, escalated'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/dunning?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_recurring_je_templates
  // ---------------------------------------------------------------------------

  server.tool(
    'list_recurring_je_templates',
    'ดูแม่แบบรายการบัญชีรายงวด — List recurring journal entry templates',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/recurring-journal-entries?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_purchase_requisitions
  // ---------------------------------------------------------------------------

  server.tool(
    'list_purchase_requisitions',
    'ดูใบขอซื้อ — List purchase requisitions (MM-PR)',
    {
      status: z.string().optional().describe('Filter by status: draft, submitted, approved, rejected, converted'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/purchase-requisitions?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_rfqs
  // ---------------------------------------------------------------------------

  server.tool(
    'list_rfqs',
    'ดูใบขอใบเสนอราคา — List requests for quotation (RFQ)',
    {
      status: z.string().optional().describe('Filter by status: draft, sent, received, closed'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/rfqs?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_stock_counts
  // ---------------------------------------------------------------------------

  server.tool(
    'list_stock_counts',
    'ดูรายการตรวจนับสต็อก — List stock count sessions (MM-IM)',
    {
      status: z.string().optional().describe('Filter by status: planned, in_progress, completed, posted'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/stock-counts?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_positions
  // ---------------------------------------------------------------------------

  server.tool(
    'list_positions',
    'ดูตำแหน่งงาน — List positions (HR-OM)',
    {
      departmentId: z.string().optional().describe('Filter by department ID'),
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ departmentId, limit }) => {
      try {
        let path = `/positions?limit=${limit}`;
        if (departmentId) path += `&departmentId=${departmentId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_attendance_records
  // ---------------------------------------------------------------------------

  server.tool(
    'list_attendance_records',
    'ดูบันทึกการเข้างาน — List attendance records (HR-TM)',
    {
      employeeId: z.string().optional().describe('Filter by employee ID'),
      date: z.string().optional().describe('Filter by date (YYYY-MM-DD)'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ employeeId, date, limit }) => {
      try {
        let path = `/attendance?limit=${limit}`;
        if (employeeId) path += `&employeeId=${employeeId}`;
        if (date) path += `&date=${date}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_currencies
  // ---------------------------------------------------------------------------

  server.tool(
    'list_currencies',
    'ดูสกุลเงิน — List currencies',
    {
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/currencies?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_exchange_rates
  // ---------------------------------------------------------------------------

  server.tool(
    'list_exchange_rates',
    'ดูอัตราแลกเปลี่ยน — List exchange rates (FI-FX)',
    {
      fromCurrency: z.string().optional().describe('Source currency code (e.g. USD)'),
      toCurrency: z.string().optional().default('THB').describe('Target currency code'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ fromCurrency, toCurrency, limit }) => {
      try {
        let path = `/currencies/exchange-rates?limit=${limit}`;
        if (fromCurrency) path += `&from=${fromCurrency}`;
        if (toCurrency) path += `&to=${toCurrency}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_companies
  // ---------------------------------------------------------------------------

  server.tool(
    'list_companies',
    'ดูรายการบริษัท — List companies (multi-company)',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/companies?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_approval_workflows
  // ---------------------------------------------------------------------------

  server.tool(
    'list_approval_workflows',
    'ดู workflow อนุมัติ — List approval workflows',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/approvals/workflows?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_approval_requests
  // ---------------------------------------------------------------------------

  server.tool(
    'list_approval_requests',
    'ดูคำขออนุมัติ — List approval requests',
    {
      status: z.string().optional().describe('Filter by status: pending, approved, rejected'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/approvals/requests?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_vendor_returns
  // ---------------------------------------------------------------------------

  server.tool(
    'list_vendor_returns',
    'ดูใบส่งคืนสินค้า — List vendor returns (MM-RET)',
    {
      status: z.string().optional().describe('Filter by status: draft, sent, received_credit'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/vendor-returns?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_batches
  // ---------------------------------------------------------------------------

  server.tool(
    'list_batches',
    'ดูรายการ Batch/Lot — List batches and lot numbers (MM-BT)',
    {
      productId: z.string().optional().describe('Filter by product ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ productId, limit }) => {
      try {
        let path = `/batches?limit=${limit}`;
        if (productId) path += `&productId=${productId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_serial_numbers
  // ---------------------------------------------------------------------------

  server.tool(
    'list_serial_numbers',
    'ดูรายการ Serial Number — List serial numbers (MM-SN)',
    {
      productId: z.string().optional().describe('Filter by product ID'),
      status: z.string().optional().describe('Filter by status: in_stock, sold, returned'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ productId, status, limit }) => {
      try {
        let path = `/serial-numbers?limit=${limit}`;
        if (productId) path += `&productId=${productId}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_bank_matching_rules
  // ---------------------------------------------------------------------------

  server.tool(
    'list_bank_matching_rules',
    'ดูกฎจับคู่ธนาคาร — List bank matching rules (FI-BL)',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/bank-matching/rules?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_pdpa_requests
  // ---------------------------------------------------------------------------

  server.tool(
    'list_pdpa_requests',
    'ดูคำขอ PDPA — List PDPA data subject requests',
    {
      status: z.string().optional().describe('Filter by status: pending, processing, completed, rejected'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/pdpa/requests?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_public_holidays
  // ---------------------------------------------------------------------------

  server.tool(
    'list_public_holidays',
    'ดูวันหยุดราชการ — List public holidays (HR)',
    {
      year: z.number().optional().describe('Filter by year'),
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ year, limit }) => {
      try {
        let path = `/public-holidays?limit=${limit}`;
        if (year) path += `&year=${year}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ===========================================================================
  // SAP-Parity Module List Tools (PP, PM, RE, RA, FT, MM-SRV, WM, PS, HR, GRC, DMS)
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Tool: list_bom — Bill of Materials (PP-BOM)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_bom',
    'ดู BOM — List bills of materials (PP-BOM)',
    {
      productId: z.string().optional().describe('Filter by finished product ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ productId, limit }) => {
      try {
        let path = `/bom?limit=${limit}`;
        if (productId) path += `&productId=${productId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_work_centers — Work Centers (PP-CRP)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_work_centers',
    'ดูศูนย์งาน — List work centers (PP-CRP)',
    {
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/work-centers?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_production_orders — Production Orders (PP-SFC)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_production_orders',
    'ดูใบสั่งผลิต — List production orders (PP-SFC)',
    {
      status: z.string().optional().describe('Filter by status: planned, released, in_progress, completed, closed'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/production-orders?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_equipment — Equipment Master (PM-EQM)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_equipment',
    'ดูเครื่องจักร/อุปกรณ์ — List equipment (PM-EQM)',
    {
      status: z.string().optional().describe('Filter by status: active, inactive, under_maintenance'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/equipment?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_maintenance_plans — Maintenance Plans (PM-PRM)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_maintenance_plans',
    'ดูแผนบำรุงรักษา — List maintenance plans (PM-PRM)',
    {
      equipmentId: z.string().optional().describe('Filter by equipment ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ equipmentId, limit }) => {
      try {
        let path = `/maintenance-plans?limit=${limit}`;
        if (equipmentId) path += `&equipmentId=${equipmentId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_maintenance_orders — Maintenance Orders (PM-WOC)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_maintenance_orders',
    'ดูใบสั่งซ่อม — List maintenance orders (PM-WOC)',
    {
      status: z.string().optional().describe('Filter by status: planned, in_progress, completed'),
      equipmentId: z.string().optional().describe('Filter by equipment ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, equipmentId, limit }) => {
      try {
        let path = `/maintenance-orders?limit=${limit}`;
        if (status) path += `&status=${status}`;
        if (equipmentId) path += `&equipmentId=${equipmentId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_lease_contracts — Lease Contracts (RE-FX)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_lease_contracts',
    'ดูสัญญาเช่า — List lease contracts (RE-FX / IFRS 16)',
    {
      status: z.string().optional().describe('Filter by status: draft, active, expired, terminated'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/lease-contracts?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_revenue_contracts — Revenue Contracts (RA / IFRS 15)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_revenue_contracts',
    'ดูสัญญารายรับ — List revenue contracts (RA / IFRS 15)',
    {
      status: z.string().optional().describe('Filter by status: draft, active, fulfilled, terminated'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/revenue-contracts?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_trade_declarations — Trade Declarations (FT)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_trade_declarations',
    'ดูใบขนสินค้า — List trade declarations (FT)',
    {
      type: z.string().optional().describe('Filter: import or export'),
      status: z.string().optional().describe('Filter by status'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ type, status, limit }) => {
      try {
        let path = `/trade-declarations?limit=${limit}`;
        if (type) path += `&type=${type}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_letters_of_credit — Letters of Credit (FT-LC)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_letters_of_credit',
    'ดู L/C — List letters of credit (FT-LC)',
    {
      status: z.string().optional().describe('Filter by status: draft, issued, negotiated, settled, cancelled'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/letters-of-credit?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_purchasing_contracts — Purchasing Contracts (MM-PUR)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_purchasing_contracts',
    'ดูสัญญาจัดซื้อ — List purchasing contracts (MM-PUR)',
    {
      vendorId: z.string().optional().describe('Filter by vendor ID'),
      status: z.string().optional().describe('Filter by status: draft, active, expired'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ vendorId, status, limit }) => {
      try {
        let path = `/purchasing-contracts?limit=${limit}`;
        if (vendorId) path += `&vendorId=${vendorId}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_kanban_cards — Kanban Cards (PP-KAN)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_kanban_cards',
    'ดูบัตร Kanban — List kanban cards (PP-KAN)',
    {
      workCenterId: z.string().optional().describe('Filter by work center ID'),
      status: z.string().optional().describe('Filter by status: empty, in_transit, full'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ workCenterId, status, limit }) => {
      try {
        let path = `/kanban-cards?limit=${limit}`;
        if (workCenterId) path += `&workCenterId=${workCenterId}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_service_entries — Service Entry Sheets (MM-SRV)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_service_entries',
    'ดูใบรับบริการ — List service entry sheets (MM-SRV)',
    {
      status: z.string().optional().describe('Filter by status: draft, submitted, approved, rejected'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/service-entries?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_storage_bins — Storage Bins (WM)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_storage_bins',
    'ดูตำแหน่งจัดเก็บ — List storage bins (WM)',
    {
      warehouseId: z.string().optional().describe('Filter by warehouse ID'),
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ warehouseId, limit }) => {
      try {
        let path = `/storage-bins?limit=${limit}`;
        if (warehouseId) path += `&warehouseId=${warehouseId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_pick_lists — Pick Lists (WM)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_pick_lists',
    'ดูใบหยิบสินค้า — List pick lists (WM)',
    {
      status: z.string().optional().describe('Filter by status: open, in_progress, completed'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/pick-lists?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_shipments — Shipments (LE-TRA)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_shipments',
    'ดูรายการจัดส่ง — List shipments (LE-TRA)',
    {
      status: z.string().optional().describe('Filter by status: planned, in_transit, delivered'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/shipments?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_wbs_elements — WBS Elements (PS)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_wbs_elements',
    'ดู WBS — List WBS elements (PS)',
    {
      projectId: z.string().optional().describe('Filter by project ID'),
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ projectId, limit }) => {
      try {
        let path = `/wbs-elements?limit=${limit}`;
        if (projectId) path += `&projectId=${projectId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_job_postings — Job Postings (HR-RCF)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_job_postings',
    'ดูประกาศรับสมัครงาน — List job postings (HR-RCF)',
    {
      status: z.string().optional().describe('Filter by status: draft, open, closed'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ status, limit }) => {
      try {
        let path = `/job-postings?limit=${limit}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_job_applications — Job Applications (HR-RCF)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_job_applications',
    'ดูใบสมัครงาน — List job applications (HR-RCF)',
    {
      jobPostingId: z.string().optional().describe('Filter by job posting ID'),
      status: z.string().optional().describe('Filter by status: applied, screening, interview, offered, hired, rejected'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ jobPostingId, status, limit }) => {
      try {
        let path = `/job-applications?limit=${limit}`;
        if (jobPostingId) path += `&jobPostingId=${jobPostingId}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_performance_reviews — Performance Reviews (HR-PA)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_performance_reviews',
    'ดูการประเมินผล — List performance reviews (HR-PA)',
    {
      employeeId: z.string().optional().describe('Filter by employee ID'),
      period: z.string().optional().describe('Filter by period (e.g. 2026-Q1)'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ employeeId, period, limit }) => {
      try {
        let path = `/performance-reviews?limit=${limit}`;
        if (employeeId) path += `&employeeId=${employeeId}`;
        if (period) path += `&period=${period}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_travel_requests — Travel Requests (HR-TRV)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_travel_requests',
    'ดูคำขอเดินทาง — List travel requests (HR-TRV)',
    {
      employeeId: z.string().optional().describe('Filter by employee ID'),
      status: z.string().optional().describe('Filter by status: draft, submitted, approved, rejected, completed'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ employeeId, status, limit }) => {
      try {
        let path = `/travel-requests?limit=${limit}`;
        if (employeeId) path += `&employeeId=${employeeId}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_expense_claims — Expense Claims (HR-TRV)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_expense_claims',
    'ดูเบิกค่าใช้จ่าย — List expense claims (HR-TRV)',
    {
      employeeId: z.string().optional().describe('Filter by employee ID'),
      status: z.string().optional().describe('Filter by status: draft, submitted, approved, rejected, paid'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ employeeId, status, limit }) => {
      try {
        let path = `/expense-claims?limit=${limit}`;
        if (employeeId) path += `&employeeId=${employeeId}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_sod_rules — SoD Rules (GRC)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_sod_rules',
    'ดูกฎ SoD — List segregation of duties rules (GRC)',
    {
      limit: z.number().optional().default(50).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/sod-rules?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_documents — Document Management (DMS)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_documents',
    'ดูเอกสาร — List documents (DMS)',
    {
      entityType: z.string().optional().describe('Filter by entity type (e.g. invoice, contract)'),
      entityId: z.string().optional().describe('Filter by entity ID'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ entityType, entityId, limit }) => {
      try {
        let path = `/documents?limit=${limit}`;
        if (entityType) path += `&entityType=${entityType}`;
        if (entityId) path += `&entityId=${entityId}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: list_down_payments — Down Payments (FI-AP/AR)
  // ---------------------------------------------------------------------------

  server.tool(
    'list_down_payments',
    'ดูเงินมัดจำ — List down payments (FI-AP/AR)',
    {
      type: z.enum(['customer', 'vendor']).optional().describe('Filter: customer or vendor'),
      status: z.string().optional().describe('Filter by status: open, applied, refunded'),
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ type, status, limit }) => {
      try {
        let path = `/down-payments?limit=${limit}`;
        if (type) path += `&type=${type}`;
        if (status) path += `&status=${status}`;
        const data = await apiCall<Record<string, unknown>>('GET', path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
