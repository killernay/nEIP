'use client';

import { useCallback, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { api } from '@/lib/api-client';
import { MoneyDisplay } from '@/components/domain/money-display';
import { ReportShell } from '../_components/report-shell';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CostCenterDetail {
  costCenterId: string;
  costCenterName: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

interface VarianceLine {
  code: string;
  name: string;
  /** Budget in satang */
  budget: number;
  /** Actual in satang */
  actual: number;
  /** Variance in satang (actual - budget) */
  variance: number;
  /** Variance percentage */
  variancePercent: number;
  category: string;
  costCenters?: CostCenterDetail[];
}

interface BudgetVarianceData {
  lines: VarianceLine[];
}

function varianceColor(pct: number): string {
  if (pct >= 10) return 'text-[var(--color-money-negative)] font-semibold';
  if (pct >= 5) return 'text-[var(--color-due-soon)]';
  if (pct <= -5) return 'text-[var(--color-money-positive)]';
  return 'text-[var(--color-muted-foreground)]';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BudgetVariancePage(): React.JSX.Element {
  const [data, setData] = useState<BudgetVarianceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (code: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleGenerate = useCallback(async (fiscalYear: string, period: string) => {
    setLoading(true);
    try {
      const result = await api.get<BudgetVarianceData>('/reports/budget-variance', { fiscalYear, period });
      setData(result);
    } catch {
      // Handled by api-client
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <ReportShell
      title="Budget vs Actual"
      description="Budget variance analysis with color-coded percentages"
      loading={loading}
      onGenerate={handleGenerate}
    >
      {data ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Budget</th>
              <th className="px-4 py-3 text-right">Actual</th>
              <th className="px-4 py-3 text-right">Variance</th>
              <th className="px-4 py-3 text-right">Var %</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line, i) => {
              const hasCostCenters = (line.costCenters?.length ?? 0) > 0;
              const isExpanded = expandedRows.has(line.code);
              return (
                <>
                  <tr
                    key={`${line.code}-${i}`}
                    className={cn(
                      'border-b border-[var(--color-border)] hover:bg-[var(--color-accent)]/30',
                      hasCostCenters && 'cursor-pointer',
                    )}
                    onClick={hasCostCenters ? () => toggleRow(line.code) : undefined}
                  >
                    <td className="px-4 py-2 font-mono-figures text-[var(--color-muted-foreground)]">
                      <span className="flex items-center gap-1">
                        {hasCostCenters && (isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                        {line.code}
                      </span>
                    </td>
                    <td className="px-4 py-2">{line.name}</td>
                    <td className="px-4 py-2 text-[var(--color-muted-foreground)]">{line.category}</td>
                    <td className="px-4 py-2 text-right">
                      <MoneyDisplay amount={BigInt(line.budget)} size="sm" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <MoneyDisplay amount={BigInt(line.actual)} size="sm" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <MoneyDisplay amount={BigInt(line.variance)} size="sm" showSign format="accounting" />
                    </td>
                    <td className={cn('px-4 py-2 text-right font-mono-figures', varianceColor(line.variancePercent))}>
                      {line.variancePercent > 0 ? '+' : ''}{line.variancePercent.toFixed(1)}%
                    </td>
                  </tr>
                  {isExpanded && line.costCenters?.map((cc) => (
                    <tr
                      key={`${line.code}-cc-${cc.costCenterId}`}
                      className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/20"
                    >
                      <td className="px-4 py-1.5" />
                      <td className="px-4 py-1.5 pl-8 text-xs text-[var(--color-muted-foreground)]">
                        {cc.costCenterName}
                      </td>
                      <td className="px-4 py-1.5" />
                      <td className="px-4 py-1.5 text-right text-xs">
                        <MoneyDisplay amount={BigInt(cc.budget)} size="sm" />
                      </td>
                      <td className="px-4 py-1.5 text-right text-xs">
                        <MoneyDisplay amount={BigInt(cc.actual)} size="sm" />
                      </td>
                      <td className="px-4 py-1.5 text-right text-xs">
                        <MoneyDisplay amount={BigInt(cc.variance)} size="sm" showSign format="accounting" />
                      </td>
                      <td className={cn('px-4 py-1.5 text-right font-mono-figures text-xs', varianceColor(cc.variancePercent))}>
                        {cc.variancePercent > 0 ? '+' : ''}{cc.variancePercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="px-4 py-12 text-center text-sm text-[var(--color-muted-foreground)]">
          Select a fiscal year and period, then click Generate to view budget variance.
        </div>
      )}
    </ReportShell>
  );
}
