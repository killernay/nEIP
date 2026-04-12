'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Building2,
  CheckCircle2,
  Brain,
  BarChart3,
  LayoutDashboard,
  Shield,
  Users,
  Lock,
  Settings,
  AlertTriangle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SectionId =
  | 'multi-currency'
  | 'multi-company'
  | 'approvals'
  | 'ai-agents'
  | 'reports'
  | 'dashboard'
  | 'auth'
  | 'roles'
  | 'pdpa'
  | 'settings';

interface TocItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ---------------------------------------------------------------------------
// TOC
// ---------------------------------------------------------------------------
const TOC: TocItem[] = [
  { id: 'multi-currency', label: '1. Multi-Currency', icon: Globe },
  { id: 'multi-company', label: '2. Multi-Company', icon: Building2 },
  { id: 'approvals', label: '3. Approval Workflows', icon: CheckCircle2 },
  { id: 'ai-agents', label: '4. AI Agents', icon: Brain },
  { id: 'reports', label: '5. Reports', icon: BarChart3 },
  { id: 'dashboard', label: '6. Dashboard', icon: LayoutDashboard },
  { id: 'auth', label: '7. Authentication', icon: Shield },
  { id: 'roles', label: '8. Roles & Permissions', icon: Users },
  { id: 'pdpa', label: '9. PDPA Data Rights', icon: Lock },
  { id: 'settings', label: '10. Settings', icon: Settings },
];

// ---------------------------------------------------------------------------
// Collapsible Section
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
        className="flex w-full items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <Icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <span className="flex-1">{title}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <div className="mt-3 space-y-4 pl-2">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Confidence Zone Card
