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

interface PriceList {
  id: string;
  name: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  itemCount: number;
  isActive: boolean;
}

interface PriceListResponse {
  items: PriceList[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PricingPage(): React.JSX.Element {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<PriceList | null>(null);
  const [deleting, setDeleting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<PriceListResponse>('/pricing/price-lists', params);
  const priceLists = data?.items ?? [];

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/pricing/price-lists/${deleteTarget.id}`);
      showToast.success(`Price list "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to delete price list');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Price Lists</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage product and service pricing
          </p>
        </div>
        <Link href="/pricing/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            New Price List
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search price lists..."
        statusOptions={STATUS_OPTIONS}
        statusValue={status}
        onStatusChange={setStatus}
        resultCount={data?.total}
      />

      {/* Table */}
      {loading ? (
        <SkeletonRow count={5} />
      ) : priceLists.length === 0 ? (
        <EmptyState
          context="search-results"
          message="No price lists found"
          ctaLabel="Create Price List"
          onCtaClick={() => router.push('/pricing/new')}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Effective From</th>
                <th className="px-4 py-3">Effective To</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {priceLists.map((pl) => (
                <tr key={pl.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium">{pl.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{pl.currency}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                    {new Date(pl.effectiveFrom).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                    {pl.effectiveTo ? new Date(pl.effectiveTo).toLocaleDateString('th-TH') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-figures">{pl.itemCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${pl.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {pl.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/pricing/${pl.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(pl)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Price List"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
