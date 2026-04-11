'use client';

import {
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  GitCompare,
  Receipt,
  Scale,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Report definitions
// ---------------------------------------------------------------------------

interface ReportLink {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const REPORTS: ReportLink[] = [
  {
    title: 'Balance Sheet',
    description: 'Assets, liabilities, and equity at a point in time',
    href: '/reports/balance-sheet',
    icon: Scale,
  },
  {
    title: 'Income Statement',
    description: 'Revenue, expenses, and net income for a period',
    href: '/reports/income-statement',
    icon: TrendingUp,
  },
  {
    title: 'Trial Balance',
    description: 'All accounts with debit and credit totals',
    href: '/reports/trial-balance',
    icon: FileSpreadsheet,
  },
  {
    title: 'Budget vs Actual',
    description: 'Budget variance analysis with color-coded percentages',
    href: '/reports/budget-variance',
    icon: BarChart3,
  },
  {
    title: 'Statement of Changes in Equity',
    description: 'Opening balance, changes, and closing balance',
    href: '/reports/equity-changes',
    icon: Users,
  },
  {
    title: 'AP Aging',
    description: 'Outstanding vendor bills by aging bucket (Current, 1-30, 31-60, 61-90, >90 days)',
    href: '/reports/ap-aging',
    icon: ClipboardList,
  },
  {
    title: 'P&L Comparison',
    description: 'Monthly, YTD, year-over-year, and month-over-month profit & loss comparison views',
    href: '/reports/pnl',
    icon: GitCompare,
  },
  {
    title: 'AR Aging',
    description: 'Outstanding customer invoices by aging bucket (Current, 1-30, 31-60, 61-90, >90 days)',
    href: '/reports/ar-aging',
    icon: ClipboardList,
  },
  {
    title: 'VAT Return (ภ.พ.30)',
    description: 'Monthly VAT return summary for Revenue Department filing',
    href: '/reports/vat-return',
    icon: Receipt,
  },
  {
    title: 'SSC Filing (สปส. 1-10)',
    description: 'Monthly Social Security contribution filing report',
    href: '/reports/ssc-filing',
    icon: Shield,
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage(): React.JSX.Element {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Financial Reports</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          View and generate financial statements
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              href={report.href}
              className={cn(
                'group rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6',
                'transition-all hover:border-[var(--color-primary)] hover:shadow-md',
              )}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-100)]">
                <Icon className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <h2 className="text-base font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                {report.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {report.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
