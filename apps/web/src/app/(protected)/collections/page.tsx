'use client';

import { useCallback, useMemo, useState } from 'react';
import { Eye, Plus, PhoneCall } from 'lucide-react';
import Link from 'next/link';

import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import { MoneyDisplay } from '@/components/domain/money-display';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  dueDateStr: string;
  overdueDays: number;
  amountDueSatang: number;
  promiseDate: string | null;
  status: string;
}

interface CollectionResponse {
  items: CollectionItem[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'Promised', value: 'promised' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'Collected', value: 'collected' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CollectionsPage(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [promiseId, setPromiseId] = useState<string | null>(null);
  const [promiseDate, setPromiseDate] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<CollectionResponse>('/collections/worklist', params);
  const items = data?.items ?? [];

  const handlePromise = useCallback(async () => {
    if (!promiseId || !promiseDate) return;
    try {
      await api.post(`/collections/${promiseId}/promise`, { promiseDate });
      showToast.success('Promise-to-pay recorded');
      setPromiseId(null);
      setPromiseDate('');
      refetch();
    } catch {
      showToast.error('Failed to record promise');
    }
  }, [promiseId, promiseDate, refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">AR Collections</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage overdue invoices and promise-to-pay commitments</p>
        </div>
        <Link href="/collections/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Collection Run</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by customer or invoice..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No collection items found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Overdue</th>
                <th className="px-4 py-3 text-right">Amount Due</th>
                <th className="px-4 py-3">Promise Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{c.invoiceNumber}</td>
                  <td className="px-4 py-3">{c.customerName}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{c.dueDateStr}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={c.overdueDays > 30 ? 'text-red-600 font-medium' : 'text-[var(--color-muted-foreground)]'}>
                      {c.overdueDays}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amount={BigInt(c.amountDueSatang)} /></td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{c.promiseDate ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${c.status === 'open' ? 'bg-yellow-100 text-yellow-800' : c.status === 'promised' ? 'bg-blue-100 text-blue-800' : c.status === 'collected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/collections/${c.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button></Link>
                      <Button variant="ghost" size="sm" onClick={() => { setPromiseId(c.id); setPromiseDate(''); }}>
                        <PhoneCall className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Promise-to-pay dialog */}
      {promiseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-lg bg-[var(--color-card)] p-6 shadow-xl">
            <h3 className="text-lg font-medium text-[var(--color-foreground)]">Record Promise-to-Pay</h3>
            <input type="date" value={promiseDate} onChange={(e) => setPromiseDate(e.target.value)} className="mt-4 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm" />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPromiseId(null)}>Cancel</Button>
              <Button variant="primary" onClick={handlePromise} disabled={!promiseDate}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
