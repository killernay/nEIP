'use client';

import { useState, useCallback } from 'react';
import { FileBarChart, Play, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';

interface ReportResult {
  columns: string[];
  rows: Record<string, string | number>[];
  totalRows: number;
}

const DATA_SOURCES = [
  { value: 'journal_entries', label: 'Journal Entries' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'bills', label: 'Bills' },
  { value: 'payments', label: 'Payments' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'employees', label: 'Employees' },
  { value: 'payroll', label: 'Payroll' },
];

const DIMENSIONS = [
  { value: 'date', label: 'Date' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'cost_center', label: 'Cost Center' },
  { value: 'profit_center', label: 'Profit Center' },
  { value: 'department', label: 'Department' },
  { value: 'account', label: 'Account' },
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'product', label: 'Product' },
];

const MEASURES = [
  { value: 'count', label: 'Count' },
  { value: 'sum_amount', label: 'Sum Amount' },
  { value: 'avg_amount', label: 'Avg Amount' },
  { value: 'min_amount', label: 'Min Amount' },
  { value: 'max_amount', label: 'Max Amount' },
];

export default function CustomReportPage(): React.JSX.Element {
  const [source, setSource] = useState('journal_entries');
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['month']);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>(['sum_amount']);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleDimension = (dim: string) => {
    setSelectedDimensions((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
    );
  };

  const toggleMeasure = (m: string) => {
    setSelectedMeasures((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const handleRun = useCallback(async () => {
    if (selectedDimensions.length === 0 || selectedMeasures.length === 0) {
      showToast.error('Select at least one dimension and one measure');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<ReportResult>('/reports/custom/run', {
        source,
        dimensions: selectedDimensions,
        measures: selectedMeasures,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setResult(res);
    } catch {
      showToast.error('Failed to run report');
    } finally {
      setLoading(false);
    }
  }, [source, selectedDimensions, selectedMeasures, dateFrom, dateTo]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileBarChart className="h-6 w-6 text-[var(--color-primary)]" />
          <div>
            <h1 className="text-2xl font-semibold">Custom Report Builder</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">Build custom reports from any data source</p>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-4">
        {/* Data Source */}
        <div>
          <label className="block text-sm font-medium mb-1">Data Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {DATA_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Dimensions */}
        <div>
          <label className="block text-sm font-medium mb-1">Dimensions (Group By)</label>
          <div className="flex flex-wrap gap-2">
            {DIMENSIONS.map((dim) => (
              <button
                key={dim.value}
                onClick={() => toggleDimension(dim.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedDimensions.includes(dim.value)
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted-foreground)]'
                }`}
              >
                {dim.label}
              </button>
            ))}
          </div>
        </div>

        {/* Measures */}
        <div>
          <label className="block text-sm font-medium mb-1">Measures</label>
          <div className="flex flex-wrap gap-2">
            {MEASURES.map((m) => (
              <button
                key={m.value}
                onClick={() => toggleMeasure(m.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedMeasures.includes(m.value)
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted-foreground)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="primary" onClick={handleRun} disabled={loading}>
            <Play className="h-4 w-4" />{loading ? 'Running...' : 'Run Report'}
          </Button>
          {result && (
            <Button variant="outline"><Download className="h-4 w-4" />Export CSV</Button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <SkeletonRow count={10} />
      ) : result ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">{result.totalRows} rows</p>
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                  {result.columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                    {result.columns.map((col) => (
                      <td key={col} className="px-4 py-2">{String(row[col] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
