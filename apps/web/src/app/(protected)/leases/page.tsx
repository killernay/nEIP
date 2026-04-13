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
import { MoneyDisplay } from '@/components/domain/money-display';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lease {
  id: string;
  contractNumber: string;
  lesseeName: string;
  assetDescription: string;
  startDate: string;
  endDate: string;
  monthlyPaymentSatang: number;
  rouAssetSatang: number;
  status: string;
}

interface LeaseListResponse {
  items: Lease[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Expired', value: 'expired' },
  { label: 'Terminated', value: 'terminated' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LeasesPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Lease | null>(null);
  const [deleting, setDeleting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<LeaseListResponse>('/leases', params);
  const leases = data?.items ?? [];

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/leases/${deleteTarget.id}`);
      showToast.success(`Lease "${deleteTarget.contractNumber}" deleted`);
      setDeleteTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to delete lease');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Lease Contracts</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">IFRS 16 lease management — ROU assets &amp; liabilities</p>
        </div>
        <Link href="/leases/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Lease</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search leases..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : leases.length === 0 ? (
        <EmptyState context="search-results" message="No lease contracts found" ctaLabel="Create Lease" onCtaClick={() => router.push('/leases/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Contract #</th>
                <th className="px-4 py-3">Lessee</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3 text-right">Monthly Payment</th>
                <th className="px-4 py-3 text-right">ROU Asset</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{l.contractNumber}</td>
                  <td className="px-4 py-3">{l.lesseeName}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{l.assetDescription}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(l.startDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(l.endDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amount={BigInt(l.monthlyPaymentSatang)} /></td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amount={BigInt(l.rouAssetSatang)} /></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${l.status === 'active' ? 'bg-green-100 text-green-800' : l.status === 'expired' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-800'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/leases/${l.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(l)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} title="Delete Lease" description={`Are you sure you want to delete lease "${deleteTarget?.contractNumber ?? ''}"?`} confirmLabel="Delete" confirmVariant="destructive" onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
