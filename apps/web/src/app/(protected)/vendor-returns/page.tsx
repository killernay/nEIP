'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { DocumentStatus } from '@/components/domain/document-status';
import type { DocumentStatusValue } from '@/components/domain/document-status';
import { MoneyDisplay } from '@/components/domain/money-display';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface VendorReturn {
  id: string;
  returnNumber: string;
  vendorName: string;
  billNumber: string;
  totalSatang: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface VendorReturnListResponse { items: VendorReturn[]; total: number; }

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Completed', value: 'completed' },
];

export default function VendorReturnsPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, isLoading } = useQuery<VendorReturnListResponse>({
    queryKey: [tenantId, 'vendor-returns', params],
    queryFn: () => api.get<VendorReturnListResponse>('/vendor-returns', params),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vendor Returns</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage returns to vendors</p>
        </div>
        <Link href="/vendor-returns/new">
          <Button variant="primary"><Plus className="h-4 w-4" />New Return</Button>
        </Link>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search returns..."
        statusOptions={STATUS_OPTIONS}
        statusValue={status}
        onStatusChange={setStatus}
        resultCount={data?.total}
      />

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No vendor returns found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Return #</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Vendor</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Bill #</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Reason</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ret) => (
                <tr key={ret.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-mono text-xs">{ret.returnNumber}</td>
                  <td className="px-4 py-3">{ret.vendorName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">{ret.billNumber}</td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={BigInt(ret.totalSatang || 0)} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{ret.reason}</td>
                  <td className="px-4 py-3 text-center">
                    <DocumentStatus status={ret.status as DocumentStatusValue} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/vendor-returns/${ret.id}`}>
                      <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" />View</Button>
                    </Link>
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
