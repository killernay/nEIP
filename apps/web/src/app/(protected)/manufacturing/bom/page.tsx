'use client';

import { useCallback, useMemo, useState } from 'react';
import { Eye, Plus, Trash2, Copy } from 'lucide-react';
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

interface BOM {
  id: string;
  bomNumber: string;
  productName: string;
  productCode: string;
  version: number;
  componentCount: number;
  status: string;
  updatedAt: string;
}

interface BOMResponse {
  items: BOM[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Obsolete', value: 'obsolete' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BOMPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BOM | null>(null);
  const [deleting, setDeleting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<BOMResponse>('/manufacturing/boms', params);
  const boms = data?.items ?? [];

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/manufacturing/boms/${deleteTarget.id}`);
      showToast.success(`BOM "${deleteTarget.bomNumber}" deleted`);
      setDeleteTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to delete BOM');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Bill of Materials</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage product structures and component lists</p>
        </div>
        <Link href="/manufacturing/bom/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New BOM</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search BOMs..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : boms.length === 0 ? (
        <EmptyState context="search-results" message="No BOMs found" ctaLabel="Create BOM" onCtaClick={() => router.push('/manufacturing/bom/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">BOM #</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3 text-right">Version</th>
                <th className="px-4 py-3 text-right">Components</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {boms.map((b) => (
                <tr key={b.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{b.bomNumber}</td>
                  <td className="px-4 py-3">{b.productName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">{b.productCode}</td>
                  <td className="px-4 py-3 text-right font-mono">v{b.version}</td>
                  <td className="px-4 py-3 text-right font-mono">{b.componentCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${b.status === 'active' ? 'bg-green-100 text-green-800' : b.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(b.updatedAt).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/manufacturing/bom/${b.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button></Link>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} title="Delete BOM" description={`Delete BOM "${deleteTarget?.bomNumber ?? ''}" for ${deleteTarget?.productName ?? ''}?`} confirmLabel="Delete" confirmVariant="destructive" onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
