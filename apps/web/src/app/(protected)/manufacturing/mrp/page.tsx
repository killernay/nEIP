'use client';

import { useCallback, useState } from 'react';
import { Play, RefreshCw, Package, ShoppingCart } from 'lucide-react';

import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MRPResult {
  id: string;
  itemCode: string;
  itemName: string;
  requiredQty: number;
  availableQty: number;
  shortageQty: number;
  action: 'purchase' | 'produce' | 'transfer';
  suggestedDate: string;
}

interface MRPResponse {
  lastRunAt: string | null;
  results: MRPResult[];
  totalShortages: number;
}

const ACTION_BADGE = {
  purchase: { bg: 'bg-blue-100 text-blue-800', icon: ShoppingCart },
  produce: { bg: 'bg-purple-100 text-purple-800', icon: Package },
  transfer: { bg: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MRPPage(): React.JSX.Element {
  const { data, loading, refetch } = useApi<MRPResponse>('/manufacturing/mrp/results');
  const results = data?.results ?? [];
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(async () => {
    setRunning(true);
    try {
      await api.post('/manufacturing/mrp/run');
      showToast.success('MRP run completed');
      refetch();
    } catch {
      showToast.error('MRP run failed');
    } finally {
      setRunning(false);
    }
  }, [refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Material Requirements Planning</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Last run: {data?.lastRunAt ? new Date(data.lastRunAt).toLocaleString('th-TH') : 'Never'} — {data?.totalShortages ?? 0} shortages
          </p>
        </div>
        <Button variant="primary" onClick={handleRun} disabled={running}>
          <Play className="h-4 w-4" /> {running ? 'Running...' : 'Run MRP'}
        </Button>
      </div>

      {loading ? (
        <SkeletonRow count={8} />
      ) : results.length === 0 ? (
        <EmptyState context="search-results" message="No MRP results. Run MRP to generate requirements." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3 text-right">Required</th>
                <th className="px-4 py-3 text-right">Available</th>
                <th className="px-4 py-3 text-right">Shortage</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Suggested Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const badge = ACTION_BADGE[r.action];
                const Icon = badge.icon;
                return (
                  <tr key={r.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{r.itemCode}</td>
                    <td className="px-4 py-3">{r.itemName}</td>
                    <td className="px-4 py-3 text-right font-mono">{r.requiredQty}</td>
                    <td className="px-4 py-3 text-right font-mono">{r.availableQty}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600 font-medium">{r.shortageQty}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${badge.bg}`}>
                        <Icon className="h-3 w-3" /> {r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(r.suggestedDate).toLocaleDateString('th-TH')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
