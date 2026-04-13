'use client';

import { useCallback, useMemo, useState } from 'react';
import { Eye, Plus, Play } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import { MoneyDisplay } from '@/components/domain/money-display';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BatchPayment {
  id: string;
  batchNumber: string;
  paymentCount: number;
  totalSatang: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface BatchPaymentResponse {
  items: BatchPayment[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Proposed', value: 'proposed' },
  { label: 'Approved', value: 'approved' },
  { label: 'Executed', value: 'executed' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BatchPaymentsPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [executeTarget, setExecuteTarget] = useState<BatchPayment | null>(null);
  const [executing, setExecuting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<BatchPaymentResponse>('/batch-payments', params);
  const batches = data?.items ?? [];

  const handleExecute = useCallback(async () => {
    if (!executeTarget) return;
    setExecuting(true);
    try {
      await api.post(`/batch-payments/${executeTarget.id}/execute`);
      showToast.success(`Batch "${executeTarget.batchNumber}" executed`);
      setExecuteTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to execute batch');
    } finally {
      setExecuting(false);
    }
  }, [executeTarget, refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Batch Payments</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Create, propose, and execute payment runs</p>
        </div>
        <Link href="/batch-payments/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Batch</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search batches..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : batches.length === 0 ? (
        <EmptyState context="search-results" message="No batch payments found" ctaLabel="Create Batch" onCtaClick={() => router.push('/batch-payments/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Batch #</th>
                <th className="px-4 py-3 text-right">Payments</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{b.batchNumber}</td>
                  <td className="px-4 py-3 text-right font-mono">{b.paymentCount}</td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amount={BigInt(b.totalSatang)} /></td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{b.paymentMethod}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(b.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${b.status === 'draft' ? 'bg-gray-100 text-gray-600' : b.status === 'proposed' ? 'bg-yellow-100 text-yellow-800' : b.status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/batch-payments/${b.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button></Link>
                      {b.status === 'approved' && (
                        <Button variant="ghost" size="sm" onClick={() => setExecuteTarget(b)}>
                          <Play className="h-3.5 w-3.5" /> Execute
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={executeTarget !== null} onOpenChange={(open) => { if (!open) setExecuteTarget(null); }} title="Execute Batch Payment" description={`Execute batch "${executeTarget?.batchNumber ?? ''}" with ${executeTarget?.paymentCount ?? 0} payments? This will process all payments in the batch.`} confirmLabel="Execute" confirmVariant="destructive" onConfirm={handleExecute} loading={executing} />
    </div>
  );
}
