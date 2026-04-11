'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { DocumentStatus } from '@/components/domain/document-status';
import type { DocumentStatusValue } from '@/components/domain/document-status';
import { showToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface StockCount {
  id: string;
  countNumber: string;
  warehouseId: string;
  warehouseName: string;
  countDate: string;
  itemCount: number;
  varianceCount: number;
  status: string;
}

interface StockCountListResponse { items: StockCount[]; total: number; }

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Posted', value: 'posted' },
];

export default function StockCountsPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, isLoading, refetch } = useQuery<StockCountListResponse>({
    queryKey: [tenantId, 'stock-counts', params],
    queryFn: () => api.get<StockCountListResponse>('/stock-counts', params),
  });

  const handlePost = useCallback(async (id: string, countNumber: string) => {
    try {
      await api.post(`/stock-counts/${id}/post`);
      showToast.success(`Stock count ${countNumber} posted`);
      refetch();
    } catch {
      showToast.error('Failed to post stock count');
    }
  }, [refetch]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock Counts</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Physical inventory counts and variance tracking</p>
        </div>
        <Link href="/stock-counts/new">
          <Button variant="primary"><Plus className="h-4 w-4" />New Count</Button>
        </Link>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search stock counts..."
        statusOptions={STATUS_OPTIONS}
        statusValue={status}
        onStatusChange={setStatus}
        resultCount={data?.total}
      />

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No stock counts found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Count #</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Warehouse</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Date</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Items</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Variances</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((sc) => (
                <tr key={sc.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-mono text-xs">{sc.countNumber}</td>
                  <td className="px-4 py-3">{sc.warehouseName}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                    {new Date(sc.countDate).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-3 text-center">{sc.itemCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={sc.varianceCount > 0 ? 'text-amber-600 font-medium' : ''}>
                      {sc.varianceCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DocumentStatus status={sc.status as DocumentStatusValue} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/stock-counts/${sc.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" />View</Button>
                      </Link>
                      {sc.status === 'completed' && (
                        <Button variant="ghost" size="sm" onClick={() => handlePost(sc.id, sc.countNumber)}>
                          <CheckCircle className="h-3.5 w-3.5" />Post
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
