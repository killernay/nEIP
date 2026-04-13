'use client';

import { useCallback, useMemo, useState } from 'react';
import { Eye, Plus, CheckCircle } from 'lucide-react';
import Link from 'next/link';

import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PickList {
  id: string;
  pickNumber: string;
  salesOrderNumber: string;
  warehouseName: string;
  lineCount: number;
  pickedCount: number;
  assignee: string;
  status: string;
  createdAt: string;
}

interface PickResponse {
  items: PickList[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PickingPage(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<PickResponse>('/warehouse/pick-lists', params);
  const picks = data?.items ?? [];

  const handleComplete = useCallback(async (id: string) => {
    try {
      await api.post(`/warehouse/pick-lists/${id}/complete`);
      showToast.success('Pick list completed');
      refetch();
    } catch {
      showToast.error('Failed to complete pick list');
    }
  }, [refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Pick Lists</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Warehouse picking operations</p>
        </div>
        <Link href="/warehouse/picking/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> Create Pick List</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search pick lists..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : picks.length === 0 ? (
        <EmptyState context="search-results" message="No pick lists found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Pick #</th>
                <th className="px-4 py-3">Sales Order</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Progress</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{p.pickNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">{p.salesOrderNumber}</td>
                  <td className="px-4 py-3">{p.warehouseName}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{p.pickedCount}/{p.lineCount}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{p.assignee}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(p.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${p.status === 'completed' ? 'bg-green-100 text-green-800' : p.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/warehouse/picking/${p.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button></Link>
                      {p.status === 'in_progress' && (
                        <Button variant="ghost" size="sm" onClick={() => handleComplete(p.id)}>
                          <CheckCircle className="h-3.5 w-3.5" /> Done
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
    </div>
  );
}
