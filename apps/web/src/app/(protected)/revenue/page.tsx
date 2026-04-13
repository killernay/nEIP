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

interface RevenueContract {
  id: string;
  contractNumber: string;
  customerName: string;
  totalPriceSatang: number;
  recognizedSatang: number;
  obligationCount: number;
  startDate: string;
  status: string;
}

interface RevenueContractResponse {
  items: RevenueContract[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RevenuePage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading } = useApi<RevenueContractResponse>('/revenue/contracts', params);
  const contracts = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Revenue Contracts</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">IFRS 15 revenue recognition &amp; performance obligations</p>
        </div>
        <Link href="/revenue/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Contract</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search contracts..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : contracts.length === 0 ? (
        <EmptyState context="search-results" message="No revenue contracts found" ctaLabel="Create Contract" onCtaClick={() => router.push('/revenue/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Contract #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Total Price</th>
                <th className="px-4 py-3 text-right">Recognized</th>
                <th className="px-4 py-3 text-right">Obligations</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{c.contractNumber}</td>
                  <td className="px-4 py-3">{c.customerName}</td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amount={BigInt(c.totalPriceSatang)} /></td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amount={BigInt(c.recognizedSatang)} /></td>
                  <td className="px-4 py-3 text-right font-mono">{c.obligationCount}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(c.startDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${c.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : c.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/revenue/${c.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
