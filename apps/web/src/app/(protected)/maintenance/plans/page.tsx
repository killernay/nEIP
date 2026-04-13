'use client';

import { useMemo, useState } from 'react';
import { Eye, Plus, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useApi } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MaintenancePlan {
  id: string;
  planNumber: string;
  name: string;
  equipmentName: string;
  frequency: string;
  nextDueDate: string;
  lastCompletedDate: string | null;
  isActive: boolean;
}

interface PlanResponse {
  items: MaintenancePlan[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MaintenancePlansPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading } = useApi<PlanResponse>('/maintenance/plans', params);
  const plans = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Maintenance Plans</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Preventive maintenance schedules</p>
        </div>
        <Link href="/maintenance/plans/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Plan</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search plans..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : plans.length === 0 ? (
        <EmptyState context="search-results" message="No maintenance plans found" ctaLabel="Create Plan" onCtaClick={() => router.push('/maintenance/plans/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Plan #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">Next Due</th>
                <th className="px-4 py-3">Last Completed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{p.planNumber}</td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{p.equipmentName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs"><Calendar className="h-3 w-3" />{p.frequency}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(p.nextDueDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{p.lastCompletedDate ? new Date(p.lastCompletedDate).toLocaleDateString('th-TH') : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/maintenance/plans/${p.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
