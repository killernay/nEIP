'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Search, Copy, Check, Terminal } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface CliCommand {
  command: string;
  description: string;
  descriptionTh: string;
  flags?: string;
  example?: string;
}

interface CliGroup {
  name: string;
  commands: CliCommand[];
}

const CLI_GROUPS: CliGroup[] = [
  {
    name: 'Authentication & System',
    commands: [
      { command: 'neip auth login', description: 'Authenticate with the nEIP API', descriptionTh: 'เข้าสู่ระบบ' },
      { command: 'neip auth logout', description: 'Clear stored credentials', descriptionTh: 'ออกจากระบบ' },
      { command: 'neip whoami', description: 'Show current user, org, and API URL', descriptionTh: 'แสดงข้อมูลผู้ใช้ปัจจุบัน' },
      { command: 'neip config set <key> <value>', description: 'Set a configuration value', descriptionTh: 'ตั้งค่า configuration', example: 'neip config set llm-api-key sk-xxx' },
      { command: 'neip config get <key>', description: 'Get a configuration value', descriptionTh: 'ดูค่า configuration' },
      { command: 'neip config list', description: 'List all config values', descriptionTh: 'แสดง configuration ทั้งหมด' },
      { command: 'neip config unset <key>', description: 'Remove a configuration key', descriptionTh: 'ลบ configuration key' },
    ],
  },
  {
    name: 'Organisation Management',
    commands: [
      { command: 'neip org create <name>', description: 'Create a new organisation', descriptionTh: 'สร้างองค์กรใหม่', flags: '--business-type <type>', example: 'neip org create "บริษัท ทดสอบ จำกัด" --business-type sme' },
      { command: 'neip org list', description: 'Show your current organisation', descriptionTh: 'แสดงองค์กรปัจจุบัน' },
      { command: 'neip org switch <id>', description: 'Set the active organisation', descriptionTh: 'เปลี่ยนองค์กร' },
    ],
  },
  {
    name: 'General Ledger (GL)',
    commands: [
      { command: 'neip gl accounts list', description: 'List chart of accounts', descriptionTh: 'แสดงผังบัญชี', flags: '--type, --search, --limit, --offset', example: 'neip gl accounts list --type asset --format json' },
      { command: 'neip gl accounts create', description: 'Create a new account', descriptionTh: 'สร้างบัญชีใหม่' },
      { command: 'neip gl journal create', description: 'Create a journal entry', descriptionTh: 'สร้างรายการบัญชี', flags: '--dry-run, --explain' },
      { command: 'neip gl journal list', description: 'List journal entries', descriptionTh: 'แสดงรายการบัญชี', flags: '--status, --limit, --offset' },
      { command: 'neip gl journal post <id>', description: 'Post a draft journal entry', descriptionTh: 'ผ่านรายการบัญชี' },
    ],
  },
  {
    name: 'Accounts Receivable (AR)',
    commands: [
      { command: 'neip ar invoice create', description: 'Create a new invoice', descriptionTh: 'สร้างใบแจ้งหนี้' },
      { command: 'neip ar invoice list', description: 'List invoices', descriptionTh: 'แสดงรายการใบแจ้งหนี้', flags: '--page, --status, --customer-id' },
      { command: 'neip ar invoice void <id>', description: 'Void an invoice', descriptionTh: 'ยกเลิกใบแจ้งหนี้' },
      { command: 'neip ar payment create', description: 'Record a customer payment', descriptionTh: 'บันทึกรับชำระเงิน' },
      { command: 'neip ar payment list', description: 'List payments', descriptionTh: 'แสดงรายการรับชำระ', flags: '--page, --customer-id, --status' },
      { command: 'neip ar so list', description: 'List sales orders', descriptionTh: 'แสดงใบสั่งขาย', flags: '--status, --customer-id' },
      { command: 'neip ar so create', description: 'Create a sales order', descriptionTh: 'สร้างใบสั่งขาย' },
      { command: 'neip ar so confirm <id>', description: 'Confirm a sales order', descriptionTh: 'ยืนยันใบสั่งขาย' },
      { command: 'neip ar do list', description: 'List delivery notes', descriptionTh: 'แสดงใบส่งของ', flags: '--status, --sales-order-id' },
      { command: 'neip ar do create', description: 'Create delivery note', descriptionTh: 'สร้างใบส่งของ' },
      { command: 'neip ar do deliver <id>', description: 'Mark as delivered', descriptionTh: 'บันทึกส่งของแล้ว' },
      { command: 'neip ar receipts list', description: 'List receipts', descriptionTh: 'แสดงใบเสร็จรับเงิน' },
      { command: 'neip ar receipts create', description: 'Issue a receipt', descriptionTh: 'ออกใบเสร็จ' },
      { command: 'neip ar cn list', description: 'List credit notes', descriptionTh: 'แสดงใบลดหนี้' },
      { command: 'neip ar cn create', description: 'Create a credit note', descriptionTh: 'สร้างใบลดหนี้' },
    ],
  },
  {
    name: 'Accounts Payable (AP)',
    commands: [
      { command: 'neip ap bill list', description: 'List bills', descriptionTh: 'แสดงรายการบิล', flags: '--status, --vendor-id' },
      { command: 'neip ap bill create', description: 'Create a bill', descriptionTh: 'สร้างบิล' },
      { command: 'neip ap bill post <id>', description: 'Post a bill', descriptionTh: 'ผ่านบิล' },
      { command: 'neip ap bill void <id>', description: 'Void a bill', descriptionTh: 'ยกเลิกบิล' },
      { command: 'neip ap payment create', description: 'Record a bill payment', descriptionTh: 'บันทึกจ่ายเงิน' },
      { command: 'neip ap po list', description: 'List purchase orders', descriptionTh: 'แสดงใบสั่งซื้อ', flags: '--status, --vendor-id' },
      { command: 'neip ap po create', description: 'Create a PO', descriptionTh: 'สร้างใบสั่งซื้อ' },
      { command: 'neip ap po send <id>', description: 'Send PO to vendor', descriptionTh: 'ส่งให้ผู้ขาย' },
      { command: 'neip ap po receive <id>', description: 'Record received goods', descriptionTh: 'บันทึกรับสินค้า' },
      { command: 'neip ap po convert <id>', description: 'Convert PO to bill', descriptionTh: 'แปลงเป็นบิล' },
    ],
  },
  {
    name: 'Quotations',
    commands: [
      { command: 'neip quotations list', description: 'List quotations', descriptionTh: 'แสดงใบเสนอราคา', flags: '--status, --customer-id' },
      { command: 'neip quotations create', description: 'Create a quotation', descriptionTh: 'สร้างใบเสนอราคา' },
      { command: 'neip quotations send <id>', description: 'Mark as sent', descriptionTh: 'ส่งให้ลูกค้า' },
      { command: 'neip quotations approve <id>', description: 'Approve quotation', descriptionTh: 'อนุมัติ' },
      { command: 'neip quotations convert <id>', description: 'Convert to invoice', descriptionTh: 'แปลงเป็นใบแจ้งหนี้' },
    ],
  },
  {
    name: 'Purchase Requisitions & RFQ',
    commands: [
      { command: 'neip pr list', description: 'List purchase requisitions', descriptionTh: 'แสดงใบขอซื้อ', flags: '--status, --limit' },
      { command: 'neip pr create', description: 'Create a PR', descriptionTh: 'สร้างใบขอซื้อ' },
      { command: 'neip pr approve <id>', description: 'Approve a PR', descriptionTh: 'อนุมัติใบขอซื้อ' },
      { command: 'neip pr convert <id>', description: 'Convert PR to PO', descriptionTh: 'แปลงเป็น PO' },
      { command: 'neip rfq list', description: 'List RFQs', descriptionTh: 'แสดง RFQ', flags: '--status, --limit' },
      { command: 'neip rfq create', description: 'Create an RFQ', descriptionTh: 'สร้าง RFQ' },
      { command: 'neip rfq send <id>', description: 'Send RFQ to vendors', descriptionTh: 'ส่ง RFQ' },
      { command: 'neip rfq compare <id>', description: 'Compare vendor responses', descriptionTh: 'เปรียบเทียบราคา' },
      { command: 'neip rfq select <id>', description: 'Select winning vendor', descriptionTh: 'เลือกผู้ขาย', flags: '--vendor <vendorId>', example: 'neip rfq select rfq_123 --vendor v_456' },
    ],
  },
  {
    name: 'Tax & WHT',
    commands: [
      { command: 'neip tax list', description: 'List tax rates', descriptionTh: 'แสดงอัตราภาษี' },
      { command: 'neip tax create', description: 'Create a tax rate', descriptionTh: 'สร้างอัตราภาษี' },
      { command: 'neip wht list', description: 'List WHT certificates', descriptionTh: 'แสดงใบหัก ณ ที่จ่าย', flags: '--status, --month, --year' },
      { command: 'neip wht create', description: 'Create WHT certificate', descriptionTh: 'สร้างใบหัก ณ ที่จ่าย' },
      { command: 'neip wht issue <id>', description: 'Issue certificate', descriptionTh: 'ออกใบหัก ณ ที่จ่าย' },
      { command: 'neip wht summary', description: 'Summary for ภ.ง.ด.3/53', descriptionTh: 'สรุปตามเดือน' },
    ],
  },
  {
    name: 'Financial Reports',
    commands: [
      { command: 'neip reports balance-sheet', description: 'Generate balance sheet', descriptionTh: 'งบดุล', flags: '--as-of <date>', example: 'neip reports balance-sheet --as-of 2026-03-31' },
      { command: 'neip reports income-statement', description: 'Generate income statement', descriptionTh: 'งบกำไรขาดทุน', flags: '--start-date, --end-date' },
      { command: 'neip reports trial-balance', description: 'Generate trial balance', descriptionTh: 'งบทดลอง', flags: '--as-of <date>' },
      { command: 'neip reports pnl', description: 'P&L comparison', descriptionTh: 'กำไรขาดทุนเปรียบเทียบ', flags: '--mode, --fiscal-year', example: 'neip reports pnl --mode yoy --fiscal-year 2026' },
      { command: 'neip reports vat-return', description: 'VAT return report (ภ.พ.30)', descriptionTh: 'แบบ ภ.พ.30', flags: '--year, --month', example: 'neip reports vat-return --year 2026 --month 3' },
      { command: 'neip reports cash-flow', description: 'Cash flow statement', descriptionTh: 'งบกระแสเงินสด', flags: '--year, --period' },
      { command: 'neip reports ar-aging', description: 'AR aging report', descriptionTh: 'รายงานอายุลูกหนี้', flags: '--as-of <date>' },
      { command: 'neip reports ap-aging', description: 'AP aging report', descriptionTh: 'รายงานอายุเจ้าหนี้', flags: '--as-of <date>' },
    ],
  },
  {
    name: 'HR & Payroll',
    commands: [
      { command: 'neip employees list', description: 'List employees', descriptionTh: 'แสดงพนักงาน', flags: '--status, --search', example: 'neip employees list --search "สมชาย"' },
      { command: 'neip employees create', description: 'Create employee', descriptionTh: 'เพิ่มพนักงาน' },
      { command: 'neip employees resign <id>', description: 'Process resignation', descriptionTh: 'บันทึกการลาออก', flags: '--date <date>' },
      { command: 'neip departments list', description: 'List departments', descriptionTh: 'แสดงแผนก' },
      { command: 'neip payroll list', description: 'List payroll runs', descriptionTh: 'แสดง payroll runs', flags: '--status' },
      { command: 'neip payroll create', description: 'Create payroll run', descriptionTh: 'สร้าง payroll run' },
      { command: 'neip payroll calculate <id>', description: 'Calculate payroll', descriptionTh: 'คำนวณเงินเดือน' },
      { command: 'neip payroll approve <id>', description: 'Approve payroll', descriptionTh: 'อนุมัติ payroll' },
      { command: 'neip payroll pay <id>', description: 'Mark as paid', descriptionTh: 'จ่ายเงินเดือน' },
      { command: 'neip leave list', description: 'List leave requests', descriptionTh: 'แสดงคำขอลา', flags: '--status' },
      { command: 'neip leave request', description: 'Submit leave request', descriptionTh: 'ยื่นคำขอลา' },
      { command: 'neip leave approve <id>', description: 'Approve leave', descriptionTh: 'อนุมัติ' },
      { command: 'neip attendance clock-in', description: 'Clock in', descriptionTh: 'ลงเวลาเข้า', flags: '--employee, --note' },
      { command: 'neip attendance clock-out', description: 'Clock out', descriptionTh: 'ลงเวลาออก' },
    ],
  },
  {
    name: 'Inventory & Products',
    commands: [
      { command: 'neip products list', description: 'List products', descriptionTh: 'แสดงสินค้า', flags: '--limit, --search', example: 'neip products list --search "laptop"' },
      { command: 'neip products create', description: 'Create a product', descriptionTh: 'สร้างสินค้า' },
      { command: 'neip inventory levels', description: 'Current stock levels', descriptionTh: 'ดูสต็อกปัจจุบัน' },
      { command: 'neip inventory low-stock', description: 'Products below minimum', descriptionTh: 'สินค้าต่ำกว่า minimum' },
      { command: 'neip stock-count list', description: 'List stock counts', descriptionTh: 'แสดงการตรวจนับ', flags: '--status' },
      { command: 'neip stock-count create', description: 'Create stock count', descriptionTh: 'สร้างการตรวจนับ' },
      { command: 'neip stock-count post <id>', description: 'Post adjustments', descriptionTh: 'บันทึกผลตรวจนับ' },
    ],
  },
  {
    name: 'Settings & System',
    commands: [
      { command: 'neip fiscal years', description: 'List fiscal years', descriptionTh: 'แสดงปีบัญชี' },
      { command: 'neip fiscal close-year <id>', description: 'Close fiscal year', descriptionTh: 'ปิดปีบัญชี' },
      { command: 'neip month-end close', description: 'Month-end close', descriptionTh: 'ปิดงวดสิ้นเดือน', flags: '--year, --period', example: 'neip month-end close --year 2026 --period 3' },
      { command: 'neip approval list', description: 'List approval requests', descriptionTh: 'แสดงรายการอนุมัติ', flags: '--status, --type' },
      { command: 'neip approval approve <id>', description: 'Approve a request', descriptionTh: 'อนุมัติ', flags: '--comment' },
      { command: 'neip dashboard', description: 'Executive dashboard', descriptionTh: 'ภาพรวมธุรกิจ' },
      { command: 'neip audit list', description: 'Audit log entries', descriptionTh: 'แสดง audit log', flags: '--limit' },
      { command: 'neip import upload <file>', description: 'Upload file for import', descriptionTh: 'นำเข้าข้อมูล' },
      { command: 'neip export run <type>', description: 'Export data', descriptionTh: 'ส่งออกข้อมูล', flags: '--output, --start-date', example: 'neip export run chart_of_accounts --output coa.csv' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function GroupSection({ group, filter }: { group: CliGroup; filter: string }) {
  const [open, setOpen] = useState(true);
  const filtered = useMemo(() => {
    if (!filter) return group.commands;
    const q = filter.toLowerCase();
    return group.commands.filter(
      (c) => c.command.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.descriptionTh.includes(q),
    );
  }, [group.commands, filter]);

  if (filtered.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg bg-gray-50 px-4 py-2 text-left font-semibold text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <Terminal className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="flex-1">{group.name}</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">{filtered.length}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-1 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Command</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Description</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Flags</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((cmd) => (
                <tr key={cmd.command} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-900 dark:bg-gray-700 dark:text-gray-100">
                      {cmd.command}
                    </code>
                    {cmd.example && (
                      <p className="mt-1 font-mono text-[10px] text-gray-400">{cmd.example}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    <p className="text-xs">{cmd.description}</p>
                    <p className="text-xs text-gray-400">{cmd.descriptionTh}</p>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{cmd.flags || '—'}</td>
                  <td className="px-2 py-2">
                    <CopyButton text={cmd.example || cmd.command} />
                  </td>
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
export default function CliDocsPage() {
  const [search, setSearch] = useState('');

  const totalCommands = useMemo(() => CLI_GROUPS.reduce((sum, g) => sum + g.commands.length, 0), []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar TOC */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-gray-200 p-4 lg:block dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Modules
        </p>
        <nav className="space-y-1">
          {CLI_GROUPS.map((g) => (
            <a
              key={g.name}
              href={`#${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="block rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              {g.name}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 px-6 py-8 lg:px-12">
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/docs" className="hover:text-gray-700 dark:hover:text-gray-200">Docs</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">CLI Reference</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">CLI Reference</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          คู่มืออ้างอิง CLI ฉบับสมบูรณ์ — {totalCommands} Commands | Version 0.9.0
        </p>

        {/* Global Flags */}
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Global Flags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { flag: '--format <table|json>', desc: 'Output format' },
              { flag: '--dry-run', desc: 'Preview without saving' },
              { flag: '--explain', desc: 'Show Dr/Cr breakdown' },
              { flag: '--non-interactive', desc: 'For CI/scripts' },
              { flag: '-v, --version', desc: 'Show version' },
              { flag: '--help', desc: 'Show help' },
            ].map((f) => (
              <span key={f.flag} className="rounded border border-gray-200 px-2 py-1 font-mono text-xs dark:border-gray-600">
                <span className="text-green-700 dark:text-green-400">{f.flag}</span>
                <span className="ml-1 text-gray-400">— {f.desc}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands... (e.g. invoice, payroll, ใบแจ้งหนี้)"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Command Groups */}
        <div className="mt-6 space-y-4">
          {CLI_GROUPS.map((g) => (
            <div key={g.name} id={g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>
              <GroupSection group={g} filter={search} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
