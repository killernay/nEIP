'use client';

import { useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useApi } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/components/domain/money-display';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TravelRequest {
  id: string;
  requestNumber: string;
  employeeName: string;
  destination: string;
  purpose: string;
  departureDate: string;
  returnDate: string;
  estimatedCostSatang: number;
  actualCostSatang: number | null;
  status: string;
}

interface TravelResponse {
  items: TravelRequest[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Approved', value: 'approved' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Claimed', value: 'claimed' },
  { label: 'Settled', value: 'settled' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TravelPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading } = useApi<TravelResponse>('/travel/requests', params);
  const requests = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Travel & Expenses</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Travel requests and expense claims</p>
        </div>
        <Link href="/travel/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Request</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search travel requests..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : requests.length === 0 ? (
        <EmptyState context="search-results" message="No travel requests found" ctaLabel="Create Request" onCtaClick={() => router.push('/travel/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Request #</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3 text-right">Estimated</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{r.requestNumber}</td>
                  <td className="px-4 py-3">{r.employeeName}</td>
                  <td className="px-4 py-3">{r.destination}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)] max-w-[150px] truncate">{r.purpose}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                    {new Date(r.departureDate).toLocaleDateString('th-TH')} — {new Date(r.returnDate).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amountSatang={r.estimatedCostSatang} /></td>
                  <td className="px-4 py-3 text-right">{r.actualCostSatang !== null ? <MoneyDisplay amountSatang={r.actualCostSatang} /> : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${r.status === 'settled' ? 'bg-green-100 text-green-800' : r.status === 'approved' || r.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : r.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/travel/${r.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
