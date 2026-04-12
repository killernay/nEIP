'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Search, Zap, List, PlusCircle, Play, BarChart3, Shield } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface McpTool {
  name: string;
  description: string;
  descriptionTh: string;
  input?: string;
  example?: string;
}

interface McpCategory {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tools: McpTool[];
}

const MCP_CATEGORIES: McpCategory[] = [
  {
    name: 'Auth',
    icon: Shield,
    color: 'text-gray-950 dark:text-gray-200',
    tools: [
      { name: 'auth_login', description: 'Login and get JWT token', descriptionTh: 'เข้าสู่ระบบ', input: '{ email, password }' },
    ],
  },
  {
    name: 'List (50 tools)',
    icon: List,
    color: 'text-blue-600 dark:text-blue-400',
    tools: [
      { name: 'list_accounts', description: 'List chart of accounts', descriptionTh: 'ดูผังบัญชี', input: '{ limit?: 50 }' },
      { name: 'list_invoices', description: 'List invoices (AR)', descriptionTh: 'ดูรายการใบแจ้งหนี้', input: '{ status?, limit?: 20 }' },
      { name: 'list_bills', description: 'List bills (AP)', descriptionTh: 'ดูรายการบิล', input: '{ limit?: 20 }' },
      { name: 'list_contacts', description: 'List contacts (CRM)', descriptionTh: 'ดูทะเบียนลูกค้า/ผู้ขาย', input: '{ type?, limit?: 20 }' },
      { name: 'list_products', description: 'List products', descriptionTh: 'ดูสินค้า', input: '{ limit?: 20 }' },
      { name: 'list_employees', description: 'List employees', descriptionTh: 'ดูพนักงาน', input: '{ limit?: 20 }' },
      { name: 'list_journal_entries', description: 'List journal entries', descriptionTh: 'ดูรายการบัญชี', input: '{ status?, limit?, offset? }' },
      { name: 'list_payments', description: 'List AR payments', descriptionTh: 'ดูรายการรับชำระ', input: '{ customerId?, status?, limit? }' },
      { name: 'list_quotations', description: 'List quotations', descriptionTh: 'ดูใบเสนอราคา', input: '{ status?, customerId?, limit? }' },
      { name: 'list_sales_orders', description: 'List sales orders', descriptionTh: 'ดูใบสั่งขาย', input: '{ status?, customerId?, limit? }' },
      { name: 'list_delivery_notes', description: 'List delivery notes', descriptionTh: 'ดูใบส่งของ', input: '{ status?, salesOrderId?, limit? }' },
      { name: 'list_receipts', description: 'List receipts', descriptionTh: 'ดูใบเสร็จรับเงิน', input: '{ status?, customerId?, limit? }' },
      { name: 'list_credit_notes', description: 'List credit notes', descriptionTh: 'ดูใบลดหนี้', input: '{ status?, customerId?, limit? }' },
      { name: 'list_purchase_orders', description: 'List purchase orders', descriptionTh: 'ดูใบสั่งซื้อ', input: '{ status?, vendorId?, limit? }' },
      { name: 'list_vendors', description: 'List vendors', descriptionTh: 'ดูผู้ขาย', input: '{ search?, limit? }' },
      { name: 'list_departments', description: 'List departments', descriptionTh: 'ดูแผนก', input: '{ }' },
      { name: 'list_payroll', description: 'List payroll runs', descriptionTh: 'ดูเงินเดือน', input: '{ status?, limit? }' },
      { name: 'list_leave_requests', description: 'List leave requests', descriptionTh: 'ดูคำขอลา', input: '{ status?, employeeId?, limit? }' },
      { name: 'list_fixed_assets', description: 'List fixed assets', descriptionTh: 'ดูสินทรัพย์ถาวร', input: '{ category?, status?, limit? }' },
      { name: 'list_bank_accounts', description: 'List bank accounts', descriptionTh: 'ดูบัญชีธนาคาร', input: '{ }' },
      { name: 'list_wht_certificates', description: 'List WHT certificates', descriptionTh: 'ดูใบหัก ณ ที่จ่าย', input: '{ status?, taxYear?, taxMonth?, limit? }' },
      { name: 'list_tax_rates', description: 'List tax rates', descriptionTh: 'ดูอัตราภาษี', input: '{ limit?: 50 }' },
      { name: 'list_cost_centers', description: 'List cost centers', descriptionTh: 'ดูศูนย์ต้นทุน', input: '{ }' },
      { name: 'list_profit_centers', description: 'List profit centers', descriptionTh: 'ดูศูนย์กำไร', input: '{ }' },
      { name: 'list_budgets', description: 'List budgets', descriptionTh: 'ดูงบประมาณ', input: '{ year?, limit? }' },
      { name: 'list_roles', description: 'List roles & permissions', descriptionTh: 'ดู roles', input: '{ limit?: 50 }' },
      { name: 'list_webhooks', description: 'List webhook subscriptions', descriptionTh: 'ดู webhooks', input: '{ limit?: 50 }' },
      { name: 'list_fiscal_years', description: 'List fiscal years', descriptionTh: 'ดูปีบัญชี', input: '{ limit? }' },
      { name: 'list_stock_levels', description: 'List stock levels', descriptionTh: 'ดูระดับสต็อก', input: '{ productId? }' },
      { name: 'list_price_lists', description: 'List price lists', descriptionTh: 'ดูรายการราคา', input: '{ limit? }' },
      { name: 'list_payment_terms', description: 'List payment terms', descriptionTh: 'ดูเงื่อนไขชำระ', input: '{ limit? }' },
      { name: 'list_dunning_cases', description: 'List dunning cases', descriptionTh: 'ดูรายการทวงถาม', input: '{ status?, limit? }' },
      { name: 'list_purchase_requisitions', description: 'List PRs', descriptionTh: 'ดูใบขอซื้อ', input: '{ status?, limit? }' },
      { name: 'list_rfqs', description: 'List RFQs', descriptionTh: 'ดู RFQ', input: '{ status?, limit? }' },
      { name: 'list_stock_counts', description: 'List stock counts', descriptionTh: 'ดูการนับสต็อก', input: '{ status?, limit? }' },
      { name: 'list_positions', description: 'List positions', descriptionTh: 'ดูตำแหน่งงาน', input: '{ departmentId?, limit? }' },
      { name: 'list_attendance_records', description: 'List attendance', descriptionTh: 'ดูเข้างาน', input: '{ employeeId?, date?, limit? }' },
      { name: 'list_currencies', description: 'List currencies', descriptionTh: 'ดูสกุลเงิน', input: '{ limit?: 50 }' },
      { name: 'list_exchange_rates', description: 'List exchange rates', descriptionTh: 'ดูอัตราแลกเปลี่ยน', input: '{ fromCurrency?, toCurrency?, limit? }' },
      { name: 'list_companies', description: 'List companies', descriptionTh: 'ดูบริษัท', input: '{ limit? }' },
      { name: 'list_approval_workflows', description: 'List approval workflows', descriptionTh: 'ดู workflow อนุมัติ', input: '{ limit? }' },
      { name: 'list_approval_requests', description: 'List approval requests', descriptionTh: 'ดูคำขออนุมัติ', input: '{ status?, limit? }' },
      { name: 'list_vendor_returns', description: 'List vendor returns', descriptionTh: 'ดูใบส่งคืน', input: '{ status?, limit? }' },
      { name: 'list_batches', description: 'List batches/lots', descriptionTh: 'ดู Batch/Lot', input: '{ productId?, limit? }' },
      { name: 'list_serial_numbers', description: 'List serial numbers', descriptionTh: 'ดู Serial Number', input: '{ productId?, status?, limit? }' },
      { name: 'list_bank_matching_rules', description: 'List bank matching rules', descriptionTh: 'ดูกฎจับคู่', input: '{ limit? }' },
      { name: 'list_pdpa_requests', description: 'List PDPA requests', descriptionTh: 'ดูคำขอ PDPA', input: '{ status?, limit? }' },
      { name: 'list_public_holidays', description: 'List public holidays', descriptionTh: 'ดูวันหยุดราชการ', input: '{ year?, limit? }' },
      { name: 'get_organization', description: 'Get organization details', descriptionTh: 'ดูข้อมูลองค์กร', input: '{ organizationId }' },
      { name: 'list_recurring_je_templates', description: 'List recurring JE templates', descriptionTh: 'ดูแม่แบบ JE รายงวด', input: '{ limit? }' },
    ],
  },
  {
    name: 'Create (23 tools)',
    icon: PlusCircle,
    color: 'text-green-600 dark:text-green-400',
    tools: [
      { name: 'create_invoice', description: 'Create a new invoice', descriptionTh: 'สร้างใบแจ้งหนี้', input: '{ customerId, dueDate, lines[] }' },
      { name: 'create_journal_entry', description: 'Create a journal entry', descriptionTh: 'สร้างรายการบัญชี', input: '{ description, fiscalYear, fiscalPeriod, lines[] }' },
      { name: 'create_quotation', description: 'Create a quotation', descriptionTh: 'สร้างใบเสนอราคา', input: '{ customerId, subject, validUntil, lines[] }' },
      { name: 'create_sales_order', description: 'Create a sales order', descriptionTh: 'สร้างใบสั่งขาย', input: '{ customerId, orderDate, lines[] }' },
      { name: 'create_bill', description: 'Create a bill (AP)', descriptionTh: 'สร้างบิล', input: '{ vendorId, billDate, dueDate, lines[] }' },
      { name: 'create_purchase_order', description: 'Create a PO', descriptionTh: 'สร้างใบสั่งซื้อ', input: '{ vendorId, orderDate, lines[] }' },
      { name: 'create_contact', description: 'Create a contact', descriptionTh: 'สร้าง contact', input: '{ contactType, companyName, email?, phone? }' },
      { name: 'create_product', description: 'Create a product', descriptionTh: 'สร้างสินค้า', input: '{ sku, nameTh, nameEn, costPriceSatang? }' },
      { name: 'create_employee', description: 'Create employee', descriptionTh: 'เพิ่มพนักงาน', input: '{ employeeCode, firstNameTh, lastNameTh, hireDate }' },
      { name: 'create_price_list', description: 'Create price list', descriptionTh: 'สร้างรายการราคา', input: '{ name, validFrom, items[] }' },
      { name: 'create_payment_term', description: 'Create payment term', descriptionTh: 'สร้างเงื่อนไขชำระ', input: '{ code, description, dueDays }' },
      { name: 'create_recurring_je_template', description: 'Create recurring JE template', descriptionTh: 'สร้างแม่แบบ JE', input: '{ name, frequency, startDate, lines[] }' },
      { name: 'create_purchase_requisition', description: 'Create a PR', descriptionTh: 'สร้างใบขอซื้อ', input: '{ requestedBy, requiredDate, lines[] }' },
      { name: 'create_rfq', description: 'Create an RFQ', descriptionTh: 'สร้าง RFQ', input: '{ vendorIds[], requiredDate, lines[] }' },
      { name: 'create_stock_count', description: 'Create stock count', descriptionTh: 'สร้างตรวจนับ', input: '{ countDate, items[] }' },
      { name: 'create_position', description: 'Create position', descriptionTh: 'สร้างตำแหน่ง', input: '{ title, departmentId }' },
      { name: 'record_attendance', description: 'Record attendance', descriptionTh: 'บันทึกเข้างาน', input: '{ employeeId, date, clockIn }' },
      { name: 'create_currency', description: 'Create currency', descriptionTh: 'เพิ่มสกุลเงิน', input: '{ code, name, symbol }' },
      { name: 'create_company', description: 'Create company', descriptionTh: 'สร้างบริษัท', input: '{ name, taxId }' },
      { name: 'create_approval_workflow', description: 'Create approval workflow', descriptionTh: 'สร้าง workflow อนุมัติ', input: '{ name, documentType, steps[] }' },
      { name: 'create_vendor_return', description: 'Create vendor return', descriptionTh: 'สร้างใบส่งคืน', input: '{ vendorId, reason, lines[] }' },
      { name: 'create_batch', description: 'Create batch/lot', descriptionTh: 'สร้าง Batch', input: '{ productId, batchNumber, quantity }' },
      { name: 'create_bank_matching_rule', description: 'Create bank matching rule', descriptionTh: 'สร้างกฎจับคู่', input: '{ name, bankAccountId, matchField, matchPattern, targetAccountId }' },
    ],
  },
  {
    name: 'Action (20 tools)',
    icon: Play,
    color: 'text-orange-600 dark:text-orange-400',
    tools: [
      { name: 'post_invoice', description: 'Post invoice (draft → posted)', descriptionTh: 'Post ใบแจ้งหนี้', input: '{ invoiceId }' },
      { name: 'void_invoice', description: 'Void an invoice', descriptionTh: 'ยกเลิกใบแจ้งหนี้', input: '{ invoiceId }' },
      { name: 'post_bill', description: 'Post bill', descriptionTh: 'Post บิล', input: '{ billId }' },
      { name: 'close_fiscal_period', description: 'Close fiscal period', descriptionTh: 'ปิดงวดบัญชี', input: '{ periodId }' },
      { name: 'month_end_close', description: 'Month-end close', descriptionTh: 'ปิดงวดสิ้นเดือน', input: '{ fiscalYear, fiscalPeriod }' },
      { name: 'close_fiscal_year', description: 'Close fiscal year', descriptionTh: 'ปิดปีบัญชี', input: '{ fiscalYearId }' },
      { name: 'reopen_fiscal_year', description: 'Reopen fiscal year', descriptionTh: 'เปิดปีบัญชีอีกครั้ง', input: '{ fiscalYearId }' },
      { name: 'run_dunning', description: 'Run dunning process', descriptionTh: 'รันทวงถาม', input: '{ asOfDate?, customerId? }' },
      { name: 'run_recurring_je', description: 'Execute recurring JEs', descriptionTh: 'รัน JE รายงวด', input: '{ templateId?, postingDate? }' },
      { name: 'check_credit', description: 'Check credit limit', descriptionTh: 'ตรวจสอบวงเงิน', input: '{ customerId, orderAmountSatang? }' },
      { name: 'approve_pr', description: 'Approve PR', descriptionTh: 'อนุมัติใบขอซื้อ', input: '{ purchaseRequisitionId }' },
      { name: 'submit_rfq', description: 'Submit RFQ to vendors', descriptionTh: 'ส่ง RFQ', input: '{ rfqId }' },
      { name: 'post_stock_count', description: 'Post stock count', descriptionTh: 'ยืนยันนับสต็อก', input: '{ stockCountId }' },
      { name: 'auto_reconcile_bank', description: 'Auto-reconcile bank', descriptionTh: 'จับคู่ธนาคารอัตโนมัติ', input: '{ bankAccountId }' },
      { name: 'submit_for_approval', description: 'Submit for approval', descriptionTh: 'ส่งขออนุมัติ', input: '{ documentType, documentId }' },
      { name: 'approve_request', description: 'Approve request', descriptionTh: 'อนุมัติคำขอ', input: '{ requestId }' },
      { name: 'reject_request', description: 'Reject request', descriptionTh: 'ปฏิเสธคำขอ', input: '{ requestId, reason }' },
      { name: 'delegate_approval', description: 'Delegate approval', descriptionTh: 'มอบหมายอนุมัติ', input: '{ requestId, delegateToUserId }' },
      { name: 'fx_revaluation', description: 'FX revaluation', descriptionTh: 'ปรับปรุงอัตราแลกเปลี่ยน', input: '{ asOfDate }' },
      { name: 'resolve_price', description: 'Resolve price', descriptionTh: 'คำนวณราคา', input: '{ productId, customerId?, quantity? }' },
    ],
  },
  {
    name: 'Report (16 tools)',
    icon: BarChart3,
    color: 'text-purple-600 dark:text-purple-400',
    tools: [
      { name: 'dashboard', description: 'Executive dashboard with KPIs', descriptionTh: 'ภาพรวมธุรกิจ', input: '{ }' },
      { name: 'report_trial_balance', description: 'Trial balance', descriptionTh: 'งบทดลอง', input: '{ fiscalYear? }' },
      { name: 'report_pnl', description: 'P&L comparison', descriptionTh: 'งบกำไรขาดทุน', input: '{ mode, fiscalYear }' },
      { name: 'report_income_statement', description: 'Income statement', descriptionTh: 'งบกำไรขาดทุน', input: '{ startDate?, endDate? }' },
      { name: 'report_balance_sheet', description: 'Balance sheet', descriptionTh: 'งบดุล', input: '{ asOf? }' },
      { name: 'report_budget_variance', description: 'Budget variance', descriptionTh: 'งบประมาณเทียบจริง', input: '{ year?, period? }' },
      { name: 'report_ar_aging', description: 'AR aging', descriptionTh: 'อายุลูกหนี้', input: '{ asOf? }' },
      { name: 'report_ap_aging', description: 'AP aging', descriptionTh: 'อายุเจ้าหนี้', input: '{ asOf? }' },
      { name: 'audit_logs', description: 'View audit trail', descriptionTh: 'บันทึกการเปลี่ยนแปลง', input: '{ limit?: 20 }' },
      { name: 'generate_vat_return', description: 'Generate ภ.พ.30', descriptionTh: 'สร้างแบบ ภ.พ.30', input: '{ taxYear, taxMonth }' },
      { name: 'generate_ssc_filing', description: 'Generate สปส.1-10', descriptionTh: 'สร้างแบบ สปส.1-10', input: '{ year, month }' },
      { name: 'generate_cash_flow', description: 'Cash flow statement', descriptionTh: 'งบกระแสเงินสด', input: '{ startDate?, endDate? }' },
      { name: 'run_anomaly_scan', description: 'AI anomaly detection', descriptionTh: 'สแกนความผิดปกติ', input: '{ scope?, startDate?, endDate? }' },
      { name: 'run_cash_forecast', description: 'AI cash forecast', descriptionTh: 'พยากรณ์เงินสด', input: '{ horizonDays?: 30 }' },
      { name: 'categorize_transaction', description: 'AI categorize', descriptionTh: 'จัดหมวดหมู่', input: '{ description, amountSatang }' },
      { name: 'generate_predictions', description: 'AI predictions', descriptionTh: 'พยากรณ์', input: '{ metric, horizonMonths?: 3 }' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function CategorySection({ category, filter }: { category: McpCategory; filter: string }) {
  const [open, setOpen] = useState(true);
  const Icon = category.icon;
  const filtered = useMemo(() => {
    if (!filter) return category.tools;
    const q = filter.toLowerCase();
    return category.tools.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.descriptionTh.includes(q),
    );
  }, [category.tools, filter]);

  if (filtered.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-left font-semibold text-white hover:bg-slate-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <Icon className={`h-4 w-4 ${category.color}`} />
        <span className="flex-1">{category.name}</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">{filtered.length}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-1 overflow-x-auto rounded-lg border border-gray-400 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Tool</th>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Description</th>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Input Schema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-800">
              {filtered.map((tool) => (
                <tr key={tool.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2">
                    <code className="rounded bg-slate-100 border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-gray-900 dark:bg-gray-700 dark:text-gray-100">
                      {tool.name}
                    </code>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-xs text-gray-950 dark:text-gray-200">{tool.description}</p>
                    <p className="text-xs text-gray-600">{tool.descriptionTh}</p>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{tool.input || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function McpDocsPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-gray-400 p-4 lg:block dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-400">
          Categories
        </p>
        <nav className="space-y-1">
          {MCP_CATEGORIES.map((c) => (
            <a
              key={c.name}
              href={`#mcp-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-200 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <c.icon className={`h-4 w-4 ${c.color}`} />
              {c.name}
            </a>
          ))}
        </nav>
        <div className="mt-4 rounded-lg border border-gray-400 bg-slate-100 p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-300">Total: 110 Tools</span>
          </div>
          <div className="mt-2 space-y-1 text-xs text-gray-700">
            <p>List: 50 | Create: 23</p>
            <p>Action: 20 | Report: 16</p>
            <p>Auth: 1</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-6 py-8 lg:px-12">
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-900 dark:text-gray-400">
          <Link href="/docs" className="hover:text-gray-700 dark:hover:text-gray-200">Docs</Link>
          <span>/</span>
          <span className="text-black dark:text-white">MCP Tools Reference</span>
        </nav>

        <h1 className="text-3xl font-bold text-black dark:text-white">MCP Tools Reference</h1>
        <p className="mt-2 text-gray-950 dark:text-gray-200">
          คู่มืออ้างอิง MCP Tools ฉบับสมบูรณ์ — 110 Tools | Version 0.9.0
        </p>

        <div className="mt-4 rounded-lg border border-gray-400 bg-slate-100 p-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <p><strong>Note:</strong> All monetary values use <strong>satang</strong> (1 THB = 100 satang) as bigint/string. All tools require JWT auth.</p>
        </div>

        {/* Search */}
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools... (e.g. invoice, payroll, ใบแจ้งหนี้)"
            className="w-full rounded-lg border border-gray-400 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="mt-6 space-y-4">
          {MCP_CATEGORIES.map((c) => (
            <div key={c.name} id={`mcp-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
              <CategorySection category={c} filter={search} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
