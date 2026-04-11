'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilterBar } from '@/components/ui/filter-bar';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface BatchRecord {
  id: string;
  batchNumber: string;
  serialNumber: string | null;
  productCode: string;
  productName: string;
  quantity: number;
  manufacturedDate: string | null;
  expiryDate: string | null;
  warehouseName: string;
  status: string;
}

interface BatchListResponse { items: BatchRecord[]; total: number; }

const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  reserved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  consumed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const trackingOptions = [
  { label: 'All', value: '' },
  { label: 'Batch', value: 'batch' },
  { label: 'Serial', value: 'serial' },
];

export default function BatchesPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [search, setSearch] = useState('');
  const [trackingType, setTrackingType] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (trackingType) p['type'] = trackingType;
    return p;
  }, [search, trackingType]);

  const { data, isLoading } = useQuery<BatchListResponse>({
    queryKey: [tenantId, 'batches', params],
    queryFn: () => api.get<BatchListResponse>('/inventory/batches', params),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Batch & Serial Tracking</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Track inventory by batch and serial numbers</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={trackingType}
          onChange={(e) => setTrackingType(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {trackingOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by batch/serial number or product..."
        resultCount={data?.total}
      />

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No batch or serial records found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Batch #</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Serial #</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Product</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Qty</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Warehouse</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Expiry</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((batch) => (
                <tr key={batch.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-mono text-xs">{batch.batchNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs">{batch.serialNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{batch.productName}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">{batch.productCode}</div>
                  </td>
                  <td className="px-4 py-3 text-center">{batch.quantity}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{batch.warehouseName}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                    {batch.expiryDate ? (
                      <span className={new Date(batch.expiryDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                        {new Date(batch.expiryDate).toLocaleDateString('th-TH')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[batch.status] ?? ''}`}>
                      {batch.status}
                    </span>
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
