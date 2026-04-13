'use client';

import { useCallback, useMemo, useState } from 'react';
import { Eye, Plus, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import { MoneyDisplay } from '@/components/domain/money-display';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceEntry {
  id: string;
  entryNumber: string;
  vendorName: string;
  purchaseOrderNumber: string;
  description: string;
  totalSatang: number;
  entryDate: string;
  status: string;
}

interface ServiceResponse {
  items: ServiceEntry[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ServicesPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<ServiceResponse>('/services/entry-sheets', params);
  const entries = data?.items ?? [];

  const handleApprove = useCallback(async (id: string) => {
    try {
      await api.post(`/services/entry-sheets/${id}/approve`);
      showToast.success('Service entry approved');
      refetch();
    } catch {
      showToast.error('Failed to approve');
    }
  }, [refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Service Entry Sheets</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Record and approve service deliveries</p>
        </div>
        <Link href="/services/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Entry</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search service entries..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : entries.length === 0 ? (
        <EmptyState context="search-results" message="No service entries found" ctaLabel="Create Entry" onCtaClick={() => router.push('/services/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Entry #</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">PO #</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{e.entryNumber}</td>
                  <td className="px-4 py-3">{e.vendorName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">{e.purchaseOrderNumber}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)] max-w-[200px] truncate">{e.description}</td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amount={BigInt(e.totalSatang)} /></td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(e.entryDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${e.status === 'approved' ? 'bg-green-100 text-green-800' : e.status === 'submitted' ? 'bg-blue-100 text-blue-800' : e.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/services/${e.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button></Link>
                      {e.status === 'submitted' && (
                        <Button variant="ghost" size="sm" onClick={() => handleApprove(e.id)}>
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
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
