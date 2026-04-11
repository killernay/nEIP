'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, CheckCircle, Eye } from 'lucide-react';
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

interface PurchaseRequisition {
  id: string;
  prNumber: string;
  requestedBy: string;
  description: string;
  totalSatang: number;
  status: string;
  createdAt: string;
}

interface PRListResponse { items: PurchaseRequisition[]; total: number; }

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export default function PurchaseRequisitionsPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, isLoading } = useQuery<PRListResponse>({
    queryKey: [tenantId, 'purchase-requisitions', params],
    queryFn: () => api.get<PRListResponse>('/purchase-requisitions', params),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Requisitions</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Create and manage purchase requests</p>
        </div>
        <Link href="/purchase-requisitions/new">
          <Button variant="primary"><Plus className="h-4 w-4" />New PR</Button>
        </Link>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search requisitions..."
        statusOptions={STATUS_OPTIONS}
        statusValue={status}
        onStatusChange={setStatus}
        resultCount={data?.total}
      />

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No purchase requisitions found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">PR Number</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Requested By</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Description</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Amount</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pr) => (
                <tr key={pr.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-mono text-xs">{pr.prNumber}</td>
                  <td className="px-4 py-3">{pr.requestedBy}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{pr.description}</td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={BigInt(pr.totalSatang || 0)} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DocumentStatus status={pr.status as DocumentStatusValue} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/purchase-requisitions/${pr.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" />View</Button>
                      </Link>
                      {pr.status === 'pending' && (
                        <Button variant="ghost" size="sm"><CheckCircle className="h-3.5 w-3.5" />Approve</Button>
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
