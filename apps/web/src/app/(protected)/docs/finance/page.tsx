'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, ChevronDown, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Table of Contents data
// ---------------------------------------------------------------------------
const tocSections = [
  { id: 'gl', label: '1. GL — General Ledger' },
  { id: 'ar', label: '2. AR — Accounts Receivable' },
  { id: 'ap', label: '3. AP — Accounts Payable' },
  { id: 'fi-aa', label: '4. FI-AA — Fixed Assets' },
  { id: 'fi-bl', label: '5. FI-BL — Bank & Reconciliation' },
  { id: 'wht', label: '6. WHT — Withholding Tax' },
  { id: 'tax-vat', label: '7. Tax & VAT' },
  { id: 'recurring-je', label: '8. Recurring Journal Entries' },
  { id: 'reports', label: '9. Financial Reports' },
  { id: 'common-errors', label: 'Common Errors' },
  { id: 'tips', label: 'Tips & Best Practices' },
];

// ---------------------------------------------------------------------------
// Reusable components
// ---------------------------------------------------------------------------

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>;
}

function InfoBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
      {title && <p className="mb-1 font-semibold text-blue-800 dark:text-blue-300">{title}</p>}
      <div className="text-sm text-blue-700 dark:text-blue-300">{children}</div>
    </div>
  );
}

function WarningBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/30">
      {title && <p className="mb-1 font-semibold text-yellow-800 dark:text-yellow-300">{title}</p>}
      <div className="text-sm text-yellow-700 dark:text-yellow-300">{children}</div>
    </div>
  );
}

