'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ShoppingCart,
  Truck,
  Users,
  FileText,
  Package,
  Receipt,
  Brain,
  CheckCircle2,
  Building2,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SectionId =
  | 'overview'
  | 'quote-to-cash'
  | 'procure-to-pay'
  | 'hire-to-retire'
  | 'record-to-report'
  | 'inventory'
  | 'tax'
  | 'ai-workflows'
  | 'approvals'
  | 'multi-company'
  | 'month-end';

interface TocItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOC: TocItem[] = [
  { id: 'overview', label: '1. System Overview', icon: LayoutGrid },
  { id: 'quote-to-cash', label: '2. Quote-to-Cash', icon: ShoppingCart },
  { id: 'procure-to-pay', label: '3. Procure-to-Pay', icon: Truck },
  { id: 'hire-to-retire', label: '4. Hire-to-Retire', icon: Users },
  { id: 'record-to-report', label: '5. Record-to-Report', icon: FileText },
  { id: 'inventory', label: '6. Inventory Cycle', icon: Package },
  { id: 'tax', label: '7. Thai Tax Compliance', icon: Receipt },
  { id: 'ai-workflows', label: '8. AI-Assisted Workflows', icon: Brain },
  { id: 'approvals', label: '9. Approval Workflows', icon: CheckCircle2 },
  { id: 'multi-company', label: '10. Multi-Company', icon: Building2 },
  { id: 'month-end', label: '11. Month/Year-End', icon: CalendarCheck },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function Section({
  id,
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className="scroll-mt-20">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg bg-slate-800 px-4 py-3 text-left font-semibold text-white hover:bg-slate-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <Icon className="h-5 w-5 shrink-0 text-blue-300 dark:text-blue-400" />
        <span className="flex-1">{title}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <div className="mt-3 space-y-4 pl-2">{children}</div>}
    </section>
  );
}

