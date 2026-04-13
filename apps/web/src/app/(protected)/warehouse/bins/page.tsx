'use client';

import { useCallback, useMemo, useState } from 'react';
import { Eye, Plus, Trash2 } from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StorageBin {
  id: string;
  binCode: string;
  warehouseName: string;
  zone: string;
  aisle: string;
  rack: string;
  level: string;
  capacity: number;
  usedCapacity: number;
  isActive: boolean;
}

interface BinResponse {
  items: StorageBin[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StorageBinsPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StorageBin | null>(null);
  const [deleting, setDeleting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<BinResponse>('/warehouse/bins', params);
  const bins = data?.items ?? [];

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/warehouse/bins/${deleteTarget.id}`);
      showToast.success(`Bin "${deleteTarget.binCode}" deleted`);
      setDeleteTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to delete bin');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Storage Bins</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage warehouse bin locations and capacity</p>
        </div>
        <Link href="/warehouse/bins/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Bin</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search bins..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : bins.length === 0 ? (
        <EmptyState context="search-results" message="No storage bins found" ctaLabel="Create Bin" onCtaClick={() => router.push('/warehouse/bins/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Bin Code</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Utilization</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bins.map((b) => {
                const utilPct = b.capacity > 0 ? Math.round((b.usedCapacity / b.capacity) * 100) : 0;
                return (
                  <tr key={b.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                    <td className="px-4 py-3 font-medium font-mono text-xs">{b.binCode}</td>
                    <td className="px-4 py-3">{b.warehouseName}</td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{b.zone}</td>
                    <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      Aisle {b.aisle} / Rack {b.rack} / Level {b.level}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-[var(--color-accent)]/30">
                          <div className={`h-full rounded-full ${utilPct > 90 ? 'bg-red-500' : utilPct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${utilPct}%` }} />
                        </div>
                        <span className="text-xs font-mono">{utilPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${b.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link href={`/warehouse/bins/${b.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button></Link>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} title="Delete Storage Bin" description={`Delete bin "${deleteTarget?.binCode ?? ''}"?`} confirmLabel="Delete" confirmVariant="destructive" onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
