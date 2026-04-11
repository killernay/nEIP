'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api-client';
import { MoneyDisplay } from '@/components/domain/money-display';
import { ReportShell } from '../_components/report-shell';

interface CashFlowLine {
  label: string;
  amountSatang: number;
  isTotal: boolean;
  indent: number;
}

interface CashFlowSection {
  title: string;
  lines: CashFlowLine[];
  totalSatang: number;
}

interface CashFlowData {
  sections: CashFlowSection[];
  netChangeSatang: number;
  beginningBalanceSatang: number;
  endingBalanceSatang: number;
}

export default function CashFlowReportPage(): React.JSX.Element {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = useCallback(async (fiscalYear: string, period: string) => {
    setLoading(true);
    try {
      const result = await api.get<CashFlowData>('/reports/cash-flow', { fiscalYear, period });
      setData(result);
    } catch {
      // Handled by api-client
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <ReportShell
      title="Cash Flow Statement"
      description="Operating, investing, and financing activities"
      loading={loading}
      onGenerate={handleGenerate}
    >
      {data ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--color-border)] p-3">
              <p className="text-xs text-[var(--color-muted-foreground)]">Beginning Balance</p>
              <div className="mt-1"><MoneyDisplay amount={BigInt(data.beginningBalanceSatang)} size="lg" /></div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] p-3">
              <p className="text-xs text-[var(--color-muted-foreground)]">Net Change</p>
              <div className="mt-1"><MoneyDisplay amount={BigInt(data.netChangeSatang)} size="lg" showSign /></div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] p-3">
              <p className="text-xs text-[var(--color-muted-foreground)]">Ending Balance</p>
              <div className="mt-1"><MoneyDisplay amount={BigInt(data.endingBalanceSatang)} size="lg" /></div>
            </div>
          </div>

          {/* Sections */}
          {data.sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {section.title}
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  {section.lines.map((line, i) => (
                    <tr
                      key={`${section.title}-${i}`}
                      className={cn(
                        'border-b border-[var(--color-border)]',
                        line.isTotal && 'font-semibold bg-[var(--color-muted)]/30',
                      )}
                    >
                      <td className="px-4 py-2" style={{ paddingLeft: `${16 + line.indent * 16}px` }}>
                        {line.label}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <MoneyDisplay amount={BigInt(line.amountSatang)} size="sm" showSign />
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b-2 border-[var(--color-border)] font-bold">
                    <td className="px-4 py-2">Total {section.title}</td>
                    <td className="px-4 py-2 text-right">
                      <MoneyDisplay amount={BigInt(section.totalSatang)} size="sm" showSign />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-12 text-center text-sm text-[var(--color-muted-foreground)]">
          Select a fiscal year and period, then click Generate to view cash flow statement.
        </div>
      )}
    </ReportShell>
  );
}