function GlEntry({ title, rows }: { title: string; rows: { account: string; debit: string; credit: string }[] }) {
  return (
    <div className="my-4 overflow-hidden rounded-lg border border-[var(--color-border)]">
      <div className="bg-[var(--color-muted)] px-4 py-2 text-sm font-semibold">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
            <th className="px-4 py-2 text-left font-medium">Account</th>
            <th className="px-4 py-2 text-right font-medium">Debit (฿)</th>
            <th className="px-4 py-2 text-right font-medium">Credit (฿)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)]/30">
              <td className="px-4 py-2 font-mono text-xs">{r.account}</td>
              <td className="px-4 py-2 text-right font-mono text-xs">{r.debit}</td>
              <td className="px-4 py-2 text-right font-mono text-xs">{r.credit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusFlow({ steps }: { steps: { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' }[] }) {
  return (
    <div className="my-3 flex flex-wrap items-center gap-1">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <Badge color={s.color}>{s.label}</Badge>
          {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </span>
      ))}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--color-border)] last:border-0 even:bg-[var(--color-muted)]/30 hover:bg-[var(--color-muted)]/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="my-3 rounded-lg border border-[var(--color-border)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-[var(--color-muted)]/50"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
        {title}
      </button>
      {open && <div className="border-t border-[var(--color-border)] px-4 py-3">{children}</div>}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-sm">{children}</code>;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function FinanceManualPage() {
  const [filter, setFilter] = useState('');
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );
    for (const s of tocSections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const filteredToc = tocSections.filter((s) =>
    s.label.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6">
      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Docs
          </Link>
          <span>/</span>
          <span className="text-foreground">Finance Manual</span>
        </nav>

        <h1 className="mb-2 text-3xl font-bold">Finance Modules — User Manual</h1>
        <p className="mb-1 text-base text-muted-foreground">คู่มือการใช้งานระบบการเงิน nEIP</p>
        <p className="mb-8 text-sm text-muted-foreground">Version 0.9.0 | Last updated: 2026-04-12 | สำหรับนักบัญชี ผู้จัดการฝ่ายบัญชี และผู้ดูแลระบบ ERP</p>

        {/* ================================================================ */}
        {/* 1. GL */}
        {/* ================================================================ */}
        <section id="gl" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">1. GL — General Ledger / บัญชีแยกประเภท</h2>

          <h3 className="mb-3 text-xl font-semibold">1.1 Overview / ภาพรวม</h3>
          <p className="mb-3 text-sm">General Ledger (GL) เป็นหัวใจของระบบบัญชี nEIP ประกอบด้วย 4 sub-modules:</p>
          <DataTable
            headers={['Sub-module', 'หน้าที่']}
            rows={[
              ['Chart of Accounts (CoA)', 'ผังบัญชี — สร้าง/แก้ไข/ปิดบัญชี'],
              ['Journal Entries (JE)', 'สมุดรายวัน — บันทึก/ผ่านรายการ/กลับรายการ'],
              ['Fiscal Year & Periods', 'ปีบัญชี/งวดบัญชี — เปิด/ปิดงวด, Year-End Closing'],
              ['Budgets', 'งบประมาณรายบัญชี/รายปี'],
            ]}
          />
          <p className="mb-4 text-sm"><strong>ผู้ใช้งาน:</strong> นักบัญชี (Accountant), ผู้ตรวจสอบ (Auditor), ผู้จัดการฝ่ายบัญชี (Finance Manager)</p>

          <h3 className="mb-3 text-xl font-semibold">1.2 Screens / หน้าจอ</h3>
          <DataTable
            headers={['หน้าจอ', 'Path', 'คำอธิบาย']}
            rows={[
              ['Chart of Accounts', '/accounts', 'แสดงรายการบัญชีทั้งหมด กรองตามประเภท'],
              ['Journal Entries List', '/journal-entries', 'รายการสมุดรายวันทั้งหมด กรองตาม status/ปี'],
              ['New Journal Entry', '/journal-entries/new', 'สร้างใบบันทึกรายวันใหม่'],
              ['Budgets', '/budgets', 'จัดการงบประมาณรายบัญชี'],
              ['Fiscal Year Settings', '/settings/fiscal', 'ตั้งค่าปีบัญชี เปิด/ปิดงวด'],
              ['Recurring JE', '/recurring-je', 'แม่แบบรายการอัตโนมัติ'],
              ['Month-End Closing', '/month-end', 'ปิดงวดบัญชีประจำเดือน'],
            ]}
          />

          <Collapsible title="1.3 Chart of Accounts / ผังบัญชี" defaultOpen>
            <h4 className="mb-2 text-base font-semibold">Account Types / ประเภทบัญชี</h4>
            <DataTable
              headers={['Type', 'รหัส', 'ตัวอย่าง']}
              rows={[
                ['asset (สินทรัพย์)', '1xxx', 'เงินสด (1010), ลูกหนี้ (1100), สินค้าคงคลัง (1200)'],
                ['liability (หนี้สิน)', '2xxx', 'เจ้าหนี้ (2100), ภาษีขาย (2110)'],
                ['equity (ส่วนของเจ้าของ)', '3xxx', 'ทุน (3100), กำไรสะสม (3200)'],
                ['revenue (รายได้)', '4xxx', 'รายได้จากขาย (4000)'],
                ['expense (ค่าใช้จ่าย)', '5xxx', 'ต้นทุนขาย (5100), ค่าเสื่อม (5500)'],
              ]}
            />

            <h4 className="mb-2 mt-4 text-base font-semibold">Step-by-Step: สร้างบัญชีใหม่</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>ไปที่ <strong>Accounts</strong> (<Code>/accounts</Code>)</li>
              <li>กดปุ่ม <strong>&quot;+ New Account&quot;</strong></li>
              <li>กรอกข้อมูล: Code, Name (TH/EN), Account Type, Parent Account (optional)</li>
              <li>กด <strong>Save</strong></li>
            </ol>

            <h4 className="mb-2 text-base font-semibold">Field Reference</h4>
            <DataTable
              headers={['Field', 'Type', 'Required', 'Description']}
              rows={[
                ['code', 'string (1-20)', 'Yes', 'รหัสบัญชี ต้องไม่ซ้ำ'],
                ['nameTh', 'string (1-255)', 'Yes', 'ชื่อบัญชีภาษาไทย'],
                ['nameEn', 'string (1-255)', 'Yes', 'ชื่อบัญชีภาษาอังกฤษ'],
                ['accountType', 'enum', 'Yes', 'asset, liability, equity, revenue, expense'],
                ['parentId', 'UUID', 'No', 'ID ของบัญชีแม่'],
                ['isActive', 'boolean', '—', 'สถานะ (default: true)'],
              ]}
            />

            <h4 className="mb-2 mt-4 text-base font-semibold">Business Rules</h4>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>รหัสบัญชี (<Code>code</Code>) ต้องไม่ซ้ำกันภายใน organization เดียวกัน</li>
              <li><strong>ลบบัญชี = Soft-delete</strong> (ตั้ง <Code>isActive = false</Code>) — ไม่ลบข้อมูลจริง</li>
              <li>ห้ามลบบัญชีที่มีรายการใน Journal Entry Lines (return 409 Conflict)</li>
              <li>การแก้ไข account type ไม่ได้หลังจากสร้างแล้ว</li>
            </ul>
          </Collapsible>

          <Collapsible title="1.4 Journal Entries / สมุดรายวัน" defaultOpen>
            <h4 className="mb-2 text-base font-semibold">Status Flow</h4>
            <StatusFlow steps={[
              { label: 'draft', color: 'gray' },
              { label: 'posted', color: 'green' },
              { label: 'reversed', color: 'red' },
            ]} />
            <p className="mb-3 text-xs text-muted-foreground">Reversal สร้าง JE ใหม่ สถานะ posted ทันที</p>

            <h4 className="mb-2 text-base font-semibold">Step-by-Step: สร้างและผ่านรายการบันทึก</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>ไปที่ <strong>Journal Entries</strong> (<Code>/journal-entries</Code>) &rarr; กด <strong>&quot;+ New&quot;</strong></li>
              <li>กรอก: Description, Fiscal Year, Fiscal Period (1-12)</li>
              <li>เพิ่ม <strong>Lines</strong> (อย่างน้อย 2 บรรทัด): เลือก Account, ใส่ Debit/Credit</li>
              <li>กด <strong>Save</strong> &mdash; สถานะ: <Badge color="gray">draft</Badge></li>
              <li>ตรวจสอบ แล้วกด <strong>Post</strong> &mdash; สถานะ: <Badge color="green">posted</Badge></li>
            </ol>

            <GlEntry
              title="JE-2026-0001: รับชำระค่าสินค้า"
              rows={[
                { account: '1010 Cash', debit: '10,700.00', credit: '' },
                { account: '4000 Revenue', debit: '', credit: '10,000.00' },
                { account: '2110 VAT Payable', debit: '', credit: '700.00' },
              ]}
            />

            <h4 className="mb-2 text-base font-semibold">Step-by-Step: กลับรายการ (Reverse Entry)</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>ไปที่รายการ JE ที่ต้องการกลับ (สถานะ <Badge color="green">posted</Badge>)</li>
              <li>กด <strong>Reverse</strong> &mdash; ระบบเปลี่ยนสถานะเป็น <Badge color="red">reversed</Badge> และสร้าง JE ใหม่สลับ Dr/Cr</li>
            </ol>

            <h4 className="mb-2 text-base font-semibold">Field Reference</h4>
            <DataTable
              headers={['Field', 'Type', 'Required', 'Description']}
              rows={[
                ['description', 'string (1-500)', 'Yes', 'คำอธิบายรายการ'],
                ['fiscalYear', 'integer (2000+)', 'Yes', 'ปีบัญชี'],
                ['fiscalPeriod', 'integer (1-12)', 'Yes', 'งวดบัญชี'],
                ['lines', 'array (min 2)', 'Yes', 'รายการ Dr/Cr'],
                ['lines[].accountId', 'UUID', 'Yes', 'ID บัญชีจาก CoA'],
                ['lines[].debitSatang', 'string (bigint)', 'Yes', 'จำนวนเงินเดบิต (สตางค์)'],
                ['lines[].creditSatang', 'string (bigint)', 'Yes', 'จำนวนเงินเครดิต (สตางค์)'],
              ]}
            />

            <h4 className="mb-2 mt-4 text-base font-semibold">Business Rules</h4>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li><strong>ยอดเดบิตต้องเท่ากับเครดิต</strong> &mdash; <Code>totalDebit === totalCredit</Code></li>
              <li>ยอดต้องมากกว่า 0</li>
              <li>บัญชีที่อ้างอิงต้อง <Code>isActive = true</Code> ใน CoA</li>
              <li>ห้ามสร้าง/ผ่านรายการในงวดที่ปิดแล้ว</li>
              <li>ส่ง <Code>X-Idempotency-Key</Code> header เพื่อป้องกันการสร้างซ้ำ</li>
            </ul>
          </Collapsible>

          <Collapsible title="1.5 Fiscal Year & Periods / ปีบัญชีและงวดบัญชี">
            <h4 className="mb-2 text-base font-semibold">สร้างปีบัญชี</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>ไปที่ <strong>Settings &gt; Fiscal Year</strong> (<Code>/settings/fiscal</Code>)</li>
              <li>กด <strong>&quot;Create Fiscal Year&quot;</strong></li>
              <li>กรอก: Year, Start Date, End Date</li>
              <li>กด <strong>Save</strong> &mdash; ระบบสร้าง 12 งวดบัญชีอัตโนมัติ</li>
            </ol>

            <h4 className="mb-2 text-base font-semibold">ปิดงวดบัญชี (Close Period)</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>เลือกปีบัญชี &rarr; คลิก <strong>Close</strong> ที่งวดที่ต้องการ</li>
              <li>เมื่อปิดแล้ว ไม่สามารถสร้าง/ผ่าน/กลับรายการ JE ในงวดนั้น</li>
              <li>สามารถ <strong>Reopen</strong> ได้หากต้องแก้ไข</li>
            </ol>

            <h4 className="mb-2 text-base font-semibold">Year-End Closing / ปิดบัญชีสิ้นปี</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>ตรวจสอบว่า <strong>ทุก 12 งวดปิดแล้ว</strong></li>
              <li>กด <strong>Close Year</strong> &mdash; ระบบคำนวณยอด Revenue &amp; Expense ทั้งหมด</li>
              <li>ระบบสร้าง <strong>Closing JE</strong> อัตโนมัติ: Dr Revenue, Cr Expense, Dr/Cr Retained Earnings</li>
            </ol>

            <GlEntry
              title="Year-End Closing JE for FY 2026"
              rows={[
                { account: '4000 Revenue (ล้างรายได้)', debit: '1,000,000', credit: '' },
                { account: '5100 COGS (ล้างค่าใช้จ่าย)', debit: '', credit: '600,000' },
                { account: '5500 Depreciation', debit: '', credit: '50,000' },
                { account: '3200 Retained Earnings (กำไรสุทธิ)', debit: '', credit: '350,000' },
              ]}
            />

            <InfoBox>
              <strong>Reopen Year:</strong> สามารถ Reopen ปีที่ปิดแล้วเพื่อแก้ไข &mdash; ระบบจะ Reverse Closing JE อัตโนมัติ
            </InfoBox>
          </Collapsible>

          <Collapsible title="1.6 Budgets / งบประมาณ">
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>ไปที่ <strong>Budgets</strong> (<Code>/budgets</Code>)</li>
              <li>กด <strong>&quot;+ New Budget&quot;</strong></li>
              <li>เลือก Account + Fiscal Year, ใส่ Amount (สตางค์)</li>
              <li>กด <strong>Save</strong></li>
            </ol>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li><strong>1 account + 1 year = 1 budget</strong> (ห้ามซ้ำ)</li>
              <li>ดูรายงาน Budget Variance ได้ที่ <Code>/reports/budget-variance</Code></li>
            </ul>
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 2. AR */}
        {/* ================================================================ */}
        <section id="ar" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">2. AR — Accounts Receivable / ลูกหนี้การค้า</h2>

          <h3 className="mb-3 text-xl font-semibold">2.1 Overview</h3>
          <p className="mb-4 text-sm">ระบบ AR จัดการวงจรรายได้ตั้งแต่ออกใบแจ้งหนี้ (Invoice) จนถึงรับชำระเงิน (Payment) รองรับ VAT 7% อัตโนมัติ และ e-Tax Invoice</p>

          <h3 className="mb-3 text-xl font-semibold">2.2 Screens</h3>
          <DataTable
            headers={['หน้าจอ', 'Path', 'คำอธิบาย']}
            rows={[
              ['Invoice List', '/invoices', 'รายการใบแจ้งหนี้ทั้งหมด'],
              ['New Invoice', '/invoices/new', 'สร้างใบแจ้งหนี้ใหม่'],
              ['Payment List', '/payments', 'รายการรับชำระทั้งหมด'],
              ['Receipt List', '/receipts', 'รายการใบเสร็จ'],
              ['Credit Notes', '/credit-notes', 'ใบลดหนี้'],
              ['Dunning', '/dunning', 'ระบบติดตามหนี้'],
              ['AR Aging Report', '/reports/ar-aging', 'รายงานอายุลูกหนี้'],
            ]}
          />

          <Collapsible title="2.3 Invoices / ใบแจ้งหนี้" defaultOpen>
            <h4 className="mb-2 text-base font-semibold">Invoice Status Flow</h4>
            <StatusFlow steps={[
              { label: 'draft', color: 'gray' },
              { label: 'posted', color: 'blue' },
              { label: 'sent', color: 'purple' },
              { label: 'partial', color: 'yellow' },
              { label: 'paid', color: 'green' },
            ]} />
            <p className="mb-3 text-xs text-muted-foreground">draft/posted สามารถ void ได้ (posted จะสร้าง reversal JE)</p>

            <h4 className="mb-2 text-base font-semibold">Step-by-Step: สร้างและผ่านใบแจ้งหนี้</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>ไปที่ <strong>Invoices</strong> &rarr; กด <strong>&quot;+ New&quot;</strong></li>
              <li>เลือก Customer, กำหนด Due Date</li>
              <li>เพิ่ม Line Items: Description, Quantity, Unit Price, Account</li>
              <li>กด <strong>Save</strong> &rarr; กด <strong>Post</strong></li>
            </ol>

            <GlEntry
              title="Invoice Posted: INV-2026-0001"
              rows={[
                { account: '1100 AR', debit: 'grandTotal', credit: '' },
                { account: '4000 Revenue', debit: '', credit: 'lineTotal' },
                { account: '2110 VAT Payable', debit: '', credit: '7% of subTotal' },
              ]}
            />

            <InfoBox title="VAT Calculation">
              <p><Code>subTotal * 700 / 10000</Code> (round half-up) | Grand Total = subTotal + VAT 7%</p>
            </InfoBox>

            <h4 className="mb-2 text-base font-semibold">Void ใบแจ้งหนี้</h4>
            <WarningBox>
              <strong>ห้าม void ถ้ามี payment ที่ยังไม่ได้ void</strong> — ต้อง void payment ก่อน แล้วจึง void invoice
            </WarningBox>

            <h4 className="mb-2 text-base font-semibold">e-Tax Invoice / ใบกำกับภาษีอิเล็กทรอนิกส์</h4>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>API: <Code>GET /api/v1/invoices/:id/e-tax</Code></li>
              <li>ต้อง Post ใบแจ้งหนี้ก่อน</li>
              <li>รูปแบบตาม e-Tax Invoice ของกรมสรรพากร (Document Type Code: T02)</li>
            </ul>
          </Collapsible>

          <Collapsible title="2.4 Payments / การรับชำระ">
            <h4 className="mb-2 text-base font-semibold">Payment Status Flow</h4>
            <StatusFlow steps={[
              { label: 'unmatched', color: 'gray' },
              { label: 'matched', color: 'green' },
            ]} />
            <p className="mb-3 text-xs text-muted-foreground">unmatched สามารถ void ได้ (+ reversal JE)</p>

            <h4 className="mb-2 text-base font-semibold">Payment Methods</h4>
            <DataTable
              headers={['Method', 'คำอธิบาย']}
              rows={[
                ['cash', 'เงินสด'],
                ['bank_transfer', 'โอนธนาคาร'],
                ['cheque', 'เช็ค'],
                ['promptpay', 'พร้อมเพย์'],
              ]}
            />

            <h4 className="mb-2 text-base font-semibold">Step-by-Step: บันทึกรับชำระ</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>ไปที่ <strong>Payments</strong> &rarr; กด <strong>&quot;+ New&quot;</strong></li>
              <li>กรอก: Amount, Payment Date, Method, Customer, Invoice, Reference</li>
              <li>กด <strong>Save</strong></li>
            </ol>

            <GlEntry
              title="AR Payment Received: PMT-2026-0001"
              rows={[
                { account: '1010 Cash/Bank', debit: 'amount', credit: '' },
                { account: '1100 AR', debit: '', credit: 'amount' },
              ]}
            />

            <h4 className="mb-2 mt-4 text-base font-semibold">Business Rules</h4>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li><strong>ห้าม overpay</strong>: จำนวนชำระต้อง &le; ยอดคงค้าง (grandTotal - paidSatang)</li>
              <li>ยอดคงค้างคำนวณจาก <strong>grandTotal</strong> (subTotal + VAT 7%)</li>
              <li>Void Payment จะ reverse JE + อัพเดทสถานะ Invoice กลับ</li>
            </ul>
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 3. AP */}
        {/* ================================================================ */}
        <section id="ap" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">3. AP — Accounts Payable / เจ้าหนี้การค้า</h2>

          <h3 className="mb-3 text-xl font-semibold">3.1 Overview</h3>
          <p className="mb-4 text-sm">ระบบ AP จัดการวงจรค่าใช้จ่ายตั้งแต่บันทึก Bill จนถึงจ่ายชำระ (Bill Payment) รวมถึง 3-Way Matching กับ Purchase Order</p>

          <Collapsible title="3.3 Vendors / ผู้ขาย">
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>ไปที่ <strong>Vendors</strong> (<Code>/vendors</Code>)</li>
              <li>กด <strong>&quot;+ New Vendor&quot;</strong></li>
              <li>กรอก: Name, Tax ID, Address</li>
              <li>กด <strong>Save</strong></li>
            </ol>
          </Collapsible>

          <Collapsible title="3.4 Bills / ใบแจ้งหนี้จากผู้ขาย" defaultOpen>
            <h4 className="mb-2 text-base font-semibold">Bill Status Flow</h4>
            <StatusFlow steps={[
              { label: 'draft', color: 'gray' },
              { label: 'posted', color: 'blue' },
              { label: 'partial', color: 'yellow' },
              { label: 'paid', color: 'green' },
            ]} />
            <p className="mb-3 text-xs text-muted-foreground">draft/posted สามารถ void ได้</p>

            <h4 className="mb-2 text-base font-semibold">Step-by-Step: สร้างและจ่าย Bill</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>ไปที่ <strong>Bills</strong> &rarr; กด <strong>&quot;+ New&quot;</strong></li>
              <li>เลือก Vendor + Due Date</li>
              <li>เพิ่ม Line Items: Description, Amount, Account</li>
              <li>Save &rarr; Post &rarr; Pay</li>
            </ol>

            <h4 className="mb-2 text-base font-semibold">Field Reference</h4>
            <DataTable
              headers={['Field', 'Type', 'Required', 'Description']}
              rows={[
                ['vendorId', 'UUID', 'Yes', 'ID ผู้ขาย'],
                ['dueDate', 'date', 'Yes', 'วันครบกำหนดชำระ'],
                ['lines[].description', 'string', 'Yes', 'รายละเอียด'],
                ['lines[].amountSatang', 'string (bigint)', 'Yes', 'จำนวนเงิน (สตางค์)'],
                ['lines[].accountId', 'UUID', 'Yes', 'บัญชีค่าใช้จ่าย/สินทรัพย์'],
              ]}
            />
          </Collapsible>

          <Collapsible title="3.5 Bill Payments / การจ่ายชำระ">
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>เลือก Bill ที่สถานะ <Badge color="blue">posted</Badge></li>
              <li>กด <strong>&quot;Record Payment&quot;</strong></li>
              <li>กรอก: Amount, Payment Date, Method, Reference</li>
              <li>กด <strong>Save</strong></li>
            </ol>
            <DataTable
              headers={['Scenario', 'Bill Status']}
              rows={[
                ['จ่ายบางส่วน', 'partial'],
                ['จ่ายครบ (paidSatang >= totalSatang)', 'paid'],
              ]}
            />
            <WarningBox><strong>ห้ามจ่ายเกิน:</strong> currentPaid + paymentAmount &le; totalSatang</WarningBox>
          </Collapsible>

          <Collapsible title="3.6 Three-Way Matching / การตรวจสอบ 3 ทาง">
            <p className="mb-3 text-sm">3-Way Match เปรียบเทียบข้อมูลจาก: <strong>PO</strong> (สั่งอะไร), <strong>GR</strong> (รับจริง), <strong>Bill</strong> (แจ้งเก็บเงิน)</p>
            <DataTable
              headers={['Status', 'ความหมาย']}
              rows={[
                ['matched', 'PO/GR/Bill ตรงกัน — จ่ายได้'],
                ['quantity_mismatch', 'จำนวนรับ (GR) ไม่ตรงกับ PO'],
                ['price_mismatch', 'ราคา Bill ไม่ตรงกับ PO'],
                ['unmatched', 'Bill มี line ที่ไม่มีใน PO'],
                ['no_po', 'Bill ไม่ได้เชื่อมกับ PO'],
                ['overridden', 'ผู้มีอำนาจอนุมัติให้ผ่าน (override)'],
              ]}
            />
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 4. FI-AA Fixed Assets */}
        {/* ================================================================ */}
        <section id="fi-aa" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">4. FI-AA — Fixed Assets / สินทรัพย์ถาวร</h2>

          <p className="mb-4 text-sm">ระบบสินทรัพย์ถาวร จัดการตั้งแต่ซื้อ คำนวณค่าเสื่อมราคา ไปจนถึงจำหน่ายสินทรัพย์</p>

          <h3 className="mb-3 text-xl font-semibold">Asset Categories</h3>
          <DataTable
            headers={['Category', 'Thai', 'ตัวอย่าง']}
            rows={[
              ['land', 'ที่ดิน', 'ที่ดินโรงงาน'],
              ['building', 'อาคาร', 'สำนักงาน, คลังสินค้า'],
              ['equipment', 'เครื่องจักร/อุปกรณ์', 'เครื่อง CNC, เครื่องพิมพ์'],
              ['vehicle', 'ยานพาหนะ', 'รถบรรทุก, รถยนต์'],
              ['furniture', 'เฟอร์นิเจอร์', 'โต๊ะ, เก้าอี้, ชั้นวาง'],
              ['it_equipment', 'อุปกรณ์ IT', 'คอมพิวเตอร์, เซิร์ฟเวอร์'],
              ['other', 'อื่นๆ', '—'],
            ]}
          />

          <h3 className="mb-3 text-xl font-semibold">Status Flow</h3>
          <StatusFlow steps={[
            { label: 'active', color: 'green' },
            { label: 'disposed / written_off', color: 'red' },
          ]} />

          <h3 className="mb-3 text-xl font-semibold">Depreciation Methods</h3>
          <DataTable
            headers={['Method', 'สูตร', 'ใช้กับ']}
            rows={[
              ['straight_line', '(Cost - Salvage) / usefulLifeMonths', 'สินทรัพย์ทั่วไป'],
              ['declining_balance', '2 / usefulLifeMonths * NBV', 'เสื่อมเร็วช่วงแรก'],
            ]}
          />

          <Collapsible title="Monthly Depreciation GL Entry">
            <GlEntry
              title="Monthly Depreciation: EQ-001 (2026-03-31)"
              rows={[
                { account: '5500 Depreciation Expense', debit: 'amount', credit: '' },
                { account: '1500 Accumulated Depr.', debit: '', credit: 'amount' },
              ]}
            />
          </Collapsible>

          <Collapsible title="Asset Disposal GL Entry">
            <GlEntry
              title="Disposal of asset: EQ-001"
              rows={[
                { account: 'Fixed Asset GL Account', debit: '', credit: 'Cost' },
                { account: 'Accumulated Depr. Account', debit: 'accumDep', credit: '' },
                { account: 'Gain on Disposal', debit: '', credit: 'gain' },
              ]}
            />
            <p className="text-sm"><strong>Gain/Loss</strong> = ราคาขาย - NBV</p>
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 5. FI-BL Bank */}
        {/* ================================================================ */}
        <section id="fi-bl" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">5. FI-BL — Bank &amp; Reconciliation / ธนาคารและกระทบยอด</h2>

          <p className="mb-4 text-sm">ระบบจัดการบัญชีธนาคาร นำเข้า statement กระทบยอดกับ GL อัตโนมัติ</p>

          <DataTable
            headers={['หน้าจอ', 'Path', 'คำอธิบาย']}
            rows={[
              ['Bank Account List', '/bank', 'รายการบัญชีธนาคาร'],
              ['Bank Detail', '/bank/[id]', 'รายละเอียด + รายการล่าสุด'],
              ['Bank Matching', '/bank/matching', 'กระทบยอดอัตโนมัติ'],
            ]}
          />

          <Collapsible title="Bank Statement CSV Import">
            <p className="mb-2 text-sm">อัพโหลดไฟล์ CSV รูปแบบ:</p>
            <pre className="mb-4 overflow-x-auto rounded-lg bg-[var(--color-muted)] p-4 font-mono text-xs">
{`date,description,debit,credit,reference
2026-01-15,รับโอน ABC,0,50000,REF001
2026-01-16,จ่ายค่าไฟ,3500,0,ELC-2026`}
            </pre>
          </Collapsible>

          <Collapsible title="Auto-Reconcile Matching Rules">
            <DataTable
              headers={['Type', 'คำอธิบาย', 'ตัวอย่าง']}
              rows={[
                ['exact_amount', 'จับคู่ตามจำนวนเงินตรง', 'pattern: "5000000" (50,000 บาท)'],
                ['reference', 'จับคู่ตาม reference/description', 'pattern: "ค่าเช่า"'],
                ['amount_range', 'จับคู่ตามช่วงจำนวนเงิน', 'min: 100000, max: 200000'],
              ]}
            />
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 6. WHT */}
        {/* ================================================================ */}
        <section id="wht" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">6. WHT — Withholding Tax / ภาษีหัก ณ ที่จ่าย</h2>

          <p className="mb-4 text-sm">ระบบจัดการใบหัก ณ ที่จ่าย (ภ.ง.ด.3 สำหรับบุคคลธรรมดา / ภ.ง.ด.53 สำหรับนิติบุคคล) และ 50 ทวิ</p>

          <DataTable
            headers={['Type', 'Thai', 'ใช้กับ']}
            rows={[
              ['pnd3', 'ภ.ง.ด.3', 'บุคคลธรรมดา (Tax ID ไม่ขึ้นต้นด้วย \'0\')'],
              ['pnd53', 'ภ.ง.ด.53', 'นิติบุคคล (Tax ID ขึ้นต้นด้วย \'0\')'],
            ]}
          />

          <h3 className="mb-3 text-xl font-semibold">Status Flow</h3>
          <StatusFlow steps={[
            { label: 'draft', color: 'gray' },
            { label: 'issued', color: 'blue' },
            { label: 'filed', color: 'green' },
          ]} />
          <WarningBox><strong>ห้าม void ใบที่ filed แล้ว</strong> (ยื่นกรมสรรพากรแล้ว)</WarningBox>

          <Collapsible title="WHT Calculation">
            <pre className="mb-3 overflow-x-auto rounded-lg bg-[var(--color-muted)] p-4 font-mono text-xs">
{`WHT Amount = Income Amount * WHT Rate / 10000 (round half-up)
ตัวอย่าง: 100,000 บาท * 300bp = 3,000 บาท`}
            </pre>
          </Collapsible>

          <Collapsible title="50 ทวิ — Annual Tax Certificate">
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>API: <Code>POST /api/v1/wht/annual-certificate</Code></li>
              <li>Web: <Code>/wht/annual-certificate</Code></li>
              <li>ระบุ: Employee ID + Tax Year</li>
              <li>ระบบ aggregate ยอดจาก Payroll ทั้งปี</li>
            </ul>
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 7. Tax & VAT */}
        {/* ================================================================ */}
        <section id="tax-vat" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">7. Tax &amp; VAT / อัตราภาษีและ VAT Return</h2>

          <h3 className="mb-3 text-xl font-semibold">Tax Rates / อัตราภาษี</h3>
          <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
            <li>ไปที่ <strong>Settings &gt; Tax</strong> (<Code>/settings/tax</Code>)</li>
            <li>กด <strong>&quot;+ New Tax Rate&quot;</strong></li>
            <li>กรอก: Tax Type (vat/wht), Rate (Basis Points), Income Type, Effective From</li>
            <li>กด <strong>Save</strong></li>
          </ol>

          <InfoBox>
            <strong>Default VAT Rate:</strong> nEIP ใช้ 7% (700 basis points) เป็น hardcoded ใน Invoice/AR
          </InfoBox>

          <h3 className="mb-3 text-xl font-semibold">VAT Return Report / ภ.พ.30</h3>
          <p className="text-sm">Web: <Code>/reports/vat-return</Code> &mdash; แสดงสรุป VAT สำหรับการยื่น ภ.พ.30 ต่อกรมสรรพากร</p>
        </section>

        {/* ================================================================ */}
        {/* 8. Recurring JE */}
        {/* ================================================================ */}
        <section id="recurring-je" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">8. Recurring Journal Entries / รายการบันทึกอัตโนมัติ</h2>

          <p className="mb-4 text-sm">สร้างแม่แบบ (Template) สำหรับ JE ที่เกิดซ้ำ เช่น ค่าเช่ารายเดือน ค่าเสื่อมราคา</p>

          <DataTable
            headers={['Frequency', 'คำอธิบาย']}
            rows={[
              ['monthly', 'ทุกเดือน'],
              ['quarterly', 'ทุก 3 เดือน'],
              ['annually', 'ทุกปี'],
            ]}
          />

          <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
            <li>ไปที่ <strong>Recurring JE</strong> (<Code>/recurring-je</Code>) &rarr; กด <strong>&quot;+ New Template&quot;</strong></li>
            <li>กรอก: Description, Frequency, Next Run Date, Lines (ต้อง balance)</li>
            <li>กด <strong>Save</strong></li>
            <li>เมื่อถึงวัน กด <strong>&quot;Run&quot;</strong> &mdash; ระบบสร้าง JE posted + เลื่อน nextRunDate</li>
          </ol>

          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>Max 50 templates per batch run (rate limit: 5 runs/minute)</li>
            <li>Delete = soft-deactivate (<Code>isActive = false</Code>)</li>
          </ul>
        </section>

        {/* ================================================================ */}
        {/* 9. Reports */}
        {/* ================================================================ */}
        <section id="reports" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">9. Financial Reports / รายงานทางการเงิน</h2>

          <DataTable
            headers={['Report', 'Path', 'คำอธิบาย']}
            rows={[
              ['Balance Sheet', '/reports/balance-sheet', 'งบดุล — สินทรัพย์ = หนี้สิน + ส่วนของเจ้าของ'],
              ['Income Statement', '/reports/income-statement', 'งบกำไรขาดทุน'],
              ['P&L', '/reports/pnl', 'กำไรขาดทุนเปรียบเทียบ'],
              ['Trial Balance', '/reports/trial-balance', 'งบทดลอง'],
              ['Budget Variance', '/reports/budget-variance', 'งบประมาณ vs จริง'],
              ['Equity Changes', '/reports/equity-changes', 'งบแสดงการเปลี่ยนแปลงส่วนของเจ้าของ'],
              ['Cash Flow', '/reports/cash-flow', 'งบกระแสเงินสด'],
              ['AR Aging', '/reports/ar-aging', 'รายงานอายุลูกหนี้'],
              ['AP Aging', '/reports/ap-aging', 'รายงานอายุเจ้าหนี้'],
              ['VAT Return', '/reports/vat-return', 'รายงาน ภ.พ.30'],
              ['SSC Filing', '/reports/ssc-filing', 'รายงานประกันสังคม'],
              ['Custom Reports', '/reports/custom', 'รายงานที่กำหนดเอง'],
            ]}
          />

          <h3 className="mb-3 text-xl font-semibold">Report Parameters</h3>
          <DataTable
            headers={['Parameter', 'Type', 'Description']}
            rows={[
              ['fiscalYear', 'integer', 'ปีบัญชี'],
              ['period', 'integer (1-12)', 'งวดบัญชี'],
              ['asOfDate', 'date', 'วันที่ ณ วันที่ (สำหรับ Balance Sheet)'],
            ]}
          />

          <InfoBox title="Money Format">
            <p>ทุกจำนวนเงินใช้ Money Value Object: <Code>{`{ amountSatang: "10700000", currency: "THB" }`}</Code></p>
            <p>1 บาท = 100 สตางค์ | 107,000 บาท = &quot;10700000&quot; สตางค์</p>
          </InfoBox>
        </section>

        {/* ================================================================ */}
        {/* Common Errors */}
        {/* ================================================================ */}
        <section id="common-errors" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">Common Errors &amp; Solutions</h2>

          <DataTable
            headers={['Error', 'สาเหตุ', 'แก้ไข']}
            rows={[
              ['Debits and credits must balance', 'ยอด Dr ไม่เท่า Cr', 'ตรวจสอบจำนวนเงินทุก line'],
              ['Fiscal period is closed', 'งวดบัญชีปิดแล้ว', 'Reopen period ก่อน หรือใช้งวดอื่น'],
              ['Account not found in CoA', 'บัญชีไม่อยู่ในผังหรือ inactive', 'ตรวจสอบ account ID / สร้างบัญชีใหม่'],
              ['Account is referenced by JE lines', 'ลบบัญชีที่มีรายการ', 'Deactivate แทนลบ'],
              ['Overpayment', 'ชำระเกินยอดคงค้าง', 'ตรวจสอบยอดรวม VAT (grandTotal)'],
              ['Invoice has payments — void first', 'Void invoice ที่มี payment', 'Void payment ก่อน แล้ว void invoice'],
              ['Cannot post: accounts not found', 'ไม่มีบัญชี 1100/4000/2110', 'สร้างบัญชีเหล่านี้ใน CoA ก่อน'],
              ['Asset is fully depreciated', 'สินทรัพย์หมดค่าเสื่อมแล้ว', 'ไม่ต้องคิดค่าเสื่อมเพิ่ม'],
              ['Filed certificates cannot be voided', 'Void WHT ที่ filed แล้ว', 'ไม่สามารถทำได้ — ต้องยื่นเพิ่มเติม'],
              ['Certificate type mismatch', 'pnd3/pnd53 ไม่ตรง Tax ID', 'Tax ID ขึ้นต้น \'0\' ต้องใช้ pnd53'],
            ]}
          />
        </section>

        {/* ================================================================ */}
        {/* Tips */}
        {/* ================================================================ */}
        <section id="tips" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">Tips &amp; Best Practices / คำแนะนำ</h2>

          <div className="space-y-3">
            <InfoBox title="Chart of Accounts">
              <p>วางผังบัญชีให้ครบตั้งแต่เริ่ม: 1010 Cash, 1100 AR, 2100 AP, 2110 VAT Payable, 3200 Retained Earnings, 4000 Revenue, 5100 COGS, 5500 Depreciation</p>
            </InfoBox>
            <InfoBox title="Journal Entries">
              <p>ใช้ <Code>X-Idempotency-Key</Code> header เสมอเมื่อสร้าง JE ผ่าน API | ปิดงวดทันทีเมื่อทำงานเสร็จ</p>
            </InfoBox>
            <InfoBox title="Invoices & Payments">
              <p>Post Invoice ก่อน collect payment | ยอดชำระเทียบกับ <strong>grandTotal</strong> (รวม VAT) ไม่ใช่แค่ subTotal</p>
            </InfoBox>
            <InfoBox title="Fixed Assets">
              <p>ตั้ง GL Account + Depreciation Account ตั้งแต่ลงทะเบียน | Run depreciation ทุกสิ้นเดือน</p>
            </InfoBox>
            <InfoBox title="Bank Reconciliation">
              <p>Import statement ทุกวัน/ทุกสัปดาห์ | ตั้ง Matching Rules ให้ครอบคลุมรายการประจำ</p>
            </InfoBox>
            <InfoBox title="WHT">
              <p>ตรวจสอบ Tax ID format ก่อนสร้างใบ | ทำ summary report ทุกเดือนเพื่อเตรียมยื่น ภ.ง.ด.3/53</p>
            </InfoBox>
            <InfoBox title="Year-End">
              <p>ปิดทุก 12 งวดก่อน &rarr; Close Year &rarr; ระบบสร้าง Closing JE ให้อัตโนมัติ | Reopen Year ได้หากมีข้อผิดพลาด</p>
            </InfoBox>
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/* Sticky Table of Contents - Desktop */}
      {/* ================================================================ */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter sections..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <nav className="space-y-1">
            {filteredToc.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block rounded px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-muted)] ${
                  activeSection === s.id ? 'bg-[var(--color-muted)] font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
