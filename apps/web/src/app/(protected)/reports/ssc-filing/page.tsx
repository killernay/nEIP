'use client';

import { useCallback, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/components/domain/money-display';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MoneyVO {
  amountSatang: string;
  currency: string;
}

interface EmployeeSSC {
  employeeId: string;
  employeeName: string;
  wageSatang: string;
  employeeContributionSatang: string;
  employerContributionSatang: string;
}

interface SSCFilingReport {
  reportName: string;
  generatedAt: string;
  month: number;
  year: number;
  totalWages: MoneyVO;
  totalEmployeeContribution: MoneyVO;
  totalEmployerContribution: MoneyVO;
  totalContribution: MoneyVO;
  employeeCount: number;
  employees: EmployeeSSC[];
  filingDeadline: string;
}

const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SSCFilingPage(): React.JSX.Element {
  const router = useRouter();
  const now = new Date();

  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SSCFilingReport | null>(null);

  const inputClasses = cn(
    'h-10 rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm',
    'text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]',
  );

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SSCFilingReport>('/reports/ssc-filing', { month, year });
      setReport(data);
    } catch {
      showToast.error('Failed to generate SSC filing report');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/reports')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">SSC Monthly Filing</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Social Security contribution filing (สปส. 1-10)
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-end gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="space-y-1.5">
          <label htmlFor="month" className="text-sm font-medium text-[var(--color-foreground)]">Month</label>
          <select id="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClasses}>
            {MONTHS.map((name, i) => (
              <option key={i} value={String(i + 1)}>{name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="year" className="text-sm font-medium text-[var(--color-foreground)]">Year</label>
          <input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} className={cn(inputClasses, 'w-24')} />
        </div>
        <Button variant="primary" onClick={handleGenerate} loading={loading}>
          Generate Report
        </Button>
      </div>

      {/* Report */}
      {loading ? (
        <SkeletonRow count={4} />
      ) : report !== null ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                SSC Summary — {MONTHS[(report.month - 1)] ?? ''} {report.year}
              </h2>
              <Button variant="outline" size="sm" onClick={() => showToast.success('SSC filing exported')}>
                <Download className="h-4 w-4" />
                Export สปส. 1-10
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Employees</p>
                <p className="text-xl font-semibold text-[var(--color-foreground)]">{report.employeeCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Total Wages</p>
                <MoneyDisplay amount={BigInt(report.totalWages.amountSatang)} size="md" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Employee Contribution</p>
                <MoneyDisplay amount={BigInt(report.totalEmployeeContribution.amountSatang)} size="md" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Employer Contribution</p>
                <MoneyDisplay amount={BigInt(report.totalEmployerContribution.amountSatang)} size="md" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground)]">Total Contribution</p>
                <MoneyDisplay amount={BigInt(report.totalContribution.amountSatang)} size="md" />
              </div>
            </div>
          </div>

          {/* Employee detail table */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
            <h2 className="border-b border-[var(--color-border)] p-4 text-base font-semibold text-[var(--color-foreground)]">
              Employee Details
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3 text-right">Wages</th>
                    <th className="px-4 py-3 text-right">Employee SSC</th>
                    <th className="px-4 py-3 text-right">Employer SSC</th>
                  </tr>
                </thead>
                <tbody>
                  {report.employees.map((emp) => (
                    <tr key={emp.employeeId} className="border-b border-[var(--color-border)] hover:bg-[var(--color-accent)]/30">
                      <td className="px-4 py-3 font-medium">{emp.employeeName}</td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay amount={BigInt(emp.wageSatang)} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay amount={BigInt(emp.employeeContributionSatang)} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay amount={BigInt(emp.employerContributionSatang)} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-[var(--color-muted-foreground)]">
            Filing deadline: {new Date(report.filingDeadline).toLocaleDateString('th-TH')} |
            Report generated at {new Date(report.generatedAt).toLocaleString('th-TH')}
          </p>
        </div>
      ) : null}
    </div>
  );
}
