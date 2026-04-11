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
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  vendorCount: number;
  responseCount: number;
  deadline: string;
  status: string;
  createdAt: string;
}

interface RFQListResponse { items: RFQ[]; total: number; }

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
  { label: 'Awarded', value: 'awarded' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function RFQsPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, isLoading } = useQuery<RFQListResponse>({
    queryKey: [tenantId, 'rfqs', params],
    queryFn: () => api.get<RFQListResponse>('/rfqs', params),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Requests for Quotation</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage RFQs and vendor responses</p>
        </div>
        <Link href="/rfqs/new">
          <Button variant="primary"><Plus className="h-4 w-4" />New RFQ</Button>
        </Link>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search RFQs..."
        statusOptions={STATUS_OPTIONS}
        statusValue={status}
        onStatusChange={setStatus}
        resultCount={data?.total}
      />

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No RFQs found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">RFQ Number</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Title</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Vendors</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Responses</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Deadline</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((rfq) => (
                <tr key={rfq.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-mono text-xs">{rfq.rfqNumber}</td>
                  <td className="px-4 py-3">{rfq.title}</td>
                  <td className="px-4 py-3 text-center">{rfq.vendorCount}</td>
                  <td className="px-4 py-3 text-center">{rfq.responseCount}/{rfq.vendorCount}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                    {new Date(rfq.deadline).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DocumentStatus status={rfq.status as DocumentStatusValue} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/rfqs/${rfq.id}`}>
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