function FlowStep({ step, title, description, hasJe, jeDetail }: {
  step: number;
  title: string;
  description: string;
  hasJe: boolean;
  jeDetail?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${hasJe ? 'bg-green-600' : 'bg-gray-400'}`}>
          {step}
        </div>
        <div className="mt-1 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="pb-4">
        <p className="font-medium text-black dark:text-white">{title}</p>
        <p className="text-sm text-gray-950 dark:text-gray-200">{description}</p>
        {hasJe && jeDetail && (
          <div className="mt-1 rounded bg-slate-100 border border-slate-300 px-3 py-1.5 font-mono text-xs dark:bg-gray-800">
            {jeDetail}
          </div>
        )}
        {!hasJe && <span className="mt-1 inline-block rounded bg-slate-100 border border-slate-300 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800">No JE</span>}
      </div>
    </div>
  );
}

function JeBox({ title, lines }: { title: string; lines: { account: string; dr?: string; cr?: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-400 dark:border-gray-700">
      <div className="bg-slate-800 px-4 py-2 text-sm font-semibold text-white dark:bg-gray-800 dark:text-gray-300">
        {title}
      </div>
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-gray-400 dark:border-gray-700">
            <th className="px-4 py-1.5 text-left text-gray-700">Account</th>
            <th className="px-4 py-1.5 text-right text-green-700 dark:text-green-400">Dr (เดบิต)</th>
            <th className="px-4 py-1.5 text-right text-red-700 dark:text-red-400">Cr (เครดิต)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300 dark:divide-gray-800">
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="px-4 py-1.5 text-gray-900 dark:text-gray-300">{l.account}</td>
              <td className="px-4 py-1.5 text-right font-mono text-green-700 dark:text-green-400">{l.dr || ''}</td>
              <td className="px-4 py-1.5 text-right font-mono text-red-700 dark:text-red-400">{l.cr || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowArrow({ items }: { items: { label: string; sub: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="rounded-lg border border-gray-400 px-3 py-2 text-center dark:border-gray-700">
            <p className="text-xs font-semibold text-black dark:text-white">{item.label}</p>
            <p className="text-[10px] text-gray-700">{item.sub}</p>
          </div>
          {i < items.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-blue-500" />}
        </div>
      ))}
    </div>
  );
}

function ChecklistItem({ text, api }: { text: string; api?: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
      <div>
        <p className="text-sm text-gray-900 dark:text-gray-300">{text}</p>
        {api && <code className="text-xs text-gray-700">{api}</code>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TrainingDocsPage() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar TOC */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-gray-400 p-4 lg:block dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-400">
          On this page
        </p>
        <nav className="space-y-1">
          {TOC.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-200 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 lg:px-12">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-900 dark:text-gray-400">
          <Link href="/docs" className="hover:text-gray-700 dark:hover:text-gray-200">Docs</Link>
          <span>/</span>
          <span className="text-black dark:text-white">Training Data Flow Guide</span>
        </nav>

        <h1 className="text-3xl font-bold text-black dark:text-white">
          คู่มือฝึกอบรมการไหลของข้อมูล
        </h1>
        <p className="mt-2 text-gray-950 dark:text-gray-200">
          Data Flow Training Guide — ครอบคลุม 31 โมดูล, 110 MCP Tools, 89 CLI Commands
        </p>

        <div className="mt-8 space-y-6">
          {/* 1. System Overview */}
          <Section id="overview" title="1. System Overview" icon={LayoutGrid} defaultOpen>
            <p className="text-sm text-gray-950 dark:text-gray-200">
              nEIP AI-Native ERP System สำหรับ SME ไทย — 4 main modules feed into the General Ledger.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: 'SD Module', desc: 'การขาย/Sales: Quotation, SO, Delivery, Invoice, Payment', color: 'border-blue-500' },
                { name: 'MM Module', desc: 'จัดซื้อ/Purchase: PR, RFQ, PO, GR, Bill, AP Payment, WHT', color: 'border-green-500' },
                { name: 'HR Module', desc: 'บุคคล/People: Employee, Position, Attendance, Payroll, Leave', color: 'border-purple-500' },
                { name: 'FI Module', desc: 'การเงิน/Finance: GL, CoA, JE, Fiscal Year, Trial Balance, P&L', color: 'border-orange-500' },
              ].map((m) => (
                <div key={m.name} className={`rounded-lg border-l-4 ${m.color} border border-gray-400 p-3 dark:border-gray-700`}>
                  <p className="text-sm font-semibold text-black dark:text-white">{m.name}</p>
                  <p className="mt-1 text-xs text-gray-900 dark:text-gray-400">{m.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Core Principle</p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                ทุก Business Transaction → สร้าง Journal Entry อัตโนมัติ (Auto-JE)<br />
                ทุก JE → Dr = Cr เสมอ (Balanced Double-Entry)<br />
                ทุก JE → สะสมใน GL → ออกรายงานได้ทันที
              </p>
            </div>
          </Section>

          {/* 2. Quote-to-Cash */}
          <Section id="quote-to-cash" title="2. Quote-to-Cash (ขายสินค้า → รับเงิน)" icon={ShoppingCart}>
            <div className="rounded-lg border border-gray-400 bg-slate-100 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-950 dark:text-gray-200">
                <strong>บริษัท ตัวอย่าง จำกัด</strong> ขาย Product A จำนวน 10 ชิ้น ราคาชิ้นละ 1,000 บาท
                ให้ <strong>บริษัท ลูกค้าดี จำกัด</strong> เครดิต 30 วัน
              </p>
            </div>

            <FlowArrow items={[
              { label: 'Quotation', sub: 'draft → sent' },
              { label: 'Sales Order', sub: 'confirmed' },
              { label: 'Delivery', sub: 'delivered (-stock)' },
              { label: 'Invoice', sub: 'posted (JE)' },
              { label: 'Payment', sub: 'matched (JE)' },
            ]} />

            <div className="mt-4 space-y-2">
              <FlowStep step={1} title="สร้างใบเสนอราคา (Quotation)" description="QT-2026-0001 — 10 x 1,000 THB = 10,000 + VAT 700 = 10,700 THB" hasJe={false} />
              <FlowStep step={2} title="แปลงเป็นใบสั่งขาย (Sales Order)" description="SO-2026-0001, status = confirmed" hasJe={false} />
              <FlowStep step={3} title="ส่งสินค้า (Delivery)" description="DO-2026-0001 — Product A: -10 ชิ้น from WH-001" hasJe={false} />
              <FlowStep step={4} title="ออกใบแจ้งหนี้ (Invoice Post)" description="INV-2026-0001 → สร้าง Journal Entry อัตโนมัติ" hasJe jeDetail="Dr 1100 AR 10,700 / Cr 4100 Revenue 10,000 + Cr 2110 VAT 700" />
              <FlowStep step={5} title="รับชำระเงิน (Payment)" description="PMT-2026-0001 → Invoice status = paid" hasJe jeDetail="Dr 1010 Cash 10,700 / Cr 1100 AR 10,700" />
            </div>

            <JeBox
              title="JE-2026-0001: Invoice Post"
              lines={[
                { account: '1100 ลูกหนี้การค้า (AR)', dr: '10,700' },
                { account: '4100 รายได้จากการขาย (Revenue)', cr: '10,000' },
                { account: '2110 ภาษีขาย (VAT Payable)', cr: '700' },
              ]}
            />

            <JeBox
              title="JE-2026-0002: Payment Received"
              lines={[
                { account: '1010 เงินสด/ธนาคาร (Cash)', dr: '10,700' },
                { account: '1100 ลูกหนี้การค้า (AR)', cr: '10,700' },
              ]}
            />
          </Section>

          {/* 3. Procure-to-Pay */}
          <Section id="procure-to-pay" title="3. Procure-to-Pay (ซื้อสินค้า → จ่ายเงิน)" icon={Truck}>
            <div className="rounded-lg border border-gray-400 bg-slate-100 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-950 dark:text-gray-200">
                <strong>บริษัท ตัวอย่าง จำกัด</strong> ซื้อวัตถุดิบ Material B 50 ชิ้น x 500 บาท
                จาก <strong>บริษัท ซัพพลายเออร์ จำกัด</strong> เครดิต 45 วัน, หัก ณ ที่จ่าย 3%
              </p>
            </div>

            <FlowArrow items={[
              { label: 'PR', sub: 'pending' },
              { label: 'RFQ', sub: 'compare' },
              { label: 'PO', sub: 'confirmed' },
              { label: 'GR', sub: 'received (+stock)' },
              { label: 'Bill Post', sub: 'posted (JE)' },
              { label: 'Payment', sub: 'paid (JE+WHT)' },
            ]} />

            <JeBox
              title="Bill Post: บันทึกค่าใช้จ่าย"
              lines={[
                { account: '5100 ต้นทุนสินค้า (COGS)', dr: '25,000' },
                { account: '1170 ภาษีซื้อ (Input VAT 7%)', dr: '1,750' },
                { account: '2100 เจ้าหนี้การค้า (AP)', cr: '26,750' },
              ]}
            />

            <JeBox
              title="Bill Payment: จ่ายเงิน + หัก WHT 3%"
              lines={[
                { account: '2100 เจ้าหนี้การค้า (AP)', dr: '26,750' },
                { account: '1010 เงินสด/ธนาคาร (Cash)', cr: '25,947' },
                { account: '2130 WHT Payable (3% of 25,000+1,750)', cr: '803' },
              ]}
            />
          </Section>

          {/* 4. Hire-to-Retire */}
          <Section id="hire-to-retire" title="4. Hire-to-Retire (จ้างงาน → จ่ายเงินเดือน)" icon={Users}>
            <div className="rounded-lg border border-gray-400 bg-slate-100 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-950 dark:text-gray-200">
                พนักงาน <strong>นายสมชาย ใจดี</strong> — เงินเดือน 30,000 บาท<br />
                SSC 5% (cap 750 บาท), PF 5% (1,500 บาท), PIT 1,125 บาท
              </p>
            </div>

            <FlowArrow items={[
              { label: 'Employee', sub: 'active' },
              { label: 'Position', sub: 'assigned' },
              { label: 'Attendance', sub: 'daily' },
              { label: 'Payroll Run', sub: 'monthly' },
              { label: 'Calculate', sub: 'calculated' },
              { label: 'Pay', sub: 'paid (JE)' },
            ]} />

            <JeBox
              title="Payroll JE: เงินเดือนเดือน ม.ค. 2026"
              lines={[
                { account: '5200 เงินเดือน/ค่าจ้าง (Salary)', dr: '30,000' },
                { account: '5200 SSC นายจ้าง (Employer SSC)', dr: '750' },
                { account: '1100 เงินสด/ธนาคาร (Net Pay)', cr: '26,625' },
                { account: '2300 SSC ค้างจ่าย (750+750)', cr: '1,500' },
                { account: '2400 กองทุนสำรอง (PF)', cr: '1,500' },
                { account: '2500 PIT ค้างจ่าย', cr: '1,125' },
              ]}
            />
          </Section>

          {/* 5. Record-to-Report */}
          <Section id="record-to-report" title="5. Record-to-Report (บันทึก → รายงาน)" icon={FileText}>
            <p className="text-sm text-gray-950 dark:text-gray-200">
              ทุก source transaction → Journal Entry → General Ledger → Trial Balance → Financial Statements
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {['Invoice Post', 'Payment', 'Bill Post', 'Bill Pay', 'Payroll', 'Depreciation'].map((s) => (
                <span key={s} className="rounded-lg border border-gray-400 px-2 py-1 text-xs dark:border-gray-700">{s}</span>
              ))}
              <ArrowRight className="h-4 w-4 text-blue-500" />
              <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">General Ledger</span>
              <ArrowRight className="h-4 w-4 text-blue-500" />
              <span className="rounded-lg bg-green-100 px-2 py-1 text-xs dark:bg-green-900/30">Trial Balance</span>
              <ArrowRight className="h-4 w-4 text-blue-500" />
              <div className="flex gap-1">
                <span className="rounded bg-purple-100 px-2 py-1 text-xs dark:bg-purple-900/30">P&L</span>
                <span className="rounded bg-purple-100 px-2 py-1 text-xs dark:bg-purple-900/30">Balance Sheet</span>
                <span className="rounded bg-purple-100 px-2 py-1 text-xs dark:bg-purple-900/30">Cash Flow</span>
              </div>
            </div>

            <h4 className="mt-4 font-semibold text-black dark:text-white">ตัวอย่างงบกำไรขาดทุน (P&L)</h4>
            <div className="mt-2 rounded-lg border border-gray-400 bg-slate-100 p-4 font-mono text-xs dark:border-gray-700 dark:bg-gray-800">
              <p className="font-bold">บริษัท ตัวอย่าง จำกัด — เดือน ม.ค. 2026</p>
              <div className="mt-2 space-y-1">
                <p><span className="text-green-700 dark:text-green-400">รายได้ (Revenue)</span></p>
                <p className="pl-4">4100 รายได้จากการขาย: 10,000.00</p>
                <p className="mt-2"><span className="text-red-700 dark:text-red-400">ต้นทุนขาย (COGS)</span></p>
                <p className="pl-4">5100 ต้นทุนสินค้าขาย: (25,000.00)</p>
                <p className="mt-1 border-t border-gray-400 pt-1 dark:border-gray-600">กำไรขั้นต้น: (15,000.00)</p>
                <p className="mt-2"><span className="text-red-700 dark:text-red-400">ค่าใช้จ่าย (Expenses)</span></p>
                <p className="pl-4">5200 เงินเดือน: (30,000.00)</p>
                <p className="mt-1 border-t border-gray-400 pt-1 font-bold dark:border-gray-600">กำไร(ขาดทุน)สุทธิ: (45,000.00)</p>
              </div>
            </div>
          </Section>

          {/* 6. Inventory */}
          <Section id="inventory" title="6. Inventory Cycle (สินค้าคงคลัง)" icon={Package}>
            <div className="rounded-lg border border-gray-400 bg-slate-100 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-950 dark:text-gray-200">
                คลัง WH-001 — Product A: รับเข้า 100 → ขาย 30 → ยอดบัญชี 70 → นับจริง 68 → Variance -2
              </p>
            </div>

            <FlowArrow items={[
              { label: 'Receive 100', sub: '+stock' },
              { label: 'Issue 30', sub: '-stock' },
              { label: 'Book Qty: 70', sub: 'ยอดบัญชี' },
              { label: 'Count: 68', sub: 'นับจริง' },
              { label: 'Adjust -2', sub: 'JE' },
            ]} />

            <JeBox
              title="Stock Count Variance JE"
              lines={[
                { account: '5100 ผลต่างสินค้า (Variance Loss)', dr: '1,000' },
                { account: '1300 สินค้าคงคลัง (Inventory)', cr: '1,000' },
              ]}
            />
            <p className="text-xs text-gray-900 dark:text-gray-400">
              Variance = |2 ชิ้น| x 500 บาท/ชิ้น = 1,000 บาท
            </p>
          </Section>

          {/* 7. Thai Tax Compliance */}
          <Section id="tax" title="7. Thai Tax Compliance (ภาษีไทย)" icon={Receipt}>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300">VAT 7% (ภ.พ.30)</h4>
                <div className="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-400">
                  <p>ขาย: Invoice Post → Cr 2110 ภาษีขาย (Output VAT)</p>
                  <p>ซื้อ: Bill Post → Dr 1170 ภาษีซื้อ (Input VAT)</p>
                  <p className="mt-2 font-bold">สรุป: Output - Input = VAT สุทธิ</p>
                  <p>ยื่นภายในวันที่ 15 ของเดือนถัดไป</p>
                </div>
              </div>

              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
                <h4 className="font-semibold text-orange-800 dark:text-orange-300">WHT (ภาษีหัก ณ ที่จ่าย)</h4>
                <div className="mt-2 space-y-1 text-xs text-orange-700 dark:text-orange-400">
                  <p>Bill Payment → Cr 2130 WHT Payable</p>
                  <p>Auto-create ใบ 50 ทวิ</p>
                  <div className="mt-2">
                    <p>ค่าบริการ: 3% | ค่าเช่า: 5%</p>
                    <p>ค่าจ้างทำของ: 3% | ค่าขนส่ง: 1%</p>
                  </div>
                  <p className="mt-1 font-bold">ยื่นภายในวันที่ 7 ของเดือนถัดไป</p>
                </div>
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <h4 className="font-semibold text-green-800 dark:text-green-300">SSC (ประกันสังคม)</h4>
                <div className="mt-2 space-y-1 text-xs text-green-700 dark:text-green-400">
                  <p>Payroll → คำนวณ SSC: max(salary, 15,000) x 5%</p>
                  <p>เพดาน: 750 บาท/เดือน (ลูกจ้าง + นายจ้าง)</p>
                  <p>GL: Cr 2300 SSC Payable</p>
                  <p className="mt-1 font-bold">ยื่น สปส.1-10 ภายในวันที่ 15</p>
                </div>
              </div>

              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
                <h4 className="font-semibold text-purple-800 dark:text-purple-300">PIT & 50 ทวิ</h4>
                <div className="mt-2 space-y-1 text-xs text-purple-700 dark:text-purple-400">
                  <p>Payroll → คำนวณ PIT สะสม (Cumulative method)</p>
                  <p>GL: Cr 2500 Income Tax Payable</p>
                  <p>ยื่น ภ.ง.ด.1 ภายในวันที่ 7</p>
                  <p className="mt-1 font-bold">สิ้นปี: ออก 50 ทวิ ให้พนักงานทุกคน</p>
                </div>
              </div>
            </div>

            <h4 className="mt-4 font-semibold text-black dark:text-white">ปฏิทินภาษีรายเดือน</h4>
            <div className="mt-2 flex gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-gray-400 px-4 py-2 dark:border-gray-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">7</span>
                <div className="text-xs">
                  <p className="font-bold text-black dark:text-white">วันที่ 7</p>
                  <p className="text-gray-700">ภ.ง.ด.1, ภ.ง.ด.3/53</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-400 px-4 py-2 dark:border-gray-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">15</span>
                <div className="text-xs">
                  <p className="font-bold text-black dark:text-white">วันที่ 15</p>
                  <p className="text-gray-700">ภ.พ.30, สปส.1-10</p>
                </div>
              </div>
            </div>
          </Section>

          {/* 8. AI-Assisted Workflows */}
          <Section id="ai-workflows" title="8. AI-Assisted Workflows" icon={Brain}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: 'Accounting Agent', th: 'ผู้ช่วยบัญชี', desc: 'บันทึกบัญชี, สร้าง JE, ปิดงวด' },
                { name: 'Sales Agent', th: 'ผู้ช่วยขาย', desc: 'จัดการขาย, สร้างใบเสนอราคา' },
                { name: 'Procurement Agent', th: 'ผู้ช่วยจัดซื้อ', desc: 'จัดซื้อ, เปรียบเทียบราคา' },
                { name: 'HR Agent', th: 'ผู้ช่วย HR', desc: 'จัดการพนักงาน, Payroll' },
                { name: 'Inventory Agent', th: 'ผู้ช่วยคลัง', desc: 'จัดการสต็อก, แจ้งเตือน' },
                { name: 'Tax Agent', th: 'ผู้ช่วยภาษี', desc: 'คำนวณภาษี, เตรียมแบบยื่น' },
                { name: 'Report Agent', th: 'ผู้ช่วยรายงาน', desc: 'สร้างรายงาน, KPI' },
                { name: 'Admin Agent', th: 'ผู้ช่วยแอดมิน', desc: 'ตั้งค่าระบบ, จัดการผู้ใช้' },
              ].map((a) => (
                <div key={a.name} className="rounded-lg border border-gray-400 p-3 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <p className="text-sm font-semibold text-black dark:text-white">{a.name}</p>
                  </div>
                  <p className="text-xs text-gray-700">({a.th})</p>
                  <p className="mt-1 text-xs text-gray-950 dark:text-gray-200">{a.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* 9. Approval Workflows */}
          <Section id="approvals" title="9. Approval Workflows" icon={CheckCircle2}>
            <div className="overflow-x-auto rounded-lg border border-gray-400 dark:border-gray-700">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100 border-b border-slate-300 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-300">Document Type</th>
                    <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-300">Approval Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    ['Purchase Order', '> 10K → Manager | > 50K → Director | > 100K → CEO'],
                    ['Payment', '> 5K → Finance Manager | > 100K → CFO'],
                    ['Leave Request', 'Any → Direct Manager'],
                    ['Journal Entry', 'Manual JE → Accounting Mgr'],
                  ].map(([doc, rule]) => (
                    <tr key={doc}>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-300">{doc}</td>
                      <td className="px-4 py-2 text-gray-950 dark:text-gray-200">{rule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 10. Multi-Company */}
          <Section id="multi-company" title="10. Multi-Company" icon={Building2}>
            <p className="text-sm text-gray-950 dark:text-gray-200">
              แต่ละ Tenant มี Chart of Accounts, Fiscal Years, Users & Permissions แยกกัน ข้อมูลทุกตาราง filter by tenant_id
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="rounded-lg border-2 border-blue-300 px-4 py-2 dark:border-blue-700">
                <p className="text-sm font-bold">Holding Company</p>
                <p className="text-xs text-gray-700">บริษัท แม่ จำกัด (Parent)</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              {['บ.ขาย จก. (Tenant A)', 'บ.ผลิต จก. (Tenant B)', 'บ.บริการ จก. (Tenant C)'].map((c) => (
                <div key={c} className="rounded-lg border border-gray-400 px-3 py-2 text-xs dark:border-gray-700">
                  {c}
                </div>
              ))}
            </div>
          </Section>

          {/* 11. Month-End / Year-End */}
          <Section id="month-end" title="11. Month-End / Year-End Checklist" icon={CalendarCheck}>
            <h4 className="font-semibold text-black dark:text-white">Month-End Close (13 steps)</h4>
            <div className="mt-2 space-y-0">
              <ChecklistItem text="Post invoices ที่ค้างอยู่ทั้งหมด" api="POST /api/v1/invoices/:id/post" />
              <ChecklistItem text="Post bills ที่ค้างอยู่ทั้งหมด" />
              <ChecklistItem text="บันทึกรับชำระเงินลูกหนี้ค้าง" api="POST /api/v1/payments" />
              <ChecklistItem text="บันทึกจ่ายเงินเจ้าหนี้ค้าง" />
              <ChecklistItem text="คำนวณและจ่ายเงินเดือน (Payroll)" api="POST /api/v1/payroll-runs/:id/calculate → /pay" />
              <ChecklistItem text="คำนวณค่าเสื่อมราคาสินทรัพย์ถาวร" api="POST /api/v1/fixed-assets/:id/depreciate" />
              <ChecklistItem text="ตรวจนับสินค้า (ถ้ามี variance)" api="POST /api/v1/stock-counts → /enter → /post" />
              <ChecklistItem text="กระทบยอดธนาคาร (Bank Reconciliation)" />
              <ChecklistItem text="สร้าง JE ปรับปรุง (Accruals, Prepayments)" api="POST /api/v1/journal-entries" />
              <ChecklistItem text="ตรวจ Trial Balance — Dr = Cr" api="GET /api/v1/gl/trial-balance" />
              <ChecklistItem text="ตรวจสอบรายงาน P&L, Balance Sheet" />
              <ChecklistItem text="ยื่นภาษี: ภ.พ.30, ภ.ง.ด.1/3/53, สปส.1-10" />
              <ChecklistItem text="ปิดงวดบัญชี (Close Period)" api="POST /api/v1/fiscal-periods/:id/close" />
            </div>

            <h4 className="mt-6 font-semibold text-black dark:text-white">Year-End Close</h4>
            <div className="mt-2 space-y-0">
              <ChecklistItem text="ปิดงวดรายเดือนทั้ง 12 เดือนก่อน" />
              <ChecklistItem text="ตรวจสอบ Trial Balance สิ้นปี" />
              <ChecklistItem text="ปิดบัญชีสิ้นปี (Year-End Closing)" api="POST /api/v1/fiscal-years/:id/close" />
              <ChecklistItem text="ออก 50 ทวิ ให้พนักงานทุกคน" />
              <ChecklistItem text="จัดทำงบการเงินประจำปี (P&L, BS, Cash Flow)" />
              <ChecklistItem text="สร้าง Fiscal Year ใหม่" api="POST /api/v1/fiscal-years" />
            </div>

            <JeBox
              title="Year-End Closing JE Example"
              lines={[
                { account: '4100 รายได้จากการขาย (Close revenue)', dr: '10,000' },
                { account: '5100 ต้นทุนสินค้าขาย (Close expense)', cr: '25,000' },
                { account: '5200 เงินเดือน (Close expense)', cr: '30,000' },
                { account: '3200 กำไรสะสม (Retained Earnings — loss)', dr: '45,000' },
              ]}
            />
          </Section>
        </div>
      </main>
    </div>
  );
}
