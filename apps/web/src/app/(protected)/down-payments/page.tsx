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

interface DownPayment {
  id: string;
  requestNumber: string;
  partnerName: string;
  type: 'AR' | 'AP';
  amountSatang: number;
  appliedSatang: number;
  status: string;
  createdAt: string;
}

interface DownPaymentResponse {
  items: DownPayment[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'Partially Applied', value: 'partial' },
  { label: 'Fully Applied', value: 'applied' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DownPaymentsPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState<'AR' | 'AP'>('AR');

  const params = useMemo(() => {
    const p: Record<string, string> = { type: tab };
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status, tab]);

  const { data, loading } = useApi<DownPaymentResponse>('/down-payments', params);
  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Down Payments</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage advance payments for AR and AP</p>
        </div>
        <Link href="/down-payments/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Request</Button>
        </Link>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-[var(--color-accent)]/30 p-1">
        {(['AR', 'AP'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'}`}>
            {t === 'AR' ? 'Accounts Receivable' : 'Accounts Payable'}
          </button>
        ))}
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search down payments..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message={`No ${tab} down payments found`} ctaLabel="Create Request" onCtaClick={() => router.push('/down-payments/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Request #</th>
                <th className="px-4 py-3">{tab === 'AR' ? 'Customer' : 'Vendor'}</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Applied</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((dp) => (
                <tr key={dp.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{dp.requestNumber}</td>
                  <td className="px-4 py-3">{dp.partnerName}</td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amountSatang={dp.amountSatang} /></td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amountSatang={dp.appliedSatang} /></td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(dp.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${dp.status === 'open' ? 'bg-yellow-100 text-yellow-800' : dp.status === 'partial' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {dp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/down-payments/${dp.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
