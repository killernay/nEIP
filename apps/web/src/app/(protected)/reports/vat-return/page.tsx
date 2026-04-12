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

interface VatReturnReport {
  reportName: string;
  generatedAt: string;
  month: number;
  year: number;
  outputTax: MoneyVO;
  inputTax: MoneyVO;
  netVat: MoneyVO;
  salesBase: MoneyVO;
  purchaseBase: MoneyVO;
  filingDeadline: string;
  status: 'draft' | 'filed';
}

const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VatReturnPage(): React.JSX.Element {
  const router = useRouter();
  const now = new Date();

  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<VatReturnReport | null>(null);

  const inputClasses = cn(
    'h-10 rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm',
    'text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]',
  );

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<VatReturnReport>('/reports/vat-return', { month, year });
      setReport(data);
    } catch {
      showToast.error('Failed to generate VAT return report');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const handleExport = useCallback(() => {
    if (!report) return;
    try {
      const rows = [
        ['Field', 'Amount (Satang)', 'Amount (THB)'],
        ['Sales Base', report.salesBase.amountSatang, (Number(report.salesBase.amountSatang) / 100).toFixed(2)],
        ['Output Tax', report.outputTax.amountSatang, (Number(report.outputTax.amountSatang) / 100).toFixed(2)],
        ['Purchase Base', report.purchaseBase.amountSatang, (Number(report.purchaseBase.amountSatang) / 100).toFixed(2)],
        ['Input Tax', report.inputTax.amountSatang, (Number(report.inputTax.amountSatang) / 100).toFixed(2)],
        ['Net VAT Payable', report.netVat.amountSatang, (Number(report.netVat.amountSatang) / 100).toFixed(2)],
        ['Filing Deadline', report.filingDeadline, ''],
        ['Period', `${report.month}/${report.year}`, ''],
        ['Status', report.status, ''],
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vat-return-${report.year}-${String(report.month).padStart(2, '0')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast.success('VAT return exported (ภ.พ.30 format)');
    } catch {
      showToast.error('Failed to export');
    }
  }, [report]);

  function moneyAmount(m: MoneyVO): bigint {
    return BigInt(m.amountSatang);
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/reports')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">VAT Return (ภ.พ.30)</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Monthly VAT return summary for Revenue Department filing
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
                VAT Summary — {MONTHS[(report.month - 1)] ?? ''} {report.year}
              </h2>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export ภ.พ.30
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border border-[var(--color-border)] p-4 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Sales Base</p>
                <MoneyDisplay amount={moneyAmount(report.salesBase)} size="md" />
              </div>
              <div className="rounded-md border border-[var(--color-border)] p-4 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Output Tax (ภาษีขาย)</p>
                <MoneyDisplay amount={moneyAmount(report.outputTax)} size="md" />
              </div>
              <div className="rounded-md border border-[var(--color-border)] p-4 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Purchase Base</p>
                <MoneyDisplay amount={moneyAmount(report.purchaseBase)} size="md" />
              </div>
              <div className="rounded-md border border-[var(--color-border)] p-4 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Input Tax (ภาษีซื้อ)</p>
                <MoneyDisplay amount={moneyAmount(report.inputTax)} size="md" />
              </div>
              <div className="rounded-md border border-[var(--color-border)] p-4 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground)]">Net VAT Payable</p>
                <MoneyDisplay amount={moneyAmount(report.netVat)} size="lg" />
              </div>
              <div className="rounded-md border border-[var(--color-border)] p-4 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Filing Deadline</p>
                <p className="text-base font-semibold text-[var(--color-foreground)]">
                  {new Date(report.filingDeadline).toLocaleDateString('th-TH')}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--color-muted-foreground)]">
            Report generated at {new Date(report.generatedAt).toLocaleString('th-TH')}
          </p>
        </div>
      ) : null}
    </div>
  );
}
