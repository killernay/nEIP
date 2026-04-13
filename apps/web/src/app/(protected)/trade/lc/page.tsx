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

interface LetterOfCredit {
  id: string;
  lcNumber: string;
  type: 'import' | 'export';
  issuingBank: string;
  beneficiary: string;
  amountSatang: number;
  currency: string;
  issueDate: string;
  expiryDate: string;
  status: string;
}

interface LCResponse {
  items: LetterOfCredit[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Issued', value: 'issued' },
  { label: 'Amended', value: 'amended' },
  { label: 'Utilized', value: 'utilized' },
  { label: 'Expired', value: 'expired' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LettersOfCreditPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading } = useApi<LCResponse>('/trade/letters-of-credit', params);
  const lcs = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Letters of Credit</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage import/export L/C instruments</p>
        </div>
        <Link href="/trade/lc/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New L/C</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search L/Cs..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : lcs.length === 0 ? (
        <EmptyState context="search-results" message="No letters of credit found" ctaLabel="Create L/C" onCtaClick={() => router.push('/trade/lc/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">L/C #</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Issuing Bank</th>
                <th className="px-4 py-3">Beneficiary</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lcs.map((lc) => (
                <tr key={lc.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{lc.lcNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${lc.type === 'import' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {lc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{lc.issuingBank}</td>
                  <td className="px-4 py-3">{lc.beneficiary}</td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amountSatang={lc.amountSatang} />
                    <span className="ml-1 text-xs text-[var(--color-muted-foreground)]">{lc.currency}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(lc.issueDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(lc.expiryDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${lc.status === 'issued' ? 'bg-green-100 text-green-800' : lc.status === 'utilized' ? 'bg-blue-100 text-blue-800' : lc.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                      {lc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/trade/lc/${lc.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