// ---------------------------------------------------------------------------
function ConfidenceZoneCard({
  zone,
  range,
  meaning,
  action,
  color,
}: {
  zone: string;
  range: string;
  meaning: string;
  action: string;
  color: string;
}) {
  return (
    <div className={`rounded-lg border-l-4 p-4 ${color}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">{zone}</span>
        <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-mono dark:bg-gray-700">
          {range}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium">{meaning}</p>
      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{action}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approval Step
// ---------------------------------------------------------------------------
function ApprovalStep({ step, role, threshold, last }: { step: number; role: string; threshold: string; last?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {step}
        </div>
        {!last && <div className="h-8 w-0.5 bg-blue-300 dark:bg-blue-700" />}
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">{role}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{threshold}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table helper
// ---------------------------------------------------------------------------
function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-gray-700 dark:text-gray-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Agent Card
// ---------------------------------------------------------------------------
function AgentCard({ name, nameTh, description, example }: { name: string; nameTh: string; description: string; example: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{name}</h4>
        <span className="text-xs text-gray-500">({nameTh})</span>
      </div>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      <p className="mt-2 rounded bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {example}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function EnterpriseDocsPage() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar TOC */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-gray-200 p-4 lg:block dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          On this page
        </p>
        <nav className="space-y-1">
          {TOC.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
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
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/docs" className="hover:text-gray-700 dark:hover:text-gray-200">Docs</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">Enterprise & AI Manual</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Enterprise, AI & System Modules
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          โมดูล Enterprise, AI และระบบ — Version 0.9.0
        </p>

        <div className="mt-8 space-y-6">
          {/* 1. Multi-Currency */}
          <Section id="multi-currency" title="1. Multi-Currency / หลายสกุลเงิน" icon={Globe} defaultOpen>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage currency definitions, exchange rates, rate lookups, and month-end FX revaluation with automatic journal entry generation.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              โมดูลหลายสกุลเงิน (Phase 5.1) รองรับธุรกิจที่มีธุรกรรมสกุลเงินต่างประเทศ
            </p>

            <h4 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Create Currency</h4>
            <DataTable
              headers={['Field', 'Type', 'Required', 'Description']}
              rows={[
                ['code', 'string', 'Yes', 'ISO 4217 (3 chars) e.g. USD, EUR'],
                ['name', 'string', 'Yes', 'ชื่อสกุลเงิน e.g. US Dollar'],
                ['symbol', 'string', 'No', 'สัญลักษณ์ e.g. $, €, ¥'],
                ['decimalPlaces', 'integer', 'No', 'จำนวนทศนิยม (default 2)'],
              ]}
            />

            <h4 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">FX Revaluation</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Revalues all open foreign currency bills at month-end exchange rate. Creates JE for unrealized FX gain/loss.
            </p>
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs dark:border-gray-700 dark:bg-gray-800">
              <p className="text-green-700 dark:text-green-400">FX Gain: Dr AP (2100) / Cr FX Gain (4300)</p>
              <p className="text-red-700 dark:text-red-400">FX Loss: Dr FX Loss (5300) / Cr AP (2100)</p>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Run FX revaluation at the end of each month before closing the period. Ensure exchange rates are entered for the month-end date.
              </p>
            </div>
          </Section>

          {/* 2. Multi-Company */}
          <Section id="multi-company" title="2. Multi-Company / หลายบริษัท" icon={Building2}>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Support multiple companies and branches under a single tenant with intercompany transaction management and consolidated reporting.
            </p>

            <h4 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Intercompany Transaction</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Creates a transaction between two companies with automatic mirror journal entries.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500">From Company JE</p>
                <p className="mt-1 font-mono text-xs">
                  <span className="text-green-700 dark:text-green-400">Dr IC Receivable (1300)</span>
                  <br />
                  <span className="text-red-700 dark:text-red-400">Cr Cash/Bank (1000)</span>
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500">Mirror JE (To Company)</p>
                <p className="mt-1 font-mono text-xs">
                  <span className="text-green-700 dark:text-green-400">Dr Cash/Bank (1000)</span>
                  <br />
                  <span className="text-red-700 dark:text-red-400">Cr IC Payable (2300)</span>
                </p>
              </div>
            </div>

            <h4 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Consolidated Report</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generates consolidated financial reports across multiple companies with intercompany elimination.
              IC elimination identifies entries by <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">description LIKE &apos;IC:%&apos;</code>.
            </p>
          </Section>

          {/* 3. Approval Workflows */}
          <Section id="approvals" title="3. Approval Workflows / ขั้นตอนอนุมัติ" icon={CheckCircle2}>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configurable multi-step approval workflows with role-based approvers, amount thresholds, and auto-escalation timers.
            </p>

            <h4 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Example: PO Approval Chain</h4>
            <div className="mt-2">
              <ApprovalStep step={1} role="Manager" threshold="Any amount (≥ ฿0)" />
              <ApprovalStep step={2} role="Director" threshold="> ฿100,000" />
              <ApprovalStep step={3} role="CFO" threshold="> ฿500,000" last />
            </div>

            <h4 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Status Flow</h4>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-yellow-100 px-3 py-1 font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">pending</span>
              <span className="text-gray-400">→</span>
              <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">approved</span>
              <span className="text-gray-400">or</span>
              <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">rejected</span>
              <span className="text-gray-400">or</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">delegated</span>
            </div>
          </Section>

          {/* 4. AI Agents */}
          <Section id="ai-agents" title="4. AI Agents / ตัวแทน AI" icon={Brain}>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              8 AI agents that augment accounting workflows. Rule-based, deterministic approach with full reasoning transparency.
              Each returns a confidence score and confidence zone.
            </p>

            <h4 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Confidence Zones</h4>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <ConfidenceZoneCard
                zone="AUTO"
                range="≥ 0.90"
                meaning="High confidence"
                action="ใช้ผลอัตโนมัติได้ — Auto-apply safe"
                color="border-green-500 bg-green-50 dark:bg-green-900/20"
              />
              <ConfidenceZoneCard
                zone="REVIEW"
                range="0.50 – 0.89"
                meaning="Moderate confidence"
                action="ต้องตรวจสอบก่อนใช้ — Human review required"
                color="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
              />
              <ConfidenceZoneCard
                zone="MANUAL"
                range="0.10 – 0.49"
                meaning="Low confidence"
                action="ต้องตรวจสอบด้วยตนเอง — Manual handling required"
                color="border-orange-500 bg-orange-50 dark:bg-orange-900/20"
              />
              <ConfidenceZoneCard
                zone="BLOCKED"
                range="< 0.10"
                meaning="Cannot proceed"
                action="ไม่สามารถดำเนินการได้ — Blocked"
                color="border-red-500 bg-red-50 dark:bg-red-900/20"
              />
            </div>

            <h4 className="mt-6 font-semibold text-gray-900 dark:text-gray-100">8 AI Agents</h4>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <AgentCard name="Anomaly Detection" nameTh="ตรวจจับความผิดปกติ" description="Scans journal entries for anomalous patterns (duplicate amounts, unusual hours, round numbers)" example="POST /api/v1/ai/anomaly-scan?period=2026-03" />
              <AgentCard name="Cash Flow Forecast" nameTh="พยากรณ์กระแสเงินสด" description="Projects daily cash positions based on AR/AP aging and recurring JEs" example="GET /api/v1/ai/cash-forecast?days=30" />
              <AgentCard name="Smart Categorization" nameTh="จัดหมวดหมู่อัจฉริยะ" description="Suggests GL account for bank transactions using keyword matching (Thai + English)" example="POST /api/v1/ai/categorize" />
              <AgentCard name="Bank Auto-Reconciliation" nameTh="กระทบยอดอัตโนมัติ" description="Matches bank transactions against ledger using weighted scoring (amount 50%, ref 30%, date 20%)" example="POST /api/v1/ai/bank-reconcile/:id" />
              <AgentCard name="NLP Document Parser" nameTh="วิเคราะห์เอกสาร" description="Parses vendor invoices/receipts to extract structured data (vendor, date, amount, tax ID)" example="POST /api/v1/ai/parse-document" />
              <AgentCard name="Invoice Matching" nameTh="จับคู่ใบแจ้งหนี้" description="Matches payments to invoices using weighted scoring (amount 55%, customer 30%, date 15%)" example="Internal — invoked during payment processing" />
              <AgentCard name="Month-End Close" nameTh="ปิดงวดสิ้นเดือน" description="Performs comprehensive month-end reconciliation checks and suggests closing JEs" example="Internal — invoked during month-end close" />
              <AgentCard name="Predictive Analytics" nameTh="วิเคราะห์เชิงพยากรณ์" description="Forecasts revenue/expenses using linear regression and moving averages from historical GL data" example="GET /api/v1/ai/predictions?type=revenue&months=6" />
            </div>
          </Section>

          {/* 5. Reports */}
          <Section id="reports" title="5. Reports / รายงาน" icon={BarChart3}>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Standard financial reports and custom report builder. All reports enforce tenant isolation.
            </p>
            <DataTable
              headers={['Report', 'Path', 'Description']}
              rows={[
                ['Trial Balance', '/reports/trial-balance', 'งบทดลอง'],
                ['Balance Sheet', '/reports/balance-sheet', 'งบดุล'],
                ['Income Statement', '/reports/income-statement', 'งบกำไรขาดทุน'],
                ['P&L Comparison', '/reports/pnl', 'กำไรขาดทุนเปรียบเทียบ'],
                ['Cash Flow', '/reports/cash-flow', 'งบกระแสเงินสด'],
                ['AR Aging', '/reports/ar-aging', 'รายงานอายุลูกหนี้'],
                ['AP Aging', '/reports/ap-aging', 'รายงานอายุเจ้าหนี้'],
                ['Budget Variance', '/reports/budget-variance', 'เปรียบเทียบงบประมาณ'],
                ['VAT Return', '/reports/vat-return', 'ภ.พ.30'],
                ['SSC Filing', '/reports/ssc-filing', 'สปส.1-10'],
                ['Custom Reports', '/reports/custom', 'รายงานแบบกำหนดเอง'],
              ]}
            />
          </Section>

          {/* 6. Dashboard */}
          <Section id="dashboard" title="6. Dashboard / แดชบอร์ด" icon={LayoutDashboard}>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Executive-level financial overview with drill-down capabilities and role-based widget configuration.
            </p>
            <h4 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Dashboard Widgets</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { name: 'Revenue Trend', desc: 'Last 6 months revenue by month' },
                { name: 'Expense Breakdown', desc: 'By account, sorted by amount' },
                { name: 'Cash Flow', desc: 'Inflow, outflow, and net' },
                { name: 'AR Aging', desc: '5 buckets: Current, 1-30, 31-60, 61-90, 90+' },
                { name: 'Budget Utilization', desc: 'Budget vs actual with %' },
                { name: 'Consolidated View', desc: 'Cross-organization metrics' },
              ].map((w) => (
                <div key={w.name} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{w.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{w.desc}</p>
                </div>
              ))}
            </div>
            <h4 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Period Options</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {['MTD (Month to date)', 'QTD (Quarter to date)', 'YTD (Year to date)', 'Custom range'].map((p) => (
                <span key={p} className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400">{p}</span>
              ))}
            </div>
          </Section>

          {/* 7. Authentication */}
          <Section id="auth" title="7. Authentication / การยืนยันตัวตน" icon={Shield}>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              JWT-based authentication with argon2id password hashing, access + refresh token pattern, and brute-force protection.
            </p>
            <DataTable
              headers={['Feature', 'Detail']}
              rows={[
                ['Password Hash', 'argon2id (64 MiB memory, 3 iterations, 4 parallel)'],
                ['Access Token', 'JWT, expires 1 hour'],
                ['Refresh Token', 'Opaque, expires 30 days'],
                ['Brute-force', 'Max 10 failed attempts per IP / 5-minute window → 429'],
                ['Timing-safe', 'Dummy argon2 hash for unknown emails'],
                ['Min password', '12 characters'],
              ]}
            />
          </Section>

          {/* 8. Roles */}
          <Section id="roles" title="8. Roles & Permissions / บทบาทและสิทธิ์" icon={Users}>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enhanced RBAC with custom permissions. Format: <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">resource:action:scope</code>
            </p>
            <DataTable
              headers={['Role', 'Description', 'Can Delete?']}
              rows={[
                ['Owner', 'เจ้าของ — full access', 'No'],
                ['Accountant', 'นักบัญชี — financial operations', 'No'],
                ['Approver', 'ผู้อนุมัติ — approval actions', 'No'],
              ]}
            />
          </Section>

          {/* 9. PDPA */}
          <Section id="pdpa" title="9. PDPA Data Subject Rights / สิทธิ์เจ้าของข้อมูล PDPA" icon={Lock}>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Thai Personal Data Protection Act (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล) compliance for data subject rights.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300">Data Access Request</h4>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                  Exports all PII for employee or contact. Includes personal info, employment data, payroll history (24 periods).
                </p>
                <code className="mt-2 block rounded bg-blue-100 px-2 py-1 text-xs dark:bg-blue-900/50">POST /api/v1/pdpa/access-request</code>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <h4 className="font-semibold text-red-800 dark:text-red-300">Data Erasure Request</h4>
                <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                  Anonymizes all PII across tables. Names → &quot;ลบข้อมูล&quot;. This is IRREVERSIBLE.
                </p>
                <code className="mt-2 block rounded bg-red-100 px-2 py-1 text-xs dark:bg-red-900/50">POST /api/v1/pdpa/erasure-request</code>
              </div>
            </div>
          </Section>

          {/* 10. Settings */}
          <Section id="settings" title="10. Settings / การตั้งค่า" icon={Settings}>
            <DataTable
              headers={['Screen', 'Path', 'Description']}
              rows={[
                ['Organization', '/settings/organization', 'Company profile, logo, address'],
                ['Team', '/settings/team', 'User management, role assignment'],
                ['Companies', '/settings/companies', 'Multi-company/branch management'],
                ['Currencies', '/settings/currencies', 'Currency and exchange rate management'],
                ['Approvals', '/settings/approvals', 'Approval workflow configuration'],
                ['Tax', '/settings/tax', 'WHT rates, VAT settings'],
                ['Fiscal', '/settings/fiscal', 'Fiscal year/period configuration'],
                ['Payment Terms', '/settings/payment-terms', 'Net 30, Net 60, etc.'],
                ['Leave Calendar', '/settings/leave-calendar', 'Public holidays'],
                ['AI Config', '/settings/ai-config', 'Agent configuration, LLM API key'],
                ['Audit', '/settings/audit', 'Audit log viewer'],
                ['PDPA', '/settings/pdpa', 'Data subject rights management'],
              ]}
            />
          </Section>
        </div>
      </main>
    </div>
  );
}
