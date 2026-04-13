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

interface Declaration {
  id: string;
  declarationNumber: string;
  type: 'import' | 'export';
  partnerName: string;
  country: string;
  totalValueSatang: number;
  dutyAmountSatang: number;
  declarationDate: string;
  status: string;
}

interface DeclarationResponse {
  items: Declaration[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Cleared', value: 'cleared' },
  { label: 'Held', value: 'held' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DeclarationsPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading } = useApi<DeclarationResponse>('/trade/declarations', params);
  const declarations = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Import/Export Declarations</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Customs declarations and duty management</p>
        </div>
        <Link href="/trade/declarations/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Declaration</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search declarations..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : declarations.length === 0 ? (
        <EmptyState context="search-results" message="No declarations found" ctaLabel="Create Declaration" onCtaClick={() => router.push('/trade/declarations/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Declaration #</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Duty</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {declarations.map((d) => (
                <tr key={d.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{d.declarationNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${d.type === 'import' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {d.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{d.partnerName}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{d.country}</td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amountSatang={d.totalValueSatang} /></td>
                  <td className="px-4 py-3 text-right"><MoneyDisplay amountSatang={d.dutyAmountSatang} /></td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(d.declarationDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${d.status === 'cleared' ? 'bg-green-100 text-green-800' : d.status === 'held' ? 'bg-red-100 text-red-800' : d.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/trade/declarations/${d.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
